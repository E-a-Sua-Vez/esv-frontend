<script>
export default {
  name: 'AttentionNotificationDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 0 },
    booking: { type: [String, Number], default: 0 },
    waitlist: { type: [String, Number], default: 0 },
    channels: { type: Object, default: {} },
    types: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {},
};
</script>

<template>
  <div v-if="show" class="notification-details">
    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-whatsapp"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.10') }}</div>
          <div class="notification-value">{{ channels.WHATSAPP || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-envelope-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.11') }}</div>
          <div class="notification-value">{{ channels.EMAIL || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-blue">
          <i class="bi bi-qr-code"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.19') }}</div>
          <div class="notification-value">{{ count || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-orange">
          <i class="bi bi-calendar2-check-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.bookings') }}</div>
          <div class="notification-value">{{ booking || types.BOOKING || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-calendar-heart-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.waitlist') }}</div>
          <div class="notification-value">{{ waitlist || types.WAITLIST || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-blue">
          <i class="bi bi-5-circle-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.13') }}</div>
          <div class="notification-value">{{ types.FALTANCINCO || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-blue">
          <i class="bi bi-1-circle-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.14') }}</div>
          <div class="notification-value">{{ types.FALTAUNO || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-bell-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.15') }}</div>
          <div class="notification-value">{{ types.ESTUTURNO || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-blue">
          <i class="bi bi-star-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.12') }}</div>
          <div class="notification-value">{{ types.TUTURNO || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-yellow">
          <i class="bi bi-star-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.25') }}</div>
          <div class="notification-value">{{ types.ENCUESTA || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-orange">
          <i class="bi bi-calendar2-check-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.bookingsConfirm') }}</div>
          <div class="notification-value">{{ types.BOOKING_CONFIRM || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="notification-divider"></div>

    <div class="notification-grid">
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-x-circle-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.37') }}</div>
          <div class="notification-value">{{ types.ATTENTION_CANCELLED || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-red">
          <i class="bi bi-calendar2-x-fill"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.38') }}</div>
          <div class="notification-value">{{ types.BOOKING_CANCELLED || 0 }}</div>
        </div>
      </div>
      <div class="notification-item">
        <div class="notification-icon-container icon-green">
          <i class="bi bi-person-fill-check"></i>
        </div>
        <div class="notification-content">
          <div class="notification-label">{{ $t('dashboard.items.attentions.39') }}</div>
          <div class="notification-value">{{ types.BOOKING_COMMERCE_CONDITIONS || 0 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.notification-grid:last-of-type {
  margin-bottom: 0;
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
