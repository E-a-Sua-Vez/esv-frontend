import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getFirestore,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import internalMessageService from '../application/services/internal-message';
import { globalStore } from '../stores/index';

/**
 * Composable para gestionar el inbox de mensajes internos
 */
export function useMessageInbox() {
  const store = globalStore();

  // Estado
  const messages = ref([]);
  const inboxMessages = ref([]);
  const sentMessages = ref([]);
  const chatUnreadCount = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const unsubscribes = ref([]);

  // Filtros
  const filters = ref({
    type: null,
    category: null,
    priority: null,
    status: null,
    unreadOnly: false,
    conversationId: null,
  });

  // Computed
  const unreadCount = computed(() => messages.value.filter(m => !m.read).length);

  const unreadByPriority = computed(() => {
    const byPriority = {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    };

    messages.value
      .filter(m => !m.read)
      .forEach(m => {
        if (byPriority[m.priority] !== undefined) {
          byPriority[m.priority]++;
        }
      });

    return byPriority;
  });

  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => {
      // Primero por no leído
      if (a.read !== b.read) return a.read ? 1 : -1;

      // Luego por prioridad
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Finalmente por fecha (más reciente primero)
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
  );

  const filteredMessages = computed(() => {
    // Excluir archivados por defecto
    let result = sortedMessages.value.filter(m => !isArchived(m));

    if (filters.value.type) {
      result = result.filter(m => m.type === filters.value.type);
    }

    if (filters.value.category) {
      result = result.filter(m => m.category === filters.value.category);
    }

    if (filters.value.priority) {
      result = result.filter(m => m.priority === filters.value.priority);
    }

    if (filters.value.status) {
      result = result.filter(m => m.status === filters.value.status);
    }

    if (filters.value.unreadOnly) {
      result = result.filter(m => !m.read);
    }

    if (filters.value.conversationId) {
      result = result.filter(m => m.conversationId === filters.value.conversationId);
    }

    return result;
  });

  // Métodos
  async function loadMessages() {
    const currentUser = store.getCurrentUser;
    if (!currentUser?.id) {
      error.value = 'Usuario no autenticado';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await internalMessageService.getInbox({
        ...filters.value,
        limit: 100,
      });

      messages.value = (response.data.messages || []).filter(m => !isArchived(m));
    } catch (err) {
      error.value = err.message || 'Error al cargar mensajes';
    } finally {
      loading.value = false;
    }
  }

  function startRealtimeUpdates() {
    const currentUser = store.getCurrentUser;
    if (!currentUser?.id) return;

    function mergeMessages() {
      const map = new Map();
      [...inboxMessages.value, ...sentMessages.value]
        .filter(m => !isArchived(m))
        .forEach(m => {
          map.set(m.id, m);
        });
      messages.value = Array.from(map.values());
    }

    function setupRecipientListener(db, recipientId) {
      // Referencia a la colección de mensajes del usuario
      const messagesRef = collection(db, 'internal-message');
      const q = query(
        messagesRef,
        where('recipientId', '==', recipientId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(100),
      );

      // Suscribirse a cambios en tiempo real
      const unsub = onSnapshot(
        q,
        snapshot => {
          const updated = [];
          let chatUnreads = 0;
          const chatDebug = [];

          snapshot.forEach(doc => {
            const data = doc.data();

            // Saltar archivados
            if (isArchived(data)) return;

            // Para la bandeja, omitimos mensajes de chat asociados a conversación,
            // pero sí contamos sus no leídos para la campana
            if (data.type === 'chat' && data.conversationId) {
              if (!data.read) chatUnreads++;
              chatDebug.push({
                id: doc.id,
                conversationId: data.conversationId,
                read: Boolean(data.read),
                status: data.status,
                recipientId: data.recipientId,
                senderId: data.senderId,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
              });
              return;
            }

            updated.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            });
          });

          inboxMessages.value = updated;
          chatUnreadCount.value = chatUnreads;
          try {
            if (import.meta.env && import.meta.env.DEV) {
              console.groupCollapsed('[Inbox] Chat snapshot (recipient)');
              console.log('recipientId listener:', recipientId);
              console.log('chatUnreadCount:', chatUnreadCount.value);
              console.table(chatDebug.map(m => ({
                id: m.id,
                conversationId: m.conversationId,
                read: m.read,
                status: m.status,
                createdAt: m.createdAt,
              })));
              console.groupEnd();
            }
          } catch (_) {}
          mergeMessages();
        },
        _err => {
          // No bloquear la UI por errores de snapshot; continuar en silencio
          console.warn('[Inbox] Realtime recipient listener error:', _err?.message || _err);
        },
      );

      unsubscribes.value.push(unsub);
    }

    function setupSenderListener(db, senderId) {
      const messagesRef = collection(db, 'internal-message');

      let sentById = [];
      let sentByObj = [];

      function applyMerge() {
        const map = new Map();
        [...sentById, ...sentByObj].filter(m => !isArchived(m)).forEach(m => map.set(m.id, m));
        sentMessages.value = Array.from(map.values());
        mergeMessages();
      }

      const q1 = query(
        messagesRef,
        where('senderId', '==', senderId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(100),
      );

      const unsub1 = onSnapshot(
        q1,
        snapshot => {
          const updated = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (isArchived(data)) return;
            if (data.type === 'chat' && data.conversationId) return;
            updated.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            });
          });
          sentById = updated;
          applyMerge();
        },
        _err => {}
      );

      // Listener adicional por si senderId es un objeto con { id }
      const q2 = query(
        messagesRef,
        where('senderId.id', '==', senderId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(100),
      );

      const unsub2 = onSnapshot(
        q2,
        snapshot => {
          const updated = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (isArchived(data)) return;
            if (data.type === 'chat' && data.conversationId) return;
            updated.push({
              id: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            });
          });
          sentByObj = updated;
          applyMerge();
        },
        _err => {}
      );

      unsubscribes.value.push(unsub1);
      unsubscribes.value.push(unsub2);
    }

    try {
      const apps = getApps();
      const app =
        apps.length > 0
          ? getApp()
          : initializeApp({
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
              appId: import.meta.env.VITE_FIREBASE_APP_ID,
            });

      const db = getFirestore(app);

      // Primero obtener el recipientId del usuario actual
      const collaboratorRef = collection(db, 'collaborator');
      const collaboratorQuery = query(
        collaboratorRef,
        where('userId', '==', currentUser.id),
        firestoreLimit(1)
      );

      getDocs(collaboratorQuery)
        .then(collaboratorSnap => {
          let recipientId = currentUser.id; // Fallback

          if (!collaboratorSnap.empty) {
            const collaboratorDoc = collaboratorSnap.docs[0];
            recipientId = collaboratorDoc.id;
            setupRecipientListener(db, recipientId);
          } else {
            // Si no es colaborador, buscar en administrator o business
            const administratorRef = collection(db, 'administrator');
            const administratorQuery = query(
              administratorRef,
              where('userId', '==', currentUser.id),
              firestoreLimit(1)
            );

            getDocs(administratorQuery)
              .then(administratorSnap => {
                if (!administratorSnap.empty) {
                  const administratorDoc = administratorSnap.docs[0];
                  recipientId = administratorDoc.id;
                  setupRecipientListener(db, recipientId);
                } else {
                  // Si no está en administrator, buscar en business
                  const businessRef = collection(db, 'business');
                  const businessQuery = query(
                    businessRef,
                    where('userId', '==', currentUser.id),
                    firestoreLimit(1)
                  );

                  getDocs(businessQuery)
                    .then(businessSnap => {
                      if (!businessSnap.empty) {
                        const businessDoc = businessSnap.docs[0];
                        recipientId = businessDoc.id;
                        setupRecipientListener(db, recipientId);
                      } else {
                        // Último intento: buscar directamente por el ID del documento actual
                        const userDocId = currentUser.id;
                        if (userDocId && userDocId !== 'undefined') {
                          // Intentar colaborador por ID directo
                          const collabDocRef = doc(db, 'collaborator', userDocId);
                          getDoc(collabDocRef)
                            .then(collabDoc => {
                              if (collabDoc.exists()) {
                                recipientId = collabDoc.id;
                                setupRecipientListener(db, recipientId);
                              } else {
                                // Intentar business
                                const businessDocRef = doc(db, 'business', userDocId);
                                getDoc(businessDocRef).then(bizDoc => {
                                  if (bizDoc.exists()) {
                                    recipientId = bizDoc.id;
                                    setupRecipientListener(db, recipientId);
                                  } else {
                                    // Intentar administrator
                                    const adminDocRef = doc(db, 'administrator', userDocId);
                                    getDoc(adminDocRef).then(adminDoc => {
                                      if (adminDoc.exists()) {
                                        recipientId = adminDoc.id;
                                      } else {
                                        recipientId = userDocId;
                                      }
                                      setupRecipientListener(db, recipientId);
                                    });
                                  }
                                });
                              }
                            })
                            .catch(err => {
                              setupRecipientListener(db, recipientId);
                            });
                        } else {
                          setupRecipientListener(db, recipientId);
                        }
                      }
                    })
                    .catch(err => {
                      setupRecipientListener(db, recipientId);
                    });
                }
              })
              .catch(err => {
                setupRecipientListener(db, currentUser.id);
              });
          }
        })
        .catch(err => {
          setupRecipientListener(db, currentUser.id);
        });

      // Si es MASTER, escuchar también mensajes enviados por el propio usuario
      if (currentUser?.master) {
        setupSenderListener(db, currentUser.id);
        // Fallback: intento único de obtener enviados si el listener no pobló todavía
        (async () => {
          try {
            const messagesRef = collection(db, 'internal-message');
            const qSent = query(
              messagesRef,
              where('senderId', '==', currentUser.id),
              orderBy('createdAt', 'desc'),
              firestoreLimit(50),
            );
            const snap = await getDocs(qSent);
            const updated = [];
            snap.forEach(docSnap => {
              const data = docSnap.data();
              if (isArchived(data)) return;
              if (data.type === 'chat' && data.conversationId) return;
              updated.push({
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
              });
            });
            if (updated.length > 0) {
              sentMessages.value = updated;
              // merge
              const map = new Map();
              [...inboxMessages.value, ...sentMessages.value]
                .filter(m => !isArchived(m))
                .forEach(m => map.set(m.id, m));
              messages.value = Array.from(map.values());
            }
          } catch (e) {
            // Silencio si falla
          }
        })();
      }
    } catch (err) {
      // Error handled silently
    }
  }

  function stopRealtimeUpdates() {
    if (unsubscribes.value && unsubscribes.value.length) {
      unsubscribes.value.forEach(unsub => {
        try {
          unsub();
          // eslint-disable-next-line no-empty
        } catch (_) {}
      });
      unsubscribes.value = [];
    }
  }

  async function markAsRead(messageId) {
    await internalMessageService.markAsRead(messageId);

    // Actualizar localmente
    const message = messages.value.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      message.readAt = new Date();
      message.status = 'read';
    }
  }

  async function bulkMarkAsRead(messageIds) {
    await internalMessageService.bulkMarkAsRead(messageIds);

    // Actualizar localmente
    messageIds.forEach(id => {
      const message = messages.value.find(m => m.id === id);
      if (message) {
        message.read = true;
        message.readAt = new Date();
        message.status = 'read';
      }
    });
  }

  async function archiveMessage(messageId) {
    await internalMessageService.archiveMessage(messageId);

    // Remover localmente
    messages.value = messages.value.filter(m => m.id !== messageId);
    inboxMessages.value = inboxMessages.value.filter(m => m.id !== messageId);
    sentMessages.value = sentMessages.value.filter(m => m.id !== messageId);
  }

  function markAllAsRead() {
    const unreadIds = messages.value.filter(m => !m.read).map(m => m.id);

    if (unreadIds.length > 0) {
      return bulkMarkAsRead(unreadIds);
    }
  }

  async function bulkArchive(messageIds) {
    await internalMessageService.bulkArchive(messageIds);

    // Remover localmente
    messages.value = messages.value.filter(m => !messageIds.includes(m.id));
    inboxMessages.value = inboxMessages.value.filter(m => !messageIds.includes(m.id));
    sentMessages.value = sentMessages.value.filter(m => !messageIds.includes(m.id));
  }

  function archiveAll() {
    const messageIds = messages.value.map(m => m.id);

    if (messageIds.length > 0) {
      return bulkArchive(messageIds);
    }
  }

  // Marcar todos los chats como leídos (solo recibidos)
  async function markAllChatAsRead() {
    try {
      const currentUser = store.getCurrentUser;
      if (!currentUser?.id) return;

      // Inicializar Firestore (igual que en startRealtimeUpdates)
      const apps = getApps();
      const app =
        apps.length > 0
          ? getApp()
          : initializeApp({
              apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
              authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
              projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
              storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
              appId: import.meta.env.VITE_FIREBASE_APP_ID,
            });

      const db = getFirestore(app);

      // Resolver recipientId del usuario actual (colaborador/administrador/business)
      let recipientId = currentUser.id;
      try {
        const collaboratorRef = collection(db, 'collaborator');
        const collaboratorQuery = query(
          collaboratorRef,
          where('userId', '==', currentUser.id),
          firestoreLimit(1)
        );
        const collaboratorSnap = await getDocs(collaboratorQuery);
        if (!collaboratorSnap.empty) {
          recipientId = collaboratorSnap.docs[0].id;
        } else {
          const administratorRef = collection(db, 'administrator');
          const administratorQuery = query(
            administratorRef,
            where('userId', '==', currentUser.id),
            firestoreLimit(1)
          );
          const administratorSnap = await getDocs(administratorQuery);
          if (!administratorSnap.empty) {
            recipientId = administratorSnap.docs[0].id;
          } else {
            const businessRef = collection(db, 'business');
            const businessQuery = query(
              businessRef,
              where('userId', '==', currentUser.id),
              firestoreLimit(1)
            );
            const businessSnap = await getDocs(businessQuery);
            if (!businessSnap.empty) {
              recipientId = businessSnap.docs[0].id;
            } else if (currentUser.id && currentUser.id !== 'undefined') {
              // Último intento: probar IDs directos en colecciones conocidas
              const collabDoc = await getDoc(doc(db, 'collaborator', currentUser.id));
              if (collabDoc.exists()) {
                recipientId = collabDoc.id;
              } else {
                const bizDoc = await getDoc(doc(db, 'business', currentUser.id));
                if (bizDoc.exists()) {
                  recipientId = bizDoc.id;
                } else {
                  const adminDoc = await getDoc(doc(db, 'administrator', currentUser.id));
                  if (adminDoc.exists()) {
                    recipientId = adminDoc.id;
                  }
                }
              }
            }
          }
        }
      } catch (_) {
        // Fallback a currentUser.id si falla la resolución
        recipientId = currentUser.id;
      }

      // Consultar mensajes de chat no leídos del recipient
      const messagesRef = collection(db, 'internal-message');
      const q = query(
        messagesRef,
        where('recipientId', '==', recipientId),
        where('type', '==', 'chat'),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        firestoreLimit(200)
      );

      const snap = await getDocs(q);
      const idsToMark = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (isArchived(data)) return;
        // Solo chats (ya filtrado) y no leídos
        idsToMark.push(docSnap.id);
      });

      // Actualizar UI al instante
      chatUnreadCount.value = 0;

      if (idsToMark.length > 0) {
        try {
          await internalMessageService.bulkMarkAsRead(idsToMark);
        } catch (_) {
          // Silenciar errores; los listeners corregirán estado
        }
      }
    } catch (_) {
      // Silenciar errores generales para no romper la UI
    }
  }

  function setFilter(key, value) {
    filters.value[key] = value;
  }

  function clearFilters() {
    filters.value = {
      type: null,
      category: null,
      priority: null,
      status: null,
      unreadOnly: false,
      conversationId: null,
    };
  }

  // Helper: determinar si un mensaje está archivado
  function isArchived(m) {
    if (!m) return false;
    const status = m.status;
    const archived = m.archived === true;
    const inactive = m.active === false;
    return archived || status === 'archived' || inactive;
  }

  // Lifecycle
  onMounted(() => {
    startRealtimeUpdates();
  });

  onUnmounted(() => {
    stopRealtimeUpdates();
  });

  return {
    // Estado
    messages,
    loading,
    error,
    filters,
    chatUnreadCount,

    // Computed
    unreadCount,
    unreadByPriority,
    sortedMessages,
    filteredMessages,
    // Exponer helper si es necesario en componentes
    // isArchived,

    // Métodos
    loadMessages,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    markAsRead,
    bulkMarkAsRead,
    archiveMessage,
    bulkArchive,
    markAllAsRead,
    markAllChatAsRead,
    archiveAll,
    setFilter,
    clearFilters,
  };
}
