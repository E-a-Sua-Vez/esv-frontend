<script>
export default {
  name: 'AttentionRatingDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: '' },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    score: { type: Object, default: {} },
    messages: { type: Array, default: [] },
    limit: { type: Number, default: 5 },
  },
  data() {
    return {};
  },
  methods: {
    clasifyRatedComment(messageScore) {
      if (!messageScore) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (messageScore < 2.5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (messageScore < 4) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
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
    scorePercentage(total, score) {
      return parseFloat(((score * 100) / total).toFixed(2), 2) || 0;
    },
  },
};
</script>

<template>
  <div v-if="show" class="notification-details">
    <div class="notification-grid">
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

    <div class="notification-divider"></div>
    <div v-if="messages.length > 0 && false">
      <div class="row mx-2" v-for="message in messages.slice(0, limit)" :key="message.id">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi ${clasifyRatedComment(message.rating)}`"> </i>
          <span class="col-8"> {{ wrapComment(message.message) }} </span>
          <span class="col-2 badge rounded-pill bg-secondary metric-card-subtitle">
            {{ message.rating || 'N/I' }}
          </span>
        </div>
        <hr />
      </div>
    </div>
    <div class="notification-grid">
      <div class="notification-item" v-for="index in 6" :key="index">
        <div class="notification-icon-container icon-yellow">
          <i class="bi bi-star-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">
            {{ 6 - index }} {{ $t('dashboard.stars') || 'Estrellas' }}
          </div>
          <div class="notification-value">{{ score[`totalRating${6 - index}`] || 0 }}</div>
          <div class="notification-percentage">
            {{ scorePercentage(count, score[`totalRating${6 - index}`]) }}%
          </div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="progress-container">
      <div class="modern-progress">
        <div
          class="progress-segment progress-rating-0"
          :style="`width: ${scorePercentage(count, score.totalRating0)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating0) > 5" class="progress-label">
            {{ score.totalRating0 || 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-rating-1"
          :style="`width: ${scorePercentage(count, score.totalRating1)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating1) > 5" class="progress-label">
            {{ score.totalRating1 || 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-rating-2"
          :style="`width: ${scorePercentage(count, score.totalRating2)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating2) > 5" class="progress-label">
            {{ score.totalRating2 || 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-rating-3"
          :style="`width: ${scorePercentage(count, score.totalRating3)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating3) > 5" class="progress-label">
            {{ score.totalRating3 || 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-rating-4"
          :style="`width: ${scorePercentage(count, score.totalRating4)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating4) > 5" class="progress-label">
            {{ score.totalRating4 || 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-rating-5"
          :style="`width: ${scorePercentage(count, score.totalRating5)}%`"
        >
          <span v-if="scorePercentage(count, score.totalRating5) > 5" class="progress-label">
            {{ score.totalRating5 || 0 }}
          </span>
        </div>
      </div>
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

.notification-percentage {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.notification-divider {
  height: 1px;
  background: rgba(169, 169, 169, 0.1);
  margin: 1rem 0;
}

/* Progress Bar */
.progress-container {
  margin-top: 0.5rem;
}

.modern-progress {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
  position: relative;
}

.progress-rating-0 {
  background: linear-gradient(135deg, #a52a2a 0%, #c0392b 100%);
}

.progress-rating-1 {
  background: linear-gradient(135deg, #de6425 0%, #e67e22 100%);
}

.progress-rating-2 {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.progress-rating-3 {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.progress-rating-4 {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.progress-rating-5 {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.progress-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
