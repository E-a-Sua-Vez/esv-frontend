<template>
  <div class="chat-view">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <i class="bi bi-chat-dots"></i>
        <h1>{{ $t('chat.title') }}</h1>
      </div>
      <div class="header-actions">
        <button @click="openNewChat" class="btn-new-chat">
          <i class="bi bi-plus-circle"></i>
          {{ $t('chat.newChat') }}
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="chat-container">
      <!-- Conversations List (Left) -->
      <div class="conversations-panel">
        <ChatConversationList
          :conversations="conversations"
          :active-id="activeConversationId"
          :loading="loading"
          :current-user-id="currentUserId"
          @select="handleSelectConversation"
          @archive="handleArchiveConversation"
        />
      </div>

      <!-- Messages Thread (Right) -->
      <div class="messages-panel">
        <!-- Estado de carga global del chat -->
        <div v-if="loading || !currentUserId" class="empty-state">
          <i class="bi bi-arrow-repeat"></i>
          <p>{{ $t('chat.loadingConversations') }}</p>
        </div>

        <ChatMessageThread
          v-else-if="activeConversationId"
          :conversation="activeConversation"
          :messages="messages"
          :current-user-id="currentUserId"
          :my-user-ids="myUserIds"
          @send="handleSendMessage"
          @markRead="markMessageAsRead"
        />
        <div v-else class="empty-state">
          <i class="bi bi-chat-text"></i>
          <p>{{ $t('chat.selectConversation') }}</p>
        </div>
      </div>
    </div>

    <!-- Modal: New Chat -->
    <MessageComposer
      v-if="showNewChatModal"
      :is-open="showNewChatModal"
      :user-role="userRole"
      :user-data="userData"
      :chat-mode="true"
      @close="showNewChatModal = false"
      @sent="handleChatCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { globalStore } from '@/stores';
import { useChatConversations } from '@/composables/useChatConversations';
import ChatConversationList from '@/components/messages/ChatConversationList.vue';
import ChatMessageThread from '@/components/messages/ChatMessageThread.vue';
import MessageComposer from '@/components/messages/MessageComposer.vue';

const store = globalStore();

const {
  conversations,
  messages,
  activeConversationId,
  loading,
  currentUser,
  myUserIds,
  startConversationsListener,
  startMessagesListener,
  getOrCreateConversation,
  sendMessage,
  markConversationAsRead,
  archiveConversation,
  markMessageAsRead,
  getOtherParticipant,
  cleanup,
} = useChatConversations();

const showNewChatModal = ref(false);

const currentUserComputed = computed(() => store.getCurrentUser || {});
const currentUserId = computed(() => {
  const canonicalId = myUserIds?.value && myUserIds.value.length ? myUserIds.value[0] : null;
  return canonicalId || currentUser.value?.id || currentUserComputed.value?.id;
});
const userRole = computed(() => {
  const user = store.getCurrentUser;
  if (!user) return 'collaborator';
  if (user.master) return 'master';
  if (user.businessId) return 'administrator';
  return 'collaborator';
});
const userData = computed(() => {
  const user = store.getCurrentUser;
  return {
    id: user?.id,
    businessId: user?.businessId,
    commerceId: user?.commerceId,
    commercesId: user?.commercesId,
  };
});

const activeConversation = computed(() =>
  conversations.value.find(c => c.id === activeConversationId.value)
);

onMounted(() => {
  const user = store.getCurrentUser;
  if (user?.id) {
    const role = userRole.value;
    const commerceId = user.commerceId || user.commerce?.id;
    startConversationsListener(user.id, role, commerceId);
  }
});

onUnmounted(() => {
  cleanup();
});

const handleSelectConversation = async conversationId => {
  startMessagesListener(conversationId);

  // Marcar como leído
  setTimeout(() => {
    markConversationAsRead(conversationId);
  }, 1000);
};

const handleSendMessage = async content => {
  if (!activeConversation.value) return;

  const otherParticipant = getOtherParticipant(activeConversation.value);
  if (!otherParticipant) return;

  const user = store.getCurrentUser;
  const commerceId =
    activeConversation.value.commerceId ||
    activeConversation.value.commerce?.id ||
    user?.commerceId ||
    user?.commerce?.id ||
    null;

  const recipientType = otherParticipant.type || otherParticipant.userType || 'collaborator';

  try {
    await sendMessage(
      activeConversationId.value,
      content,
      otherParticipant.id,
      recipientType,
      commerceId
    );
  } catch (error) {
    console.error('[ChatView] Error sending message:', error);
  }
};

const handleArchiveConversation = async conversationId => {
  if (confirm('¿Estás seguro de que deseas archivar esta conversación?')) {
    await archiveConversation(conversationId);
  }
};

const openNewChat = () => {
  showNewChatModal.value = true;
};

const handleChatCreated = async data => {
  showNewChatModal.value = false;

  // Si se creó una conversación, seleccionarla
  if (data.conversationId) {
    handleSelectConversation(data.conversationId);
  }
};
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8f9fa;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left i {
  font-size: 1.5rem;
  color: #6f42c1;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #212529;
}

.btn-new-chat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-new-chat:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
}

.btn-new-chat i {
  font-size: 1rem;
}

.chat-container {
  display: grid;
  grid-template-columns: 380px 1fr;
  flex: 1;
  overflow: hidden;
}

.conversations-panel {
  background: white;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
}

.messages-panel {
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  gap: 1rem;
}

.empty-state i {
  font-size: 4rem;
  opacity: 0.3;
}

.empty-state p {
  font-size: 1.125rem;
  margin: 0;
}

@media (max-width: 968px) {
  .chat-container {
    grid-template-columns: 1fr;
  }

  .conversations-panel {
    display: none;
  }

  .messages-panel {
    display: flex;
  }
}
</style>
