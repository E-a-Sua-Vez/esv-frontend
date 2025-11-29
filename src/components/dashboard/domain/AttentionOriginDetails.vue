<script>
export default {
  name: 'AttentionOriginDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distribution: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {
    npsScorePercentage(total, tag) {
      return parseFloat(((this.distribution[tag] * 100) / total).toFixed(2), 2) || 0;
    },
  },
};
</script>

<template>
  <div v-if="show" class="notification-details">
    <div v-if="Object.keys(distribution).length > 0" class="notification-grid">
      <div
        class="notification-item"
        v-for="(origin, index) in Object.keys(distribution)"
        :key="origin"
      >
        <div class="notification-icon-container icon-blue">
          <i :class="`bi bi-${index + 1}-circle-fill`"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t(`origin.${origin}`) }}</div>
          <div class="notification-value">{{ distribution[origin] || 0 }}</div>
          <div class="notification-percentage">{{ npsScorePercentage(count, origin) }}%</div>
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
