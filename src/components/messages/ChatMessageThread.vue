<template>
  <div class="chat-thread">
    <!-- Header -->
    <div class="thread-header">
      <div class="header-info">
        <div class="participant-avatar">
          <i class="bi bi-person-circle"></i>
        </div>
        <div class="participant-details">
          <h3>{{ participantName }}</h3>
          <span class="participant-type">{{ participantType }}</span>
        </div>
      </div>
    </div>

    <!-- Messages Container -->
    <div class="chat-messages-container" ref="messagesContainer">
      <div class="messages-list">
        <!-- Date Separator -->
        <div
          v-for="(group, date) in groupedMessages"
          :key="date"
          class="message-group"
        >
          <div class="date-separator">
            <span>{{ formatDate(date) }}</span>
          </div>

          <!-- Messages -->
          <div
            v-for="message in group"
            :key="message.id"
            class="message-wrapper"
            :class="{ 'sent': isSentByMe(message), 'received': !isSentByMe(message) }"
          >
            <div class="message-bubble">
              <p class="message-content">{{ message.content }}</p>
              <div class="message-meta">
                <span class="message-time">{{ formatMessageTime(message.createdAt) }}</span>
                <span v-if="isSentByMe(message)" class="message-status">
                  <i
                    v-if="message.status === 'read'"
                    class="bi bi-check2-all"
                    :class="{ read: true }"
                    :title="$t('chat.status.read')"
                  ></i>
                  <i
                    v-else-if="message.read"
                    class="bi bi-check2-all"
                    :title="$t('chat.status.delivered')"
                  ></i>
                  <i
                    v-else
                    class="bi bi-check2"
                    :title="$t('chat.status.sent')"
                  ></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="thread-input">
      <ChatInput @send="handleSend" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import ChatInput from './ChatInput.vue';

const props = defineProps({
  conversation: {
    type: Object,
    required: true,
  },
  messages: {
    type: Array,
    default: () => [],
  },
  currentUserId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['send', 'markRead']);

const { t } = useI18n();
const messagesContainer = ref(null);

const participantName = computed(() => {
  console.log('[ChatMessageThread] participantName debug:', {
    conversation: props.conversation,
    lastMessageSenderId: props.conversation?.lastMessageSenderId,
    participants: props.conversation?.participants,
    currentUserId: props.currentUserId
  });

  // Intentar usar lastMessageSenderId si tiene información del usuario
  if (props.conversation?.lastMessageSenderId) {
    const sender = props.conversation.lastMessageSenderId;
    console.log('[ChatMessageThread] Processing sender:', sender);
    if (typeof sender === 'object' && sender !== null) {
      const senderId = sender.id || sender.userId || sender.uid;
      const name = sender.email || sender.name || sender.displayName;
      // Usar lastMessageSender solo si es el otro usuario
      if (name && senderId && senderId !== props.currentUserId) {
        return name;
      }
    }
  }

  // Fallback: usar participants array
  if (props.conversation?.participants?.length > 0) {
    const other = props.conversation.participants.find(
      p => (p.userId || p.id) !== props.currentUserId
    );
    console.log('[ChatMessageThread] Found other participant:', other);
    return (
      other?.userName ||
      other?.name ||
      other?.email ||
      other?.displayName ||
      other?.userId ||
      other?.id ||
      t('chat.unknownUser')
    );
  }

  return t('chat.unknownUser');
});

const participantType = computed(() => {
  if (!props.conversation?.participants) return '';

  const other = props.conversation.participants.find(
    p => (p.userId || p.id) !== props.currentUserId
  );

  const typeMap = {
    master: t('chat.userType.master'),
    administrator: t('chat.userType.administrator'),
    business: t('chat.userType.business'),
    collaborator: t('chat.userType.collaborator'),
  };

  return typeMap[other?.userType || other?.type] || '';
});

const groupedMessages = computed(() => {
  const groups = {};

  props.messages.forEach((message) => {
    const date = message.createdAt?.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
    const dateKey = date.toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(message);
  });

  return groups;
});

const isSentByMe = (message) => {
  let senderId;

  // Si senderId es objeto, extraer id
  if (typeof message.senderId === 'object' && message.senderId !== null) {
    senderId = message.senderId.id;
  } else {
    senderId = message.senderId;
  }

  const result = senderId === props.currentUserId;

  // Log para debug (remover después)
  console.log('[ChatMessageThread] isSentByMe:', {
    senderId,
    currentUserId: props.currentUserId,
    result,
  });

  return result;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t('chat.time.today');
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return t('chat.time.yesterday');
  }

  return date.toLocaleDateString();
};

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const handleSend = (content) => {
  emit('send', content);

  // Scroll to bottom after sending
  nextTick(() => {
    scrollToBottom();
  });
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Watch for new messages and scroll
watch(() => props.messages.length, () => {
  nextTick(() => {
    scrollToBottom();
  });
});

// Scroll on mount
watch(() => props.conversation?.id, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { immediate: true });
</script>

<style scoped>
.chat-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.thread-header {
  padding: 0.75rem 1rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.participant-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 50%;
  color: #6c757d;
  font-size: 1.375rem;
}

.participant-details h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #212529;
}

.participant-type {
  font-size: 0.75rem;
  color: #6c757d;
}

.chat-messages-container {
  flex: 1;
  overflow-y: auto;
  background: #f8f9fa;
  padding: 1.5rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-separator {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.date-separator span {
  padding: 0.375rem 0.875rem;
  background: #e9ecef;
  color: #6c757d;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.message-wrapper {
  display: flex;
  margin-bottom: 0.5rem;
}

.message-wrapper.sent {
  justify-content: flex-end;
}

.message-wrapper.received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 65%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  position: relative;
}

.sent .message-bubble {
  background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.received .message-bubble {
  background: white;
  color: #212529;
  border-bottom-left-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-content {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  line-height: 1.3;
  word-wrap: break-word;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
}

.message-time {
  font-size: 0.625rem;
  opacity: 0.7;
}

.message-status {
  display: flex;
  align-items: center;
}

.message-status i {
  font-size: 0.875rem;
}

.message-status i.read {
  color: #00d9ff;
}

.thread-input {
  padding: 0.75rem 1rem;
  background: white;
  border-top: 1px solid #e9ecef;
}

/* Scroll styling */
.chat-messages-container::-webkit-scrollbar {
  width: 6px;
}

.chat-messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages-container::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 3px;
}

.chat-messages-container::-webkit-scrollbar-thumb:hover {
  background: #adb5bd;
}
</style>
