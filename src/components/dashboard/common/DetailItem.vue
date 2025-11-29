<script>
export default {
  name: 'DetailItem',
  props: {
    label: { type: String, default: '' },
    value: { type: [String, Number], default: 0 },
    icon: { type: String, default: '' },
    iconClass: { type: String, default: 'blue-icon' },
    size: { type: String, default: 'md' }, // sm, md, lg
  },
  methods: {
    formatValue(value) {
      if (value === undefined || value === null || value === '') {
        return 0;
      }
      if (typeof value === 'number') {
        return value.toLocaleString('de-DE');
      }
      return value;
    },
    getIconContainerClass() {
      if (this.iconClass.includes('green')) return 'icon-green';
      if (this.iconClass.includes('yellow')) return 'icon-yellow';
      if (this.iconClass.includes('red')) return 'icon-red';
      if (this.iconClass.includes('orange')) return 'icon-orange';
      if (this.iconClass.includes('blue')) return 'icon-blue';
      return 'icon-blue';
    },
  },
};
</script>

<template>
  <div class="notification-item">
    <div class="notification-icon-container" :class="getIconContainerClass()">
      <i :class="`bi ${icon}`"></i>
    </div>
    <div class="notification-content">
      <div class="notification-label">{{ label }}</div>
      <div class="notification-value">{{ formatValue(value) }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Notification Item Style - matching AttentionNotificationDetails */
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

/* Responsive */
@media (max-width: 768px) {
  .notification-item {
    padding: 0.5rem;
  }

  .notification-value {
    font-size: 1.1rem;
  }

  .notification-icon-container {
    width: 32px;
    height: 32px;
  }

  .notification-icon-container i {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .notification-item {
    padding: 0.5rem;
  }

  .notification-value {
    font-size: 1rem;
  }

  .notification-label {
    font-size: 0.7rem;
  }
}
</style>
