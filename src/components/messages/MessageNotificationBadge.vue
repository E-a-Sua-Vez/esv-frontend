<template>
  <div class="message-notification-badge">
    <button
      class="message-bell-button"
      :class="{ 'has-notifications': unreadCount > 0, 'urgent-pulse': hasUrgent }"
      @click="toggleInbox"
      :aria-label="$t('messages.openInbox')"
    >
      <i class="bi bi-bell-fill"></i>
      <span v-if="unreadCount > 0" class="badge" :class="badgeClass">
        {{ displayCount }}
      </span>
      <span v-if="unreadCount > 0" class="pulse-ring" :class="badgeClass"></span>
    </button>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useMessageInbox } from '@/composables/useMessageInbox';
import { useChatConversations } from '@/composables/useChatConversations';
import { globalStore } from '@/stores';

const emit = defineEmits(['toggle-inbox']);

const store = globalStore();
const { unreadCount: notificationsUnread, unreadByPriority, chatUnreadCount: inboxChatUnread } = useMessageInbox();
const { startConversationsListener } = useChatConversations();
const listenerStarted = ref(false);

// Calcular mensajes no leídos de chat desde mensajes recibidos no leídos (inbox)
const chatUnreadCount = computed(() => inboxChatUnread?.value || 0);

// Total combinado de notificaciones + chat
const unreadCount = computed(() => {
  return notificationsUnread.value + chatUnreadCount.value;
});

const hasUrgent = computed(() => unreadByPriority.value.urgent > 0);
const hasHigh = computed(() => unreadByPriority.value.high > 0 || chatUnreadCount.value > 0);

const displayCount = computed(() => {
  return unreadCount.value > 99 ? '99+' : unreadCount.value;
});

const badgeClass = computed(() => {
  if (hasUrgent.value) return 'badge-urgent';
  if (hasHigh.value) return 'badge-high';
  return 'badge-normal';
});


function toggleInbox() {
  emit('toggle-inbox');
}

// Asegurar que el listener de conversaciones esté activo para que el conteo sea confiable
onMounted(() => {
  try {
    const user = store.getCurrentUser;
    if (user?.id) {
      const role = user.master ? 'master' : (user.businessId ? 'administrator' : 'collaborator');
      const commerceId = user.commerceId || user.commerce?.id;
      startConversationsListener(user.id, role, commerceId);
      listenerStarted.value = true;
      if (import.meta.env && import.meta.env.DEV) {
        console.log('[Badge] onMounted: startConversationsListener', { userId: user.id, role, commerceId });
      }
    }
  } catch {}
});

watch(() => store.getCurrentUser?.id, (newId) => {
  if (!listenerStarted.value && newId) {
    try {
      const user = store.getCurrentUser;
      const role = user.master ? 'master' : (user.businessId ? 'administrator' : 'collaborator');
      const commerceId = user.commerceId || user.commerce?.id;
      startConversationsListener(user.id, role, commerceId);
      listenerStarted.value = true;
      if (import.meta.env && import.meta.env.DEV) {
        console.log('[Badge] userId changed: startConversationsListener', { userId: user.id, role, commerceId });
      }
    } catch {}
  }
});

// Logs de conteos
watch(unreadCount, (val) => {
  if (import.meta.env && import.meta.env.DEV) {
    console.log('[Badge] unreadCount changed:', val, {
      notificationsUnread: notificationsUnread.value,
      chatUnreadCount: chatUnreadCount.value,
      urgent: unreadByPriority.value.urgent,
      high: unreadByPriority.value.high,
    });
  }
});
watch(chatUnreadCount, (val) => {
  if (import.meta.env && import.meta.env.DEV) {
    console.log('[Badge] chatUnreadCount changed:', val);
  }
});
</script>

<style scoped>
.message-notification-badge {
  position: relative;
  display: inline-block;
}

.message-bell-button {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-bell-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.message-bell-button:active {
  transform: translateY(0);
}

.message-bell-button i {
  font-size: 1.25rem;
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.message-bell-button.has-notifications i {
  animation: bellRing 2s ease-in-out infinite;
}

.message-bell-button.urgent-pulse {
  animation: urgentPulse 1.5s ease-in-out infinite;
}

@keyframes bellRing {
  0%, 10%, 20%, 100% {
    transform: rotate(0deg);
  }
  5% {
    transform: rotate(-15deg) scale(1.1);
  }
  15% {
    transform: rotate(15deg) scale(1.1);
  }
}

@keyframes urgentPulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(220, 53, 69, 0.6);
  }
}

/* Badge Styles */
.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  animation: badgePopIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  z-index: 10;
}

.badge-urgent {
  background: linear-gradient(135deg, #ff4757 0%, #dc3545 100%);
}

.badge-high {
  background: linear-gradient(135deg, #ffa502 0%, #ff6348 100%);
}

.badge-normal {
  background: linear-gradient(135deg, #00c2cb 0%, #004aad 100%);
}

@keyframes badgePopIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Pulse Ring Effect */
.pulse-ring {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  animation: pulseRing 2s ease-out infinite;
  pointer-events: none;
}

.pulse-ring.badge-urgent {
  border: 2px solid #ff4757;
}

.pulse-ring.badge-high {
  border: 2px solid #ffa502;
}

.pulse-ring.badge-normal {
  border: 2px solid #00c2cb;
}

@keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Dot indicator when there is recent chat activity but count is 0 */
.dot-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff6348;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
</style>
