<script>
export default {
  name: 'AttentionCommentsDetails',
  props: {
    show: { type: Boolean, default: true },
    messages: { type: Array, default: undefined },
    distribution: { type: Object, default: {} },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    limit: { type: Number, default: 5 },
  },
  data() {
    return {};
  },
  methods: {
    clasifyScoredComment(messageScore) {
      if (!messageScore) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (messageScore < 0.1) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (messageScore < 0.5) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    },
    getIcon(messageScore) {
      if (!messageScore) {
        return 'bi-emoji-expressionless-fill';
      } else if (messageScore < 0.1) {
        return 'bi-emoji-frown-fill';
      } else if (messageScore < 0.5) {
        return 'bi-emoji-neutral-fill';
      } else {
        return 'bi-emoji-smile-fill';
      }
    },
    getIconClass(messageScore) {
      if (!messageScore) {
        return 'icon-blue';
      } else if (messageScore < 0.1) {
        return 'icon-red';
      } else if (messageScore < 0.5) {
        return 'icon-yellow';
      } else {
        return 'icon-green';
      }
    },
    wrapComment(comment) {
      if (!comment) {
        return 'No Data';
      } else if (comment.length > 30) {
        return comment.slice(0, 30) + '...';
      }
      return comment;
    },
  },
};
</script>

<template>
  <div v-if="show" class="notification-details">
    <div v-if="min && max" class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-arrow-down-circle-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.9') }}</div>
          <div class="notification-value">{{ min || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-arrow-up-circle-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.8') }}</div>
          <div class="notification-value">{{ max || 0 }}</div>
        </div>
      </div>
    </div>

    <div v-if="min && max" class="notification-divider"></div>

    <div v-if="distribution" class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-emoji-frown-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.detractor') }}</div>
          <div class="notification-value">{{ distribution.totalSentimentBad || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-yellow">
          <i class="bi bi-emoji-neutral-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.neutral') }}</div>
          <div class="notification-value">{{ distribution.totalSentimentNeutral || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-emoji-smile-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.promoter') }}</div>
          <div class="notification-value">{{ distribution.totalSentimentGood || 0 }}</div>
        </div>
      </div>
    </div>

    <div v-if="messages && messages.length > 0" class="notification-divider"></div>

    <div v-if="messages && messages.length > 0" class="notification-grid">
      <div class="notification-item" v-for="message in messages.slice(0, limit)" :key="message.id">
        <div class="notification-icon-container" :class="getIconClass(message.messageScore)">
          <i :class="`bi ${getIcon(message.messageScore)}`"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ wrapComment(message.message) }}</div>
          <div class="notification-value">{{ message.messageScore || 0 }}</div>
        </div>
      </div>
    </div>

    <div v-if="!messages || messages.length === 0" class="no-data-section">
      <i class="bi bi-inbox no-data-icon"></i>
      <span class="no-data-text">{{ 'No Data' }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Notification Details Style - matching AttentionNotificationDetails */
.notification-details {
  padding: 0;
}

.notification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
}

.notification-icon-container {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notification-icon-container i {
  font-size: 1.1rem;
}

.icon-blue {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.icon-green {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.icon-yellow {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.icon-red {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.icon-orange {
  background: rgba(222, 100, 37, 0.15);
  color: #de6425;
}

.notification-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.notification-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.notification-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
}

.notification-divider {
  height: 1px;
  background: rgba(169, 169, 169, 0.1);
  margin: 1rem 0;
}

/* No Data Section */
.no-data-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
}

.no-data-icon {
  font-size: 2rem;
  color: rgba(0, 0, 0, 0.2);
}

.no-data-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .notification-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .notification-item {
    padding: 0.5rem;
  }

  .notification-value {
    font-size: 1.1rem;
  }
}

@media (max-width: 576px) {
  .notification-grid {
    grid-template-columns: 1fr;
  }
}
</style>
