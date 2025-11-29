<script>
export default {
  name: 'AttentionNPSDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    score: { type: Array, default: [] },
    distribution: { type: Object, default: {} },
    limit: { type: Number, default: 10 },
  },
  data() {
    return {};
  },
  methods: {
    clasifyNpsComment(score) {
      if (!score) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (score <= 5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (score <= 8) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    },
    getIcon(score) {
      if (!score) {
        return 'bi-emoji-expressionless-fill';
      } else if (score <= 5) {
        return 'bi-emoji-frown-fill';
      } else if (score <= 8) {
        return 'bi-emoji-neutral-fill';
      } else {
        return 'bi-emoji-smile-fill';
      }
    },
    getIconClass(score) {
      if (!score) {
        return 'icon-blue';
      } else if (score <= 5) {
        return 'icon-red';
      } else if (score <= 8) {
        return 'icon-yellow';
      } else {
        return 'icon-green';
      }
    },
    npsScorePercentage(total, score) {
      return parseFloat((score * 100) / total, 2) || 0;
    },
    getPercentage(avg) {
      return parseFloat(avg.toFixed(2), 2) || 0;
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

    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-emoji-frown-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.detractor') }}</div>
          <div class="notification-value">
            {{ distribution.detractors ? distribution.detractors.counter : 0 }}
          </div>
          <div class="notification-percentage">
            {{ getPercentage(distribution.detractors ? distribution.detractors.avg : 0) }}%
          </div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-yellow">
          <i class="bi bi-emoji-neutral-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.neutral') }}</div>
          <div class="notification-value">
            {{ distribution.neutrals ? distribution.neutrals.counter : 0 }}
          </div>
          <div class="notification-percentage">
            {{ getPercentage(distribution.neutrals ? distribution.neutrals.avg : 0) }}%
          </div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-emoji-smile-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.promoter') }}</div>
          <div class="notification-value">
            {{ distribution.promoters ? distribution.promoters.counter : 0 }}
          </div>
          <div class="notification-percentage">
            {{ getPercentage(distribution.promoters ? distribution.promoters.avg : 0) }}%
          </div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="progress-container">
      <div class="modern-progress">
        <div
          class="progress-segment progress-detractor"
          :style="`width: ${npsScorePercentage(
            count,
            distribution.detractors ? distribution.detractors.counter : 0
          )}%`"
        >
          <span
            v-if="
              npsScorePercentage(
                count,
                distribution.detractors ? distribution.detractors.counter : 0
              ) > 5
            "
            class="progress-label"
          >
            {{ distribution.detractors ? distribution.detractors.counter : 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-neutral"
          :style="`width: ${npsScorePercentage(
            count,
            distribution.neutrals ? distribution.neutrals.counter : 0
          )}%`"
        >
          <span
            v-if="
              npsScorePercentage(count, distribution.neutrals ? distribution.neutrals.counter : 0) >
              5
            "
            class="progress-label"
          >
            {{ distribution.neutrals ? distribution.neutrals.counter : 0 }}
          </span>
        </div>
        <div
          class="progress-segment progress-promoter"
          :style="`width: ${npsScorePercentage(
            count,
            distribution.promoters ? distribution.promoters.counter : 0
          )}%`"
        >
          <span
            v-if="
              npsScorePercentage(
                count,
                distribution.promoters ? distribution.promoters.counter : 0
              ) > 5
            "
            class="progress-label"
          >
            {{ distribution.promoters ? distribution.promoters.counter : 0 }}
          </span>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>
    <div v-if="score.length > 0" class="notification-grid">
      <div
        class="notification-item"
        v-for="scoreItem in score.slice(0, limit)"
        :key="scoreItem.nps"
      >
        <div class="notification-icon-container" :class="getIconClass(scoreItem.nps)">
          <i :class="`bi ${getIcon(scoreItem.nps)}`"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">NPS {{ scoreItem.nps }}</div>
          <div class="notification-value">{{ scoreItem.counter || 0 }}</div>
          <div class="notification-percentage">
            {{ npsScorePercentage(count, scoreItem.counter) }}%
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-data-section">
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

.progress-detractor {
  background: linear-gradient(135deg, #a52a2a 0%, #c0392b 100%);
}

.progress-neutral {
  background: linear-gradient(135deg, #f9c322 0%, #fac107 100%);
}

.progress-promoter {
  background: linear-gradient(135deg, #00c2cb 0%, #00c4cc 100%);
}

.progress-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
