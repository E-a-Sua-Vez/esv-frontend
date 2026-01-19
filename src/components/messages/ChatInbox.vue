<template>
  <div class="chat-inbox-panel" :class="{ 'is-open': isOpen }">
    <div class="inbox-overlay" @click="close" v-if="isOpen"></div>

    <div class="inbox-container" v-if="isOpen">
      <div class="inbox-header">
        <h3>{{ $t('chat.inbox') }}</h3>
        <div class="header-actions">
          <!-- Botón de Nuevo chat -->
          <button
            @click="openChatComposer"
            class="compose-button"
            :title="$t('chat.newChat')"
          >
            <i class="bi bi-plus-circle"></i>
            <span>{{ $t('chat.newChat') }}</span>
          </button>

          <button @click="close" class="close-button" :aria-label="$t('common.close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <div class="inbox-content">
        <!-- Chat View -->
        <div class="chat-view-container">
          <div class="chat-layout-vertical">
            <!-- Carrusel de conversaciones arriba -->
            <div class="conversations-section">
              <ChatConversationList
                :conversations="conversations"
                :activeId="activeConversationId"
                :loading="chatLoading"
                :currentUserId="currentUserId"
                @select="handleSelectConversation"
                @archive="handleArchiveConversation"
              />
            </div>

            <!-- Área de mensajes abajo -->
            <div class="chat-messages-panel">
              <!-- Estado de carga: no mostrar mensajes incoherentes mientras se resuelven IDs y conversaciones -->
              <div v-if="chatLoading || !currentUserId" class="chat-loading-state">
                <div class="spinner"></div>
                <p>{{ $t('chat.loadingConversations') }}</p>
              </div>

              <!-- Conversación activa solo cuando hay usuario resuelto y listener listo -->
              <ChatMessageThread
                v-else-if="activeConversationId"
                :conversation="activeConversation"
                :messages="chatMessages"
                :currentUserId="currentUserId"
                :myUserIds="myUserIds"
                @send="handleSendChatMessage"
                @markRead="markChatMessageAsRead"
                @close="handleCloseConversation"
              />

              <!-- Estado vacío cuando no hay conversación seleccionada -->
              <div v-else class="chat-empty-state">
                <i class="bi bi-chat-dots" style="font-size: 3.5rem; color: #adb5bd"></i>
                <p>{{ $t('chat.selectConversation') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Composer Modal -->
    <MessageComposer
      :is-open="composerOpen"
      :chat-mode="true"
      :mass-mode="false"
      :user-role="userRole"
      :user-data="userData"
      @close="composerOpen = false"
      @sent="handleMessageSent"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAuth } from 'firebase/auth';
import { globalStore } from '@/stores';
import { useMessageInbox } from '@/composables/useMessageInbox';
import { useChatConversations } from '@/composables/useChatConversations';
import { usePermissions } from '@/composables/usePermissions';
import MessageComposer from './MessageComposer.vue';
import ChatConversationList from './ChatConversationList.vue';
import ChatMessageThread from './ChatMessageThread.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  userRole: {
    type: String,
    default: 'collaborator',
  },
  userData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['close', 'message-click']);

const { t } = useI18n();
const store = globalStore();

// Message inbox composable (solo para contadores)
const {
  markAllChatAsRead,
  chatUnreadCount,
} = useMessageInbox();

// Chat composable
const {
  conversations,
  messages: chatMessages,
  activeConversationId,
  loading: chatLoading,
  currentUser: chatCurrentUser,
  myUserIds,
  startConversationsListener,
  startMessagesListener,
  sendMessage: sendChatMessage,
  markConversationAsRead,
  archiveConversation,
  markMessageAsRead: markChatMessageAsRead,
  getOtherParticipant,
  cleanup: cleanupChat,
} = useChatConversations();

// Permissions composable
const {
  canStartChats,
} = usePermissions();

const composerOpen = ref(false);

// Chat computed
const currentUserId = computed(() => {
  // Preferir IDs canonizados que useChatConversations ya resolvió (myUserIds)
  const canonicalId = (myUserIds?.value && myUserIds.value.length) ? myUserIds.value[0] : null;
  const result =
    canonicalId ||
    chatCurrentUser?.value?.id ||
    getAuth().currentUser?.uid ||
    store.getCurrentUser?.id;
  return result;
});

const userRole = computed(() => {
  const user = store.getCurrentUser;
  if (!user) return 'collaborator';
  if (user.master) return 'master';
  if (user.businessId) return 'administrator';
  return 'collaborator';
});

const activeConversation = computed(() => {
  return conversations.value.find(c => c.id === activeConversationId.value);
});

// Lifecycle hooks
const conversationsListenerStarted = ref(false);

onMounted(() => {
  // Inicializar listener de conversaciones al montar el componente (una sola vez)
  const user = store.getCurrentUser;
  if (user?.id && !conversationsListenerStarted.value) {
    const role = user.master ? 'master' : (user.businessId ? 'administrator' : 'collaborator');
    const commerceId = user.commerceId || user.commerce?.id;
    startConversationsListener(user.id, role, commerceId);
    conversationsListenerStarted.value = true;
  }
});

onUnmounted(() => {
  cleanupChat();
});

// Watchers
watch(
  () => conversations.value,
  (newConversations) => {},
  { immediate: true }
);

watch(
  () => currentUserId.value,
  (newValue, oldValue) => {}
);

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      // Chat panel abierto - asegurar que el listener está activo
      const user = store.getCurrentUser;
      if (user?.id && conversations.value.length === 0 && !conversationsListenerStarted.value) {
        const role = user.master ? 'master' : (user.businessId ? 'administrator' : 'collaborator');
        const commerceId = user.commerceId || user.commerce?.id;
        startConversationsListener(user.id, role, commerceId);
        conversationsListenerStarted.value = true;
      }
    } else {
      // Al cerrar el modal, limpiar todas las conversaciones y listeners de chat
      cleanupChat();
      conversationsListenerStarted.value = false;
    }
  }
);

// Métodos
function close() {
  emit('close');
}

function handleMarkAllChatsAsRead() {
  markAllChatAsRead();
}

function openChatComposer() {
  composerOpen.value = true;
}

function handleMessageSent(data) {
  if (data?.conversationId) {
    // Seleccionar la conversación creada
    let attempts = 0;
    const maxAttempts = 5;
    const trySelectConversation = () => {
      const conv = conversations.value.find(c => c.id === data.conversationId);
      if (conv) {
        handleSelectConversation(data.conversationId);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trySelectConversation, 500);
      }
    };

    setTimeout(trySelectConversation, 300);
  }
}

// Chat handlers
async function handleSelectConversation(conversationId) {
  await startMessagesListener(conversationId);
  // Auto-mark as read after 1 second
  setTimeout(() => {
    const user = store.getCurrentUser;
    if (user?.id) {
      markConversationAsRead(conversationId, user.id);
    }
  }, 1000);
}

async function handleSendChatMessage(content) {
  if (!activeConversation.value) {
    console.error('[ChatInbox] No active conversation');
    return;
  }

  const otherParticipant = getOtherParticipant(activeConversation.value);
  if (!otherParticipant) {
    console.error('[ChatInbox] No other participant found');
    return;
  }

  // Determinar commerceId con varios fallbacks
  const user = store.getCurrentUser;
  const commerceId =
    activeConversation.value.commerceId ||
    activeConversation.value.commerce?.id ||
    user?.commerceId ||
    user?.commerce?.id ||
    null;

  const recipientType = otherParticipant.type || otherParticipant.userType || 'collaborator';

  try {
    await sendChatMessage(
      activeConversationId.value,
      content,
      otherParticipant.id,
      recipientType,
      commerceId
    );
  } catch (error) {
    console.error('[ChatInbox] Error sending message:', error);
  }
}

async function handleArchiveConversation(conversationId) {
  try {
    const user = store.getCurrentUser;
    if (user?.id) {
      await archiveConversation(conversationId, user.id);
    }
  } catch (error) {
    console.error('[ChatInbox] Error archiving conversation:', error);
  }
}

function handleCloseConversation() {
  // Cerrar solo la vista del hilo, sin archivar ni borrar la conversación
  startMessagesListener(null);
}
</script>

<style scoped>
.chat-inbox-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.chat-inbox-panel.is-open {
  pointer-events: auto;
}

.inbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
  z-index: 1;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.inbox-container {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  max-width: 900px;
  height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 2;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Header */
.inbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--azul-hub, #1f3f92) 0%, rgba(31, 63, 146, 0.95) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(31, 63, 146, 0.2);
}

.inbox-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.compose-button,
.close-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: white;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: auto;
  min-width: 36px;
  height: 36px;
}

.compose-button span {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.close-button {
  width: 36px;
}

.compose-button:hover,
.close-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.compose-button i,
.close-button i {
  font-size: 1.1rem;
}

/* Content */
.inbox-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-view-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-layout-vertical {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.conversations-section {
  flex-shrink: 0;
  max-height: 180px;
  border-bottom: 1px solid #e9ecef;
  background: white;
}

.chat-messages-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8f9fa;
  min-height: 0;
}

.chat-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  gap: 0.75rem;
}

.chat-loading-state .spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e9ecef;
  border-top-color: #6f42c1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  padding: 2rem;
}

.chat-empty-state i {
  margin-bottom: 1rem;
  font-size: 3.5rem;
  color: #adb5bd;
}

.chat-empty-state p {
  margin: 0;
  font-size: 1.1rem;
  color: #6c757d;
}

/* Responsive */
@media (max-width: 640px) {
  .inbox-container {
    max-width: 100%;
    width: 100%;
  }

  .inbox-header {
    padding: 1rem;
  }

  .inbox-header h3 {
    font-size: 1.1rem;
  }

  .compose-button span {
    display: none;
  }
}
</style>
