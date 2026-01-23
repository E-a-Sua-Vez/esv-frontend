<template>
  <div class="message-inbox-panel" :class="{ 'is-open': isOpen }">
    <div class="inbox-overlay" @click="close" v-if="isOpen"></div>

    <div class="inbox-container" v-if="isOpen">
      <div class="inbox-header">
        <h3>{{ $t('messages.inbox') }}</h3>
        <div class="header-actions">
          <!-- Botón ‘Nuevo mensaje’ para no-master (toma label según pestaña) -->

          <button
            v-if="
              (canSendMessages || canStartChats) &&
              activeTab !== 'sent' &&
              currentUserType.value !== 'master'
            "
            @click="openComposer"
            class="compose-button"
            :title="activeTab === 'chat' ? $t('chat.newChat') : $t('messages.compose.newMessage')"
          >
            <i class="bi bi-plus-circle"></i>
            <span v-if="activeTab === 'chat'">{{ $t('chat.newChat') }}</span>
            <span v-else>{{ $t('messages.compose.newMessage') }}</span>
          </button>

          <!-- Botón de Nuevo chat para master (visible en cualquier pestaña) -->
          <button
            v-if="canStartChats && userRole.value === 'master' && activeTab === 'chat'"
            @click="openChatComposer"
            class="compose-button"
            :title="$t('chat.newChat')"
          >
            <i class="bi bi-plus-circle"></i>
            <span>{{ $t('chat.newChat') }}</span>
          </button>

          <!-- Botón: Marcar chats como leídos (icono en header, estilo igual) -->
          <button
            v-if="activeTab === 'chat' && chatUnreadCount > 0"
            @click="handleMarkAllChatsAsRead"
            class="mark-all-button"
            :title="$t('messages.markAllAsRead')"
          >
            <i class="bi bi-check2-all"></i>
          </button>
          <button
            v-if="canSendMassMessages && activeTab !== 'chat'"
            @click="openMassMessageComposer"
            class="mass-message-button"
            :title="$t('messages.compose.massMessage')"
          >
            <i class="bi bi-megaphone"></i>
            <span>{{ $t('messages.compose.massMessage') }}</span>
          </button>
          <button
            v-if="unreadCount > 0"
            @click="handleMarkAllAsRead"
            class="mark-all-button"
            :title="$t('messages.markAllAsRead')"
          >
            <i class="bi bi-check2-all"></i>
          </button>
          <button
            v-if="displayedMessages.length > 0"
            @click="handleArchiveAll"
            class="archive-all-button"
            :title="$t('messages.archiveAll')"
          >
            <i class="bi bi-archive"></i>
          </button>
          <button @click="close" class="close-button" :aria-label="$t('common.close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <div class="inbox-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-button"
          :class="{ active: activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.display || $t(`messages.tabs.${tab.label}`) }}
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div class="inbox-filters" v-if="showFilters">
        <div class="filter-group">
          <label>{{ $t('messages.filters.category') }}</label>
          <select v-model="selectedCategory" @change="handleFilterChange">
            <option :value="null">{{ $t('messages.filters.allCategories') }}</option>
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ $t(`messages.categories.${cat}`) }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>{{ $t('messages.filters.priority') }}</label>
          <select v-model="selectedPriority" @change="handleFilterChange">
            <option :value="null">{{ $t('messages.filters.allPriorities') }}</option>
            <option v-for="pri in priorities" :key="pri" :value="pri">
              {{ $t(`messages.priorities.${pri}`) }}
            </option>
          </select>
        </div>

        <button @click="clearAllFilters" class="clear-filters-button">
          <i class="bi bi-x-circle"></i>
          {{ $t('messages.filters.clear') }}
        </button>
      </div>

      <div class="inbox-content">
        <!-- Chat View (when chat tab is active) -->
        <div v-if="activeTab === 'chat'" class="chat-view-container">
          <div class="chat-layout">
            <ChatConversationList
              :conversations="conversations"
              :active-id="activeConversationId"
              :loading="chatLoading"
              :current-user-id="currentUserId"
              @select="handleSelectConversation"
              @archive="handleArchiveConversation"
            />
            <div class="chat-messages-panel">
              <ChatMessageThread
                v-if="activeConversationId"
                :conversation="activeConversation"
                :messages="chatMessages"
                :current-user-id="currentUserId"
                @send="handleSendChatMessage"
                @markRead="markChatMessageAsRead"
              />
              <div v-else class="chat-empty-state">
                <i class="bi bi-chat-dots" style="font-size: 3.5rem; color: #adb5bd"></i>
                <p>{{ $t('chat.selectConversation') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Regular messages view (for other tabs) -->
        <div v-else-if="loading" class="loading-state">
          <div
            class="spinner-border"
            role="status"
            style="width: 3rem; height: 3rem; color: #004aad"
          ></div>
          <p>{{ $t('messages.loading') }}</p>
        </div>

        <div v-else-if="error" class="error-state">
          <i class="bi bi-exclamation-triangle" style="font-size: 2.5rem; color: #dc3545"></i>
          <p>{{ error }}</p>
          <button @click="reload" class="retry-button">
            <i class="bi bi-arrow-clockwise me-2"></i>
            {{ $t('common.retry') }}
          </button>
        </div>

        <div v-else-if="displayedMessages.length === 0" class="empty-state">
          <i class="bi bi-inbox" style="font-size: 3.5rem; color: #adb5bd"></i>
          <p>{{ $t('messages.noMessages') }}</p>
        </div>

        <div v-else class="messages-list">
          <NotificationItem
            v-for="message in displayedMessages"
            :key="message.id"
            :message="message"
            @read="handleMessageRead"
            @archive="handleMessageArchived"
            @click="handleMessageClick"
          />

          <div v-if="hasMore" class="load-more">
            <button @click="loadMore" class="load-more-button">
              {{ $t('messages.loadMore') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Composer Modal -->
    <MessageComposer
      :is-open="composerOpen"
      :chat-mode="activeTab === 'chat' && userRole === 'master'"
      :mass-mode="composerMode === 'mass'"
      :user-role="userRole"
      :user-data="userData"
      @close="
        composerOpen = false;
        composerMode = 'single';
      "
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
import NotificationItem from './NotificationItem.vue';
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

// Message inbox composable
const {
  filteredMessages,
  loading,
  error,
  unreadCount,
  setFilter,
  clearFilters,
  markAllAsRead,
  archiveAll,
  bulkArchive,
  loadMessages,
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
  startConversationsListener,
  startMessagesListener,
  getOrCreateConversation,
  sendMessage: sendChatMessage,
  markConversationAsRead,
  archiveConversation,
  markMessageAsRead: markChatMessageAsRead,
  getOtherParticipant,
  cleanup: cleanupChat,
} = useChatConversations();
// chatUnreadCount ya proviene del composable anterior

// Permissions composable
const {
  canSendMessages,
  canSendMassMessages,
  canSendCrossBusinessMessages,
  canStartChats,
  canStartCrossBusinessChats,
  isMasterUser,
  isAdminUser,
  loadPermissions,
} = usePermissions();

const activeTab = ref('all');
const selectedCategory = ref(null);
const selectedPriority = ref(null);
const showFilters = ref(false);
const pageSize = ref(20);
const currentPage = ref(1);
const composerOpen = ref(false);
const composerMode = ref('single'); // 'single' or 'mass'

// Categorías disponibles
const categories = [
  'stock',
  'booking',
  'payment',
  'attention',
  'system',
  'chat',
  'queue',
  'client',
  'collaborator',
  'document',
  'report',
  'alert',
  'reminder',
  'task',
];

// Prioridades disponibles
const priorities = ['urgent', 'high', 'normal', 'low'];

// Base de mensajes para conteos (aplica filtro de master)
const baseCountMessages = computed(() => {
  let msgs = filteredMessages.value;
  if (isMasterUser?.value) {
    const uid = store.getCurrentUser?.id;
    const matchesSender = m => {
      const s = m?.senderId;
      if (!uid || !s) return false;
      if (typeof s === 'string') return s === uid;
      if (typeof s === 'object') return s.id === uid || s.userId === uid;
      return false;
    };
    msgs = uid ? msgs.filter(matchesSender) : [];
  }
  return msgs;
});

// Tabs
const tabs = computed(() => {
  if (userRole.value === 'master') {
    const massCount = filteredMessages.value.filter(
      m => m.mass === true || m.metadata?.mass === true,
    ).length;
    return [
      {
        value: 'sent',
        label: 'sent',
        display: 'Enviadas',
        count: massCount,
      },
      {
        value: 'chat',
        label: 'chat',
        count: chatUnreadCount?.value || 0,
      },
    ];
  }
  return [
    {
      value: 'all',
      label: 'all',
      count: baseCountMessages.value.length,
    },
    {
      value: 'unread',
      label: 'unread',
      count: baseCountMessages.value.filter(m => !m.read).length,
    },
    {
      value: 'notifications',
      label: 'notifications',
      count: baseCountMessages.value.filter(m => m.type === 'notification' && !m.read).length,
    },
    {
      value: 'chat',
      label: 'chat',
      count: chatUnreadCount?.value || 0,
    },
  ];
});

// Mensajes filtrados por tab activo
const tabFilteredMessages = computed(() => {
  let messages = filteredMessages.value;
  const uid = store.getCurrentUser?.id;
  const matchesSender = m => {
    const s = m?.senderId;
    if (!uid || !s) return false;
    if (typeof s === 'string') return s === uid;
    if (typeof s === 'object') return s.id === uid || s.userId === uid;
    return false;
  };

  // Para master: por defecto filtrar por enviados por mí, excepto en 'sent'
  if (isMasterUser?.value && activeTab.value !== 'sent') {
    messages = uid ? messages.filter(matchesSender) : [];
  }

  switch (activeTab.value) {
    case 'unread':
      messages = messages.filter(m => !m.read);
      break;
    case 'notifications':
      messages = messages.filter(m => m.type === 'notification');
      break;
    case 'chat':
      messages = messages.filter(m => m.type === 'chat');
      break;
    case 'sent':
      // Para master, mostrar solo envíos masivos (sin exigir sender match por compatibilidad)
      if (isMasterUser?.value) {
        messages = messages.filter(m => m.mass === true || m.metadata?.mass === true);
      }
      break;
  }

  return messages;
});

// Mensajes con paginación
const displayedMessages = computed(() => {
  const endIndex = currentPage.value * pageSize.value;
  return tabFilteredMessages.value.slice(0, endIndex);
});

const hasMore = computed(() => displayedMessages.value.length < tabFilteredMessages.value.length);

// Mass message composer functions
function openMassMessageComposer() {
  // Abrir composer en modo masivo
  composerOpen.value = true;
  composerMode.value = 'mass';
}

// Lifecycle hooks
onMounted(() => {
  loadPermissions();
});

function handleMarkAllChatsAsRead() {
  markAllChatAsRead();
}

// Watchers
watch(activeTab, () => {
  currentPage.value = 1;
});

watch(
  () => props.isOpen,
  newVal => {
    if (newVal) {
      // Ajustar tab inicial según rol
      if (userRole.value === 'master') {
        activeTab.value = 'sent';
      } else {
        activeTab.value = 'all';
      }
      reload();
    }
  }
);

// Métodos
function close() {
  emit('close');
}

function reload() {
  currentPage.value = 1;
  // Los mensajes ya se cargan en tiempo real desde Firestore
  // No necesitamos llamar al endpoint HTTP que está fallando
  // loadMessages();
}

function loadMore() {
  currentPage.value++;
}

function handleFilterChange() {
  setFilter('category', selectedCategory.value);
  setFilter('priority', selectedPriority.value);
  currentPage.value = 1;
}

function clearAllFilters() {
  selectedCategory.value = null;
  selectedPriority.value = null;
  clearFilters();
  currentPage.value = 1;
}

async function handleMarkAllAsRead() {
  try {
    await markAllAsRead();
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

async function handleArchiveAll() {
  if (!confirm(t('messages.confirmArchiveAll'))) {
    return;
  }

  try {
    const ids = displayedMessages.value.map(m => m.id);
    if (ids.length === 0) return;
    await bulkArchive(ids);
  } catch (error) {
    console.error('Error archiving all:', error);
  }
}

function handleMessageRead(messageId) {
  // Ya manejado por el composable
}

function handleMessageArchived(messageId) {
  // Ya manejado por el composable
}

function handleMessageClick(message) {
  emit('message-click', message);
}

function openComposer() {
  composerOpen.value = true;
  composerMode.value = 'single';
}

function openChatComposer() {
  // Garantizar modo chat y visibilidad del botón en cualquier pestaña
  activeTab.value = 'chat';
  composerMode.value = 'single';
  composerOpen.value = true;
}

function handleMessageSent(data) {
  if (data?.conversationId) {
    // Si es un mensaje de chat, cambiar a la tab de chat y seleccionar la conversación
    activeTab.value = 'chat';

    // Intentar seleccionar la conversación, con reintentos si no está cargada aún
    let attempts = 0;
    const maxAttempts = 5;
    const trySelectConversation = () => {
      const conv = conversations.value.find(c => c.id === data.conversationId);
      if (conv) {
        handleSelectConversation(data.conversationId);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(trySelectConversation, 500);
      } else {
        console.error('[MessageInbox] Failed to find conversation after', maxAttempts, 'attempts');
      }
    };

    setTimeout(trySelectConversation, 300);
  } else {
    // Recargar mensajes después de enviar notificación
    reload();
  }
}

// Chat computed
const currentUserId = computed(
  () =>
    // Para Chat, usar el ID que el listener determinó (participantId efectivo)
    chatCurrentUser?.value?.id || getAuth().currentUser?.uid || store.getCurrentUser?.id,
);
const userRole = computed(() => {
  const user = store.getCurrentUser;
  if (!user) return 'collaborator';
  if (user.master) return 'master';
  if (user.businessId) return 'administrator';
  return 'collaborator';
});

const activeConversation = computed(() =>
  conversations.value.find(c => c.id === activeConversationId.value)
);

const currentUserType = computed(() => store.getCurrentUserType);

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
    console.error('[MessageInbox] No active conversation');
    return;
  }

  const otherParticipant = getOtherParticipant(activeConversation.value);
  if (!otherParticipant) {
    console.error('[MessageInbox] No other participant found');
    return;
  }

  // Obtener commerceId de la conversación activa (no del usuario)
  const commerceId = activeConversation.value.commerceId;

  try {
    await sendChatMessage(
      activeConversationId.value,
      content,
      otherParticipant.id,
      otherParticipant.type,
      commerceId
    );
  } catch (error) {
    console.error('[MessageInbox] Error sending chat message:', error);
  }
}

async function handleArchiveConversation(conversationId) {
  if (!confirm(t('chat.confirmArchive') || '¿Archivar conversación?')) {
    return;
  }

  try {
    await archiveConversation(conversationId);
  } catch (error) {
    console.error('[MessageInbox] Error archiving conversation:', error);
  }
}

// Lifecycle - Start chat listener when modal opens
watch(
  () => props.isOpen,
  newVal => {
    if (newVal) {
      const user = store.getCurrentUser;
      if (user?.id) {
        const commerceId = user.commerceId || user.commerce?.id;
        startConversationsListener(user.id, userRole.value, commerceId);
      }
    }
  },
);

// Start chat listener when switching to chat tab
watch(activeTab, newTab => {
  if (newTab === 'chat' && props.isOpen) {
    const user = store.getCurrentUser;
    if (user?.id && conversations.value.length === 0) {
      const commerceId = user.commerceId || user.commerce?.id;
      startConversationsListener(user.id, userRole.value, commerceId);
    }
  }
});

onUnmounted(() => {
  cleanupChat();
});
</script>

<style scoped>
.message-inbox-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.message-inbox-panel.is-open {
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.inbox-container {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  max-width: 480px;
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
.mass-message-button,
.mark-all-button,
.archive-all-button,
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

.mass-message-button {
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b35 100%);
  color: white;
  padding: 0.5rem 0.75rem;
  min-width: auto;
}

.mass-message-button span {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.mass-message-button:hover {
  background: linear-gradient(135deg, #e07600 0%, #e0552a 100%);
  transform: scale(1.05);
}

.mark-all-button,
.archive-all-button,
.close-button {
  width: 36px;
}

.compose-button:hover,
.mass-message-button:hover,
.mark-all-button:hover,
.archive-all-button:hover,
.close-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.mass-message-button:hover {
  background: linear-gradient(135deg, #e07600 0%, #e0552a 100%);
}

.compose-button i,
.mass-message-button i,
.mark-all-button i,
.archive-all-button i,
.close-button i {
  font-size: 1.1rem;
}

/* Tabs */
.inbox-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  overflow-x: auto;
}

.tab-button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #6c757d;
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.tab-button:hover {
  background: #f8f9fa;
  color: #004aad;
}

.tab-button.active {
  background: linear-gradient(135deg, #004aad 0%, #00c2cb 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.25);
}

.tab-count {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.25);
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  font-weight: 600;
}

.tab-button.active .tab-count {
  background: rgba(255, 255, 255, 0.3);
}

/* Filters */
.inbox-filters {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  flex: 1;
  min-width: 140px;
}

.filter-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  color: #495057;
  transition: all 0.2s ease;
}

.filter-group select:focus {
  outline: none;
  border-color: #004aad;
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.clear-filters-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.clear-filters-button:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
  color: #495057;
}

/* Content */
.inbox-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
}

.inbox-content::-webkit-scrollbar {
  width: 8px;
}

.inbox-content::-webkit-scrollbar-track {
  background: #f1f3f5;
}

.inbox-content::-webkit-scrollbar-thumb {
  background: #adb5bd;
  border-radius: 4px;
}

.inbox-content::-webkit-scrollbar-thumb:hover {
  background: #868e96;
}

/* States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #6c757d;
}

.loading-state .spinner-border {
  margin-bottom: 1.5rem;
}

.error-state i {
  margin-bottom: 1rem;
  font-size: 2.5rem;
}

.empty-state i {
  margin-bottom: 1rem;
  font-size: 3rem;
  color: #adb5bd;
}

.error-state p,
.empty-state p {
  margin: 1rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: linear-gradient(135deg, #004aad 0%, #00c2cb 100%);
  color: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.2);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

/* Messages List */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.load-more {
  padding: 1rem 0;
  text-align: center;
}

.load-more-button {
  padding: 0.75rem 1.5rem;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  transition: all 0.2s ease;
}

.load-more-button:hover {
  background: #f8f9fa;
  border-color: #004aad;
  color: #004aad;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
}

/* Chat view styles */
.chat-view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-layout {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0;
  height: 100%;
  overflow: hidden;
}

.chat-messages-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e9ecef;
  background: white;
  overflow: hidden;
}

.chat-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: #6c757d;
}

.chat-empty-state p {
  margin: 0;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .chat-layout {
    grid-template-rows: auto 1fr;
  }
}

@media (max-width: 640px) {
  .chat-layout {
    grid-template-rows: auto 1fr;
  }

  .chat-messages-panel {
    border-top: 1px solid #e9ecef;
  }
}
</style>
