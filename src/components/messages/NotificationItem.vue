<template>
  <div
    class="notification-card"
    :class="[{ unread: message.status === 'unread' }, `priority-${message.priority}`]"
    @click="handleClick"
  >
    <div class="card-accent" :class="`accent-${message.priority}`"></div>

    <div class="card-icon">
      <i :class="getCategoryIcon(message.category)"></i>
    </div>

    <div class="card-content">
      <div class="content-header">
        <h4 class="title">{{ message.title }}</h4>
        <span class="time">{{ formatTime(message.createdAt) }}</span>
      </div>

      <p v-if="message.senderId" class="sender">
        <i class="bi bi-person-circle"></i> {{ getSenderName() }}
      </p>

      <p class="message">{{ message.content }}</p>

      <div class="card-footer">
        <span class="category-tag">
          {{ $t(`messages.categories.${message.category}`) }}
        </span>
        <div class="actions">
          <button
            v-if="message.status === 'unread'"
            @click.stop="handleMarkAsRead"
            class="action-btn"
            :title="$t('messages.markAsRead')"
          >
            <i class="bi bi-check2"></i>
          </button>
          <button @click.stop="handleArchive" class="action-btn" :title="$t('messages.archive')">
            <i class="bi bi-archive"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMessageInbox } from '@/composables/useMessageInbox';

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['read', 'archive', 'click']);

const router = useRouter();
const { t } = useI18n();
const { markAsRead, archiveMessage } = useMessageInbox();

const categoryIcons = {
  STOCK: 'bi bi-box-seam',
  LOW_STOCK: 'bi bi-box',
  OUT_OF_STOCK: 'bi bi-exclamation-octagon',
  DIRECT_MESSAGE: 'bi bi-chat-dots',
  ANNOUNCEMENT: 'bi bi-megaphone',
  ATTENTION_REMINDER: 'bi bi-bell',
  BOOKING_REMINDER: 'bi bi-calendar-event',
  BOOKING_CONFIRMED: 'bi bi-calendar-check',
  BOOKING_CANCELLED: 'bi bi-calendar-x',
  PAYMENT_RECEIVED: 'bi bi-cash-coin',
  PAYMENT_PENDING: 'bi bi-clock-history',
  PAYMENT_OVERDUE: 'bi bi-exclamation-triangle',
  PLAN_EXPIRING: 'bi bi-hourglass-split',
  PLAN_EXPIRED: 'bi bi-hourglass-bottom',
  PLAN_UPGRADED: 'bi bi-arrow-up-circle',
  SURVEY_PENDING: 'bi bi-clipboard-check',
  DOCUMENT_AVAILABLE: 'bi bi-file-earmark-text',
  FORM_PENDING: 'bi bi-file-earmark-plus',
  SYSTEM_UPDATE: 'bi bi-arrow-repeat',
  FEATURE_ANNOUNCEMENT: 'bi bi-star',
  MAINTENANCE: 'bi bi-tools',
  TASK_ASSIGNED: 'bi bi-clipboard-plus',
  TASK_COMPLETED: 'bi bi-check-circle',
  TASK_OVERDUE: 'bi bi-clock',
  NOTIFICATION: 'bi bi-bell',
};

const getCategoryIcon = category => categoryIcons[category] || 'bi bi-info-circle';

const getSenderName = () => {
  if (!props.message.senderId) return '';

  // Si senderId es un objeto con información del remitente
  if (typeof props.message.senderId === 'object') {
    return (
      props.message.senderId.email ||
      props.message.senderId.name ||
      props.message.senderId.id ||
      t('messages.sender.unknown')
    );
  }

  // Si es solo un string, retornar el ID
  return props.message.senderId;
};

const formatTime = timestamp => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t('messages.time.justNow');
  if (minutes < 60) return t('messages.time.minutesAgo', { count: minutes });
  if (hours < 24) return t('messages.time.hoursAgo', { count: hours });
  if (days < 7) return t('messages.time.daysAgo', { count: days });

  return date.toLocaleDateString();
};

const handleMarkAsRead = async () => {
  try {
    await markAsRead(props.message.id);
    emit('read', props.message.id);
  } catch (error) {
    // Error handled silently
  }
};

const handleArchive = async () => {
  try {
    await archiveMessage(props.message.id);
    emit('archive', props.message.id);
  } catch (error) {
    // Error handled silently
  }
};

const handleClick = () => {
  if (props.message.status === 'unread') {
    handleMarkAsRead();
  }
  emit('click', props.message);

  if (props.message.metadata?.link) {
    router.push(props.message.metadata.link);
  }
};
</script>

<style scoped>
.notification-card {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
}

.notification-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.notification-card.unread {
  background: linear-gradient(to right, rgba(0, 194, 203, 0.04) 0%, white 100%);
  border-left: 3px solid #00c2cb;
}

/* Accent Bar */
.card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  transition: width 0.2s ease;
}

.card-accent.accent-urgent {
  background: linear-gradient(to bottom, #ff4757 0%, #dc3545 100%);
}

.card-accent.accent-high {
  background: linear-gradient(to bottom, #ffa502 0%, #ff6348 100%);
}

.card-accent.accent-normal {
  background: linear-gradient(to bottom, #00c2cb 0%, #004aad 100%);
}

.card-accent.accent-low {
  background: linear-gradient(to bottom, #adb5bd 0%, #6c757d 100%);
}

.notification-card:hover .card-accent {
  width: 6px;
}

/* Icon */
.card-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #495057;
  font-size: 1.15rem;
  transition: all 0.2s ease;
}

.priority-urgent .card-icon {
  background: linear-gradient(135deg, rgba(255, 71, 87, 0.1) 0%, rgba(220, 53, 69, 0.15) 100%);
  color: #dc3545;
}

.priority-high .card-icon {
  background: linear-gradient(135deg, rgba(255, 165, 2, 0.1) 0%, rgba(255, 99, 72, 0.15) 100%);
  color: #ff6348;
}

.priority-normal .card-icon {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.1) 0%, rgba(0, 74, 173, 0.15) 100%);
  color: #004aad;
}

.notification-card:hover .card-icon {
  transform: scale(1.1) rotate(5deg);
}

/* Content */
.card-content {
  flex: 1;
  min-width: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #212529;
  line-height: 1.3;
  flex: 1;
}

.time {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: #6c757d;
  font-weight: 500;
}

.sender {
  margin: 0 0 0.3rem 0;
  font-size: 0.7rem;
  color: #6c757d;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sender i {
  font-size: 0.75rem;
}

.message {
  margin: 0 0 0.6rem 0;
  font-size: 0.8rem;
  color: #495057;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Footer */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.category-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: #495057;
  background: #f8f9fa;
  border-radius: 0.375rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.2s ease;
}

.notification-card:hover .actions {
  opacity: 1;
  transform: translateX(0);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: #f8f9fa;
  color: #6c757d;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.action-btn:hover {
  background: #e9ecef;
  color: #004aad;
  transform: scale(1.1);
}

/* Priority Variants */
.priority-urgent {
  border-left-color: #dc3545;
}

.priority-high {
  border-left-color: #ff6348;
}

.priority-normal {
  border-left-color: #00c2cb;
}

.priority-low {
  border-left-color: #adb5bd;
}

/* Responsive */
@media (max-width: 480px) {
  .notification-card {
    padding: 0.75rem;
    gap: 0.625rem;
  }

  .card-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .title {
    font-size: 0.825rem;
  }

  .message {
    font-size: 0.75rem;
  }

  .time {
    font-size: 0.65rem;
  }

  .category-tag {
    font-size: 0.6rem;
  }
}
</style>
