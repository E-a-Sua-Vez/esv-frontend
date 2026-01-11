/* eslint-disable no-empty, no-unused-vars, comma-dangle, no-useless-catch */
import { ref, computed } from 'vue';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit as firestoreLimit,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/application/firebase';
import { requestBackend } from '@/application/api';
import internalMessageService from '@/application/services/internal-message';

const conversations = ref([]);
const activeConversationId = ref(null);
const messages = ref([]);
const loading = ref(false);
const unsubscribeConversations = ref(null);
const unsubscribeConversationsAlt = ref(null);
const unsubscribeMessages = ref(null);
const verifiedConversations = ref(new Set());
// Caché simple para info de participantes por ID
const participantCache = new Map();

// Estado global de chat (compartido entre todos los componentes que usan el composable)
const currentUser = ref(null);
const currentCommerceId = ref(null);
const myUserIds = ref([]);
const totalUnreadChats = computed(() => {
  try {
    const ids =
      myUserIds.value && myUserIds.value.length
        ? myUserIds.value
        : [currentUser.value?.id].filter(Boolean);
    if (!ids.length) return 0;

    const total = conversations.value.reduce((sum, c) => {
      const byUser = c.unreadCountByUser || {};
      // Buscar la primera clave coincidente; si no hay, usar c.unreadCount como fallback
      const matchKey = ids.find(id => byUser[id] !== null && byUser[id] !== undefined);
      if (matchKey) return sum + (byUser[matchKey] || 0);
      return sum + (c.unreadCount || 0);
    }, 0);

    if (import.meta.env && import.meta.env.DEV) {
      try {
        // Log ligero para depurar badges de chat por rol
        const sample = conversations.value.slice(0, 5).map(c => ({
          id: c.id,
          unreadCountByUser: c.unreadCountByUser,
          unreadCount: c.unreadCount,
        }));
        console.log('[Chat] totalUnreadChats recomputed', {
          ids,
          total,
          conversations: sample,
        });
      } catch (_) {}
    }

    return total;
  } catch {
    return 0;
  }
});

export function useChatConversations() {

  /**
   * Inicializar listener de conversaciones del usuario
   */
  const startConversationsListener = async (userId, userType, commerceId) => {
    // Construir lista de posibles IDs del usuario en participantIds
    const possibleIds = [];
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');
    const auth = getAuth();
    let authUser = auth.currentUser;

    // En un refresh rápido, auth.currentUser puede venir vacío al principio.
    // Esperamos brevemente a que Firebase restaure la sesión antes de seguir,
    // para asegurarnos de incluir siempre el UID real en possibleIds.
    if (!authUser) {
      try {
        await new Promise(resolve => {
          let settled = false;
          const unsub = onAuthStateChanged(auth, user => {
            if (settled) return;
            settled = true;
            try {
              unsub();
            } catch (_) {}
            resolve(true);
          });
          // Fallback de seguridad por si nunca se dispara el listener
          setTimeout(() => {
            if (settled) return;
            settled = true;
            try {
              unsub();
            } catch (_) {}
            resolve(false);
          }, 3000);
        });
        authUser = auth.currentUser;
      } catch (_) {
        // si falla, seguimos sin UID
      }
    }

    // Siempre priorizar: UID de auth + ID de usuario del store
    if (authUser?.uid) possibleIds.push(authUser.uid);
    if (userId) possibleIds.push(userId);

    // Fallback adicional: si currentUser ya fue resuelto antes, incorporar sus IDs
    try {
      if (currentUser.value?.id && !possibleIds.includes(currentUser.value.id)) {
        possibleIds.push(currentUser.value.id);
      }
      if (Array.isArray(myUserIds.value) && myUserIds.value.length) {
        myUserIds.value.forEach(id => {
          if (id && !possibleIds.includes(id)) {
            possibleIds.push(id);
          }
        });
      }
    } catch (_) {
      // no-op
    }

    // Intentar obtener IDs de documentos (collaborator/administrator/business) enlazados por userId/uid
    try {
      const {
        collection: fcol,
        query: fquery,
        where: fwhere,
        limit: flimit,
        getDocs: fgetDocs,
        doc: fdoc,
        getDoc: fgetDoc,
      } = await import('firebase/firestore');

      // Separar claramente el ID del store (documentId/collaboratorId/etc.)
      // del UID de autenticación de Firebase. Antes usábamos un solo
      // "candidateUid" y, si venía userId, nunca llegábamos a consultar por
      // authUser.uid en los campos userId/uid de collaborator/administrator/business.
      const candidateDocId = userId || null;
      const candidateAuthUid = authUser?.uid || null;
      const candidateEmail = authUser?.email || null;

      // Helper: push id if query finds a doc
      const tryPushByField = async (colName, field, value) => {
        if (!value) return false;
        try {
          const q = fquery(fcol(db, colName), fwhere(field, '==', value), flimit(1));
          const snap = await fgetDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data() || {};
            // ID del documento (ej: collaborator/administrator/business)
            possibleIds.push(snap.docs[0].id);
            // También agregar posibles campos extra de UID/autenticación
            if (data.userId) possibleIds.push(String(data.userId));
            if (data.uid) possibleIds.push(String(data.uid));
            return true;
          }
        } catch (_e) {
          /* no-op */
        }
        return false;
      };

      // Helper: push by direct doc lookup
      const tryPushByDocId = async (colName, id) => {
        if (!id) return false;
        try {
          const ref = fdoc(db, colName, id);
          const snap = await fgetDoc(ref);
          if (snap.exists()) {
            const data = snap.data() || {};
            // ID del documento (ej: collaborator/administrator/business)
            possibleIds.push(snap.id);
            // También agregar posibles campos de UID/autenticación para cubrir conversaciones
            if (data.userId) possibleIds.push(String(data.userId));
            if (data.uid) possibleIds.push(String(data.uid));
            return true;
          }
        } catch (_e) {
          /* no-op */
        }
        return false;
      };

      // Para cada colección, intentamos primero por UID de auth (campos userId/uid),
      // luego por email, y finalmente por ID de documento (store.user.id).

      // Collaborator: buscar por UID, luego email, luego docId/uid como documentId
      await tryPushByField('collaborator', 'userId', candidateAuthUid);
      await tryPushByField('collaborator', 'uid', candidateAuthUid);
      await tryPushByField('collaborator', 'email', candidateEmail);
      await tryPushByDocId('collaborator', candidateDocId);
      await tryPushByDocId('collaborator', candidateAuthUid);

      // Administrator
      await tryPushByField('administrator', 'userId', candidateAuthUid);
      await tryPushByField('administrator', 'uid', candidateAuthUid);
      await tryPushByField('administrator', 'email', candidateEmail);
      await tryPushByDocId('administrator', candidateDocId);
      await tryPushByDocId('administrator', candidateAuthUid);

      // Business
      await tryPushByField('business', 'userId', candidateAuthUid);
      await tryPushByField('business', 'uid', candidateAuthUid);
      await tryPushByField('business', 'email', candidateEmail);
      await tryPushByDocId('business', candidateDocId);
      await tryPushByDocId('business', candidateAuthUid);
    } catch (_) {
      // Silencio si falla
    }

    // Canonical: usar el primer ID como clave local y guardar todas las variantes
    currentUser.value = { id: possibleIds[0], type: userType };
    myUserIds.value = Array.from(new Set(possibleIds));
    currentCommerceId.value = commerceId;

    if (unsubscribeConversations.value) {
      unsubscribeConversations.value();
    }

    loading.value = true;

    const conversationsRef = collection(db, 'message-conversation');

    // Consultar con array-contains-any para cubrir diferentes representaciones del usuario
    // Evitar índice compuesto: consultar solo por participantIds y filtrar active localmente
    const q = query(
      conversationsRef,
      where('participantIds', 'array-contains-any', Array.from(new Set(possibleIds)))
    );

    // DEBUG removido para reducir ruido de consola y cumplir reglas de lint

    let primaryList = [];
    let altList = [];

    function includesAnyId(data, ids) {
      const arr = data.participantIds || [];
      const parts = data.participants || [];

      // Revisar participantIds
      const inParticipantIds = arr.some(pid => {
        const id = typeof pid === 'object' ? pid.id || pid.userId : pid;
        return id && ids.includes(id);
      });

      if (inParticipantIds) return true;

      // Fallback: revisar metadata de participantes (por si el backend sólo llenó `participants`)
      const inParticipants = parts.some(p => {
        const id = p && (p.userId || p.id);
        return id && ids.includes(id);
      });

      return inParticipants;
    }

    async function verifyConversationByMessages(conversationId, ids) {
      try {
        const {
          collection: fcol,
          query: fquery,
          where: fwhere,
          getDocs: fgetDocs,
          limit: flimit,
        } = await import('firebase/firestore');
        const msgsRef = fcol(db, 'internal-message');
        const qMsgs = fquery(msgsRef, fwhere('conversationId', '==', conversationId), flimit(25));
        const snap = await fgetDocs(qMsgs);
        let matched = false;
        snap.forEach(doc => {
          const data = doc.data();
          const sender = data.senderId;
          const recipient = data.recipientId;
          function matchVal(val) {
            if (!val) return false;
            if (typeof val === 'string') return ids.includes(val);
            if (typeof val === 'object') {
              return ids.includes(val.id) || ids.includes(val.userId);
            }
            return false;
          }
          if (matchVal(sender) || matchVal(recipient)) {
            matched = true;
          }
        });
        if (matched) {
          verifiedConversations.value.add(conversationId);
        }
      } catch (_) {
        // silencioso
      }
    }

    function buildConversationDoc(doc) {
      const data = doc.data();

      // Preferir metadata de participantes que ya viene del backend
      let participants = [];
      if (Array.isArray(data.participants) && data.participants.length > 0) {
        participants = data.participants.map(p => {
          const baseId = p.userId || p.id;
          const name =
            p.userName ||
            p.name ||
            p.email ||
            baseId;
          const email = p.email || null;
          const type = p.userType || p.type || 'unknown';

          return {
            userId: baseId,
            id: baseId,
            userName: name,
            name,
            email,
            userType: type,
            type,
          };
        });
      } else if (data.participantIds && Array.isArray(data.participantIds)) {
        // Fallback: construir participantes básicos desde participantIds
        participants = data.participantIds.map(participantId => {
          const id =
            typeof participantId === 'object'
              ? participantId.id || participantId.userId
              : participantId;
          const email = typeof participantId === 'object' ? participantId.email : null;
          const name = typeof participantId === 'object' ? participantId.name || email : null;

          if (data.lastMessageSenderId && typeof data.lastMessageSenderId === 'object') {
            const senderId = data.lastMessageSenderId.id || data.lastMessageSenderId.userId;
            if (senderId === id) {
              return {
                userId: id,
                id,
                userName:
                  data.lastMessageSenderId.name ||
                  data.lastMessageSenderId.email ||
                  name ||
                  id,
                name:
                  data.lastMessageSenderId.name ||
                  data.lastMessageSenderId.email ||
                  name ||
                  id,
                email: data.lastMessageSenderId.email || email,
                userType: 'unknown',
                type: 'unknown',
              };
            }
          }

          return {
            userId: id,
            id,
            userName: name || id,
            name: name || id,
            email,
            userType: 'unknown',
            type: 'unknown',
          };
        });
      }

      // Calcular unreadCount para la conversación actual considerando todas las variantes de ID
      let unreadCount = 0;
      try {
        const ids =
          myUserIds.value && myUserIds.value.length
            ? myUserIds.value
            : [currentUser.value?.id].filter(Boolean);
        if (ids.length && data.unreadCountByUser) {
          const byUser = data.unreadCountByUser || {};
          const matchKey = ids.find(id => byUser[id] !== null && byUser[id] !== undefined);
          if (matchKey) {
            unreadCount = byUser[matchKey] || 0;
          }
        }
        if (!unreadCount && data.unreadCount) {
          unreadCount = data.unreadCount;
        }
      } catch (_) {
        unreadCount = 0;
      }

      return {
        id: doc.id,
        ...data,
        participants,
        unreadCount,
      };
    }

    async function resolveParticipantInfo(id) {
      console.log('[DEBUG] resolveParticipantInfo called with id:', id);
      if (!id) return null;
      if (participantCache.has(id)) {
        console.log('[DEBUG] Found in cache:', participantCache.get(id));
        return participantCache.get(id);
      }
      try {
        const {
          doc: fdoc,
          getDoc: fgetDoc,
          collection: fcol,
          query: fquery,
          where: fwhere,
          limit: flimit,
          getDocs: fgetDocs,
        } = await import('firebase/firestore');
        // Intento 1: doc directo en collaborator/administrator/business
        const colls = ['collaborator', 'administrator', 'business'];
        for (const colName of colls) {
          try {
            const ref = fdoc(db, colName, id);
            const snap = await fgetDoc(ref);
            if (snap.exists()) {
              const data = snap.data();
              const info = {
                id,
                name:
                  data.name ||
                  `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                  data.businessName ||
                  null,
                email: data.email || null,
                type:
                  data.type ||
                  (colName === 'administrator'
                    ? 'administrator'
                    : colName === 'collaborator'
                    ? 'collaborator'
                    : 'business'),
              };
              participantCache.set(id, info);
              return info;
            }
          } catch (_) {}
        }
        // Intento 2: buscar por userId/uid/email
        const fields = ['userId', 'uid', 'email'];
        for (const colName of colls) {
          for (const field of fields) {
            try {
              const q = fquery(fcol(db, colName), fwhere(field, '==', id), flimit(1));
              const snap = await fgetDocs(q);
              if (!snap.empty) {
                const data = snap.docs[0].data();
                const info = {
                  id,
                  name:
                    data.name ||
                    `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                    data.businessName ||
                    null,
                  email: data.email || null,
                  type:
                    data.type ||
                    (colName === 'administrator'
                      ? 'administrator'
                      : colName === 'collaborator'
                      ? 'collaborator'
                      : 'business'),
                };
                console.log('[DEBUG] Found user in', colName, 'collection:', info);
                participantCache.set(id, info);
                return info;
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
      console.log('[DEBUG] No participant info found for id:', id);
      participantCache.set(id, null);
      return null;
    }

    async function enrichConversationParticipants(list) {
      console.log('[DEBUG] enrichConversationParticipants called with', list.length, 'conversations');
      const updates = [];
      for (const conv of list) {
        console.log('[DEBUG] Processing conversation:', conv.id, 'with participants:', conv.participants);
        if (!conv.participants) continue;
        for (const p of conv.participants) {
          console.log('[DEBUG] Processing participant:', p);
          // Si parece un ID crudo, intentar resolver nombre/email
          const looksLikeId = !p.name || /^[A-Za-z0-9_-]{16,}$/.test(p.name);
          console.log('[DEBUG] Participant looksLikeId:', looksLikeId, 'name:', p.name);
          if (looksLikeId) {
            updates.push(
              (async () => {
                console.log('[DEBUG] Resolving participant info for ID:', p.userId || p.id);
                const info = await resolveParticipantInfo(p.userId || p.id);
                console.log('[DEBUG] Resolved info:', info);
                if (info) {
                  const target = conversations.value.find(c => c.id === conv.id);
                  if (target && target.participants) {
                    const tp = target.participants.find(
                      x => (x.userId || x.id) === (p.userId || p.id)
                    );
                    if (tp) {
                      console.log('[DEBUG] Updating participant:', tp, 'with info:', info);
                      tp.userName = info.name || tp.userName;
                      tp.name = info.name || tp.name;
                      tp.email = info.email || tp.email;
                      tp.userType = info.type || tp.userType;
                      tp.type = info.type || tp.type;
                    }
                  }
                }
              })()
            );
          }
        }
      }
      if (updates.length) {
        console.log('[DEBUG] Waiting for', updates.length, 'participant updates');
        try {
          await Promise.allSettled(updates);
          console.log('[DEBUG] Participant updates completed');
        } catch (_) {}
      }
    }

    function mergeAndSet() {
      // Combinar y filtrar por includesAny
      const map = new Map();
      console.log('[DEBUG useChatConversations] mergeAndSet called:', {
        primaryListCount: primaryList.length,
        altListCount: altList.length,
        possibleIds: Array.from(new Set(possibleIds))
      });

      // IDs efectivos del usuario actual para filtros por usuario (incluye todas las variantes)
      const myIdsSet = (() => {
        try {
          const base = [];
          if (currentUser.value?.id) base.push(String(currentUser.value.id));
          if (Array.isArray(myUserIds.value)) {
            myUserIds.value.forEach(id => {
              if (id) base.push(String(id));
            });
          }
          return new Set(base);
        } catch (_) {
          return currentUser.value?.id ? new Set([String(currentUser.value.id)]) : new Set();
        }
      })();

      [...primaryList, ...altList].forEach(item => {
        // Filtrar localmente conversaciones activas y que incluyan el usuario
        const isActive = item.active !== false; // default true si no está presente
        const isVerified = verifiedConversations.value.has(item.id);
        const includesUser = includesAnyId(item, possibleIds);

        const archivedFor = item.archivedForUserIds || item.hiddenForUserIds || [];
        const archivedForMe = Array.isArray(archivedFor)
          ? archivedFor.some(id => id && myIdsSet.has(String(id)))
          : false;

        console.log('[DEBUG useChatConversations] Processing conversation:', {
          id: item.id,
          isActive,
          isVerified,
          includesUser,
          archivedFor,
          archivedForMe,
          participantIds: item.participantIds,
          willAdd: isActive && !archivedForMe && (includesUser || isVerified)
        });

        if (isActive && !archivedForMe && (includesUser || isVerified)) {
          map.set(item.id, item);
        }
      });

      const finalConversations = Array.from(map.values());
      console.log('[DEBUG useChatConversations] Final conversations:', finalConversations.length);
      conversations.value = finalConversations;
      loading.value = false;
    }

    unsubscribeConversations.value = onSnapshot(
      q,
      snapshot => {
        const updatedConversations = [];

        snapshot.forEach(doc => {
          updatedConversations.push(buildConversationDoc(doc));
        });
        primaryList = updatedConversations;
        // Verificar conversaciones que no coinciden por participantIds pero podrían tener mensajes del usuario
        const toVerify = primaryList.filter(c => !includesAnyId(c, possibleIds));
        Promise.all(toVerify.map(c => verifyConversationByMessages(c.id, possibleIds))).then(() => {
          mergeAndSet();
          // Enriquecer nombres/emails una vez fusionadas
          enrichConversationParticipants(conversations.value);
        });
      },
      _error => {
        loading.value = false;
      }
    );

    // Listener alternativo: por comercioId activo, y filtrar local por IDs
    if (commerceId) {
      const qAlt = query(
        conversationsRef,
        where('commerceId', '==', commerceId),
        where('active', '==', true)
      );
      unsubscribeConversationsAlt.value = onSnapshot(
        qAlt,
        snapshot => {
          const updated = [];
          snapshot.forEach(doc => {
            updated.push(buildConversationDoc(doc));
          });
          altList = updated;
          // Verificar conversaciones de este comercio que no coinciden por participantIds
          const toVerifyAlt = altList.filter(c => !includesAnyId(c, possibleIds));
          Promise.all(toVerifyAlt.map(c => verifyConversationByMessages(c.id, possibleIds))).then(
            () => {
              mergeAndSet();
              enrichConversationParticipants(conversations.value);
            }
          );
        },
        _err => {
          /* no-op */
        }
      );
    }

    // Fallback general: conversaciones activas recientes (para casos sin commerceId o participantIds como objetos)
    const qAlt2 = query(
      conversationsRef,
      where('active', '==', true),
      orderBy('updatedAt', 'desc'),
      firestoreLimit(50)
    );
    const unsubAlt2 = onSnapshot(
      qAlt2,
      snapshot => {
        const updated = [];
        snapshot.forEach(doc => {
          updated.push(buildConversationDoc(doc));
        });
        // No sobrescribir altList de comercio, combinamos ambos
        altList = [...altList, ...updated];
        const toVerifyAlt2 = updated.filter(c => !includesAnyId(c, possibleIds));
        Promise.all(toVerifyAlt2.map(c => verifyConversationByMessages(c.id, possibleIds))).then(
          () => {
            mergeAndSet();
            enrichConversationParticipants(conversations.value);
          }
        );
      },
      _err => {
        /* no-op */
      }
    );
    // Guardar para cleanup
    unsubscribeConversationsAlt.value = () => {
      try {
        unsubAlt2();
      } catch (_) {}
    };
  };

  /**
   * Inicializar listener de mensajes de una conversación
   */
  const startMessagesListener = conversationId => {
    // Siempre limpiar cualquier listener previo
    if (unsubscribeMessages.value) {
      try {
        unsubscribeMessages.value();
      } catch (_) {}
      unsubscribeMessages.value = null;
    }

    // Si no hay conversación (por ejemplo, al cerrar el hilo), solo limpiar estado local
    if (!conversationId) {
      activeConversationId.value = null;
      messages.value = [];
      return;
    }

    activeConversationId.value = conversationId;
    messages.value = [];

    const messagesRef = collection(db, 'internal-message');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      where('active', '==', true),
      orderBy('createdAt', 'asc'),
      firestoreLimit(100)
    );

    unsubscribeMessages.value = onSnapshot(
      q,
      snapshot => {
        const updatedMessages = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          updatedMessages.push({
            id: doc.id,
            ...data,
          });
        });

        messages.value = updatedMessages;

        // Logs detallados por mensaje de chat
        try {
          if (import.meta.env && import.meta.env.DEV) {
            const msgLog = updatedMessages.map(m => ({
              id: m.id,
              conversationId: m.conversationId,
              read: Boolean(m.read),
              status: m.status,
              senderId: typeof m.senderId === 'object' ? m.senderId.id || m.senderId.userId : m.senderId,
              recipientId: typeof m.recipientId === 'object' ? m.recipientId.id || m.recipientId.userId : m.recipientId,
              createdAt: m.createdAt,
            }));
            console.groupCollapsed('[Chat] Mensajes recibidos en conversación', conversationId);
            console.table(msgLog);
            console.groupEnd();
          }
        } catch (_) {}

        // Auto-marcar como leídos los mensajes recibidos por el usuario actual
        try {
          const ids =
            myUserIds.value && myUserIds.value.length
              ? myUserIds.value
              : [currentUser.value?.id].filter(Boolean);
          if (ids.length) {
            const isMine = recipientId => {
              if (!recipientId) return false;
              if (typeof recipientId === 'string') return ids.includes(recipientId);
              const candidates = [recipientId.id, recipientId.userId, recipientId.uid].filter(Boolean);
              return candidates.some(v => ids.includes(v));
            };
            const toMark = updatedMessages
              .filter(m => !m.read && isMine(m.recipientId))
              .map(m => m.id);
            if (toMark.length > 0) {
              // UI-first: marcar localmente como leídos para respuesta inmediata
              try {
                const now = new Date();
                messages.value = messages.value.map(m =>
                  toMark.includes(m.id) ? { ...m, read: true, status: 'read', readAt: now } : m
                );
                // También poner la conversación como leída localmente
                markConversationAsRead(conversationId).catch(() => {});
                if (import.meta.env && import.meta.env.DEV) {
                  console.log('[Chat] UI-first mark read IDs:', toMark);
                }
              } catch (_e) {
                /* no-op */
              }

              if (import.meta.env && import.meta.env.DEV) {
                console.warn('[Chat] Marking messages as read (bulk)', {
                  count: toMark.length,
                  sample: toMark.slice(0, 5),
                  conversationId,
                });
                // Preflight: comprobar si backend ve el mensaje
                (async () => {
                  try {
                    const probeId = toMark[0];
                    const _probe = await internalMessageService.getMessage(probeId);
                    console.warn('[Chat] Backend getMessage probe OK', { id: probeId });
                  } catch (e) {
                    const status = e?.response?.status;
                    console.warn('[Chat] Backend getMessage probe FAIL', {
                      id: toMark[0],
                      status,
                      hint: 'Posible desalineación de PROJECT_ID entre frontend/backend',
                    });
                  }
                })();
              }
              (async () => {
                try {
                  const res = await internalMessageService.bulkMarkAsRead(toMark);
                  // Si el backend responde "skipped" (por ejemplo 404/idempotente),
                  // no volvemos a intentar por mensaje para evitar spam de errores.
                  if (res && res.skipped) {
                    if (import.meta.env && import.meta.env.DEV) {
                      console.warn('[Chat] bulkMarkAsRead skipped by backend, no per-message retries', {
                        count: toMark.length,
                      });
                    }
                    return;
                  }

                  const updatedIds = Array.isArray(res?.messageIds) ? res.messageIds : [];
                  const remaining = updatedIds.length
                    ? toMark.filter(id => !updatedIds.includes(id))
                    : toMark;
                  if (import.meta.env && import.meta.env.DEV) {
                    console.log('[Chat] Bulk result:', { updatedIds, remaining });
                  }
                  if (remaining.length) {
                    if (import.meta.env && import.meta.env.DEV) {
                      console.warn('[Chat] Bulk had remaining; marking individually', {
                        remaining: remaining.slice(0, 5),
                        count: remaining.length,
                      });
                    }
                    await Promise.allSettled(remaining.map(id => markMessageAsRead(id)));
                  }
                } catch (_) {
                  if (import.meta.env && import.meta.env.DEV) {
                    console.warn('[Chat] Bulk failed; checking error before individual retries');
                  }
                  try {
                    // Si el fallo viene del propio servicio con status 404/skipped,
                    // no hacemos intentos individuales.
                    const testRes = await internalMessageService.bulkMarkAsRead([]);
                    if (testRes && testRes.skipped) {
                      return;
                    }
                  } catch (_) {
                    // Ignorar errores de prueba
                  }
                  if (import.meta.env && import.meta.env.DEV) {
                    console.warn('[Chat] Bulk truly failed; marking individually', {
                      count: toMark.length,
                      sample: toMark.slice(0, 5),
                    });
                  }
                  await Promise.allSettled(toMark.map(id => markMessageAsRead(id)));
                }
              })();
            }
          }
        } catch (_) {}

        // Auto-scroll al último mensaje
        setTimeout(() => {
          const container = document.querySelector('.chat-messages-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      },
      error => {
        // Error handled silently
      }
    );
  };

  /**
   * Obtener o crear conversación con un usuario
   */
  const getOrCreateConversation = async (otherUserId, otherUserType, commerceId = null) => {
    try {
      const finalCommerceId = commerceId || currentCommerceId.value;
      if (!finalCommerceId) {
        throw new Error('commerceId is required');
      }

      const response = await requestBackend.post('/internal-message/conversation', {
        participantId: otherUserId,
        commerceId: finalCommerceId,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Enviar mensaje en conversación
   */
  const sendMessage = async (
    conversationId,
    content,
    recipientId,
    recipientType,
    commerceId = null
  ) => {
    try {
      const finalCommerceId = commerceId || currentCommerceId.value;
      if (!finalCommerceId) {
        throw new Error('commerceId is required');
      }

      const response = await requestBackend.post('/internal-message/send', {
        category: 'direct_message',
        priority: 'normal',
        title: 'Chat',
        content,
        recipientId,
        recipientType,
        conversationId,
        commerceId: finalCommerceId,
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  /**
   * Marcar conversación como leída
   */
  const markConversationAsRead = async conversationId => {
    if (!currentUser.value) return;

    try {
      const conversationRef = doc(db, 'message-conversation', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (!conversationSnap.exists()) return;

      const data = conversationSnap.data();
      const unreadCount = { ...(data.unreadCountByUser || {}) };
      const ids =
        myUserIds.value && myUserIds.value.length ? myUserIds.value : [currentUser.value.id];
      ids.forEach(id => {
        unreadCount[id] = 0;
      });

      await updateDoc(conversationRef, {
        unreadCountByUser: unreadCount,
        updatedAt: Timestamp.now(),
      });

      // Actualizar localmente
      const conv = conversations.value.find(c => c.id === conversationId);
      if (conv) {
        conv.unreadCount = 0;
        conv.unreadCountByUser = unreadCount;
      }
    } catch (error) {
      // Error handled silently
    }
  };

  /**
   * Archivar conversación
   */
  const archiveConversation = async conversationId => {
    try {
      const conversationRef = doc(db, 'message-conversation', conversationId);
      // Resolver todos los IDs que representan al usuario actual
      const ids = (() => {
        try {
          const base = [];
          if (currentUser.value?.id) base.push(String(currentUser.value.id));
          if (Array.isArray(myUserIds.value)) {
            myUserIds.value.forEach(id => {
              if (id) base.push(String(id));
            });
          }
          return Array.from(new Set(base));
        } catch (_) {
          return currentUser.value?.id ? [String(currentUser.value.id)] : [];
        }
      })();

      if (!ids.length) {
        // Sin IDs confiables no tocamos Firestore para no romper a otros usuarios
        return;
      }

      await updateDoc(conversationRef, {
        archivedForUserIds: arrayUnion(...ids),
        updatedAt: Timestamp.now(),
      });

      // Remover localmente
      conversations.value = conversations.value.filter(c => c.id !== conversationId);

      if (activeConversationId.value === conversationId) {
        activeConversationId.value = null;
        messages.value = [];
      }
    } catch (error) {
      // Error handled silently
    }
  };

  /**
   * Marcar mensaje como leído
   */
  const markMessageAsRead = async messageId => {
    try {
      await internalMessageService.markAsRead(messageId);
    } catch (error) {
      // Silenciar 404 como operación idempotente
      if (error?.response?.status !== 404) {
        // Otros errores se silencian igualmente por ahora
      }
    }
  };

  /**
   * Obtener información del otro participante
   */
  const getOtherParticipant = conversation => {
    if (!currentUser.value || !conversation) {
      return null;
    }

    // Construir lista completa de IDs que representan al usuario actual
    const myIds = (() => {
      try {
        const base = [];
        if (currentUser.value?.id) base.push(String(currentUser.value.id));
        if (Array.isArray(myUserIds.value)) {
          myUserIds.value.forEach(id => {
            if (id) base.push(String(id));
          });
        }
        return Array.from(new Set(base));
      } catch (_) {
        return currentUser.value?.id ? [String(currentUser.value.id)] : [];
      }
    })();

    // Buscar en el array de participantIds
    if (conversation.participantIds && conversation.participantIds.length > 0) {
      // Determinar el otro participante considerando posibles objetos en participantIds
      const otherEntry = conversation.participantIds.find(entry => {
        const entryId = typeof entry === 'object' ? entry.id || entry.userId : entry;
        if (!entryId) return false;
        const normalized = String(entryId);
        // Es "otro" solo si NO coincide con ninguno de mis IDs conocidos
        return !myIds.includes(normalized);
      });
      const otherUserId =
        typeof otherEntry === 'object' ? otherEntry.id || otherEntry.userId : otherEntry;

      if (!otherUserId) {
        return null;
      }

      // Si hay array de participants con info completa, usarlo
      if (conversation.participants && conversation.participants.length > 0) {
        const participant = conversation.participants.find(
          p => String(p.userId || p.id) === String(otherUserId)
        );
        if (participant) {
          return {
            id: participant.userId || participant.id,
            type: participant.userType || participant.type,
            name: participant.name,
            email: participant.email,
          };
        }
      }

      // Si no hay participants array o no se encontró, construir objeto básico
      // Intentar obtener el tipo del lastMessageSenderId si está disponible
      const participantType = 'collaborator'; // Default

      if (conversation.lastMessageSenderId) {
        const senderId =
          typeof conversation.lastMessageSenderId === 'object'
            ? conversation.lastMessageSenderId.id
            : conversation.lastMessageSenderId;

        if (senderId === otherUserId && typeof conversation.lastMessageSenderId === 'object') {
          // Podemos inferir info del último mensaje
          return {
            id: otherUserId,
            type: 'unknown', // No podemos determinar el tipo exacto
            name: conversation.lastMessageSenderId.name,
            email: conversation.lastMessageSenderId.email,
          };
        }
      }

      // Último recurso: retornar solo el ID
      return {
        id: otherUserId,
        type: participantType,
        name: null,
        email: null,
      };
    }

    return null;
  };

  /**
   * Cleanup
   */
  const cleanup = () => {
    if (unsubscribeConversations.value) {
      unsubscribeConversations.value();
      unsubscribeConversations.value = null;
    }
    if (unsubscribeConversationsAlt.value) {
      unsubscribeConversationsAlt.value();
      unsubscribeConversationsAlt.value = null;
    }
    if (unsubscribeMessages.value) {
      unsubscribeMessages.value();
      unsubscribeMessages.value = null;
    }
    conversations.value = [];
    messages.value = [];
    activeConversationId.value = null;
  };

  return {
    conversations,
    messages,
    activeConversationId,
    loading,
    currentUser,
    startConversationsListener,
    startMessagesListener,
    getOrCreateConversation,
    sendMessage,
    markConversationAsRead,
    archiveConversation,
    markMessageAsRead,
    getOtherParticipant,
    totalUnreadChats,
    myUserIds,
    cleanup,
  };
}
