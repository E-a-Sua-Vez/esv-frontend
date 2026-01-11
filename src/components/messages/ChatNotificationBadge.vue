<template>
  <div class="chat-notification-badge">
    <button
      class="chat-button"
      :class="{ 'has-notifications': badgeCount > 0 }"
      @click="toggleChatInbox"
      :aria-label="$t('chat.openInbox')"
    >
      <i class="bi bi-chat-dots-fill"></i>
      <span v-if="badgeCount > 0" class="badge">
        {{ displayCount }}
      </span>
      <span v-if="badgeCount > 0" class="pulse-ring"></span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useChatConversations } from '@/composables/useChatConversations';

const emit = defineEmits(['toggle-chat-inbox']);

// Usar el contador centralizado de chats no leídos del composable,
// que ya tiene en cuenta unreadCountByUser y todas las variantes de IDs.
const { totalUnreadChats } = useChatConversations();

const badgeCount = computed(() => {
  try {
    return totalUnreadChats.value || 0;
  } catch {
    return 0;
  }
});

const displayCount = computed(() => {
  return badgeCount.value > 99 ? '99+' : badgeCount.value;
});

const toggleChatInbox = () => {
  emit('toggle-chat-inbox');
};
</script>

<style scoped>
.chat-notification-badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-button {
  position: relative;
  width: 42px;
  height: 42px;
  border: none;
  background: linear-gradient(135deg, #00c2cb 0%, #004aad 100%);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.3);
}

.chat-button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 194, 203, 0.4);
}

.chat-button:active {
  transform: translateY(0) scale(0.98);
}

.chat-button i {
  font-size: 1.25rem;
}

/* Notification badge */
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #dc3545;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: badgeAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes badgeAppear {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Pulse ring */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #00c2cb;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .chat-button {
    width: 38px;
    height: 38px;
  }

  .chat-button i {
    font-size: 1.1rem;
  }

  .badge {
    min-width: 18px;
    height: 18px;
    font-size: 0.65rem;
    top: -3px;
    right: -3px;
  }
}
</style>
