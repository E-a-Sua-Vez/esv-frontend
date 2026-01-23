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
import { computed } from 'vue';
import { useMessageInbox } from '@/composables/useMessageInbox';

const emit = defineEmits(['toggle-inbox']);

// Solo mensajes, sin chats
const { unreadCount: notificationsUnread, unreadByPriority } = useMessageInbox();

// Solo conteo de notificaciones/mensajes (sin chats)
const unreadCount = computed(() => notificationsUnread.value);

const hasUrgent = computed(() => unreadByPriority.value.urgent > 0);
const hasHigh = computed(() => unreadByPriority.value.high > 0);

const displayCount = computed(() => (unreadCount.value > 99 ? '99+' : unreadCount.value));

const badgeClass = computed(() => {
  if (hasUrgent.value) return 'badge-urgent';
  if (hasHigh.value) return 'badge-high';
  return 'badge-normal';
});

function toggleInbox() {
  emit('toggle-inbox');
}
</script>

<style scoped>
.message-notification-badge {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-bell-button {
  position: relative;
  width: 42px;
  height: 42px;
  border: none;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b35 100%);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
}

.message-bell-button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 16px rgba(255, 140, 0, 0.4);
}

.message-bell-button:active {
  transform: translateY(0) scale(0.98);
}

.message-bell-button i {
  font-size: 1.25rem;
}

.message-bell-button.has-notifications i {
  animation: bellRing 2s ease-in-out infinite;
}

.message-bell-button.urgent-pulse {
  background: linear-gradient(135deg, #ff4757 0%, #dc3545 100%);
  animation: urgentPulse 1.5s ease-in-out infinite;
}

@keyframes bellRing {
  0%,
  10%,
  20%,
  100% {
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
  0%,
  100% {
    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(220, 53, 69, 0.6);
  }
}

/* Notification badge */
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: badgeAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.badge-urgent {
  background: #dc3545;
}

.badge-high {
  background: #ff6348;
}

.badge-normal {
  background: #dc3545;
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
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  pointer-events: none;
}

.pulse-ring.badge-urgent {
  border: 3px solid #dc3545;
}

.pulse-ring.badge-high {
  border: 3px solid #ff6348;
}

.pulse-ring.badge-normal {
  border: 3px solid #ff8c00;
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
  .message-bell-button {
    width: 38px;
    height: 38px;
  }

  .message-bell-button i {
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
