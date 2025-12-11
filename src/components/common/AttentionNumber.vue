<script>
export default {
  name: 'AttentionNumber',
  props: {
    type: { type: String, default: 'primary' },
    number: { type: Number, default: 0 },
    data: { type: Object, default: {} },
    attention: { type: Object, default: null },
    showData: { type: Boolean, default: true },
    toList: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
      elapsedTime: null,
      elapsedInterval: null,
    };
  },
  mounted() {
    if (this.attention && this.attention.createdDate) {
      this.updateElapsedTime();
      this.elapsedInterval = setInterval(() => {
        this.updateElapsedTime();
      }, 60000); // Update every minute
    }
  },
  beforeUnmount() {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
    }
  },
  methods: {
    hasData() {
      return Object.keys(this.data).length > 0 || false;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    colorNumberToShow() {
      return this.type === 'primary'
        ? 'color-primary'
        : this.type === 'no-device'
        ? 'color-nodevice'
        : 'color-secondary';
    },
    colorDetailToShow() {
      return this.type === 'primary'
        ? 'color-primary-reverse'
        : this.type === 'no-device'
        ? 'color-nodevice-reverse'
        : 'color-secondary-reverse';
    },
    identifier() {
      return this.data.name || this.data.idNumber || undefined;
    },
    getCardTypeClass() {
      if (this.type === 'primary') return 'attention-card-primary';
      if (this.type === 'no-device') return 'attention-card-nodevice';
      return 'attention-card-secondary';
    },
    updateElapsedTime() {
      if (!this.attention) {
        this.elapsedTime = null;
        return;
      }
      const createdDate = this.attention.createdDate || this.attention.createdAt;
      if (!createdDate) {
        this.elapsedTime = null;
        return;
      }
      const created = new Date(createdDate);
      const now = new Date();
      const diffMs = now - created;
      this.elapsedTime = diffMs;
    },
    getElapsedTimeMinutes() {
      if (!this.elapsedTime) return 0;
      return Math.floor(this.elapsedTime / (1000 * 60));
    },
    getElapsedTimeHours() {
      if (!this.elapsedTime) return 0;
      return Math.floor(this.elapsedTime / (1000 * 60 * 60));
    },
    getElapsedTimeDisplay() {
      if (!this.elapsedTime) return '';
      const minutes = this.getElapsedTimeMinutes();
      const hours = this.getElapsedTimeHours();
      if (minutes < 60) {
        return `${minutes} min`;
      } else if (hours < 24) {
        return `${hours}h ${minutes % 60}min`;
      } else {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
      }
    },
    getTimeStatusClass() {
      if (!this.elapsedTime) return 'time-status-neutral';
      const minutes = this.getElapsedTimeMinutes();
      if (minutes < 10) return 'time-status-excellent';
      if (minutes < 60) return 'time-status-good';
      if (minutes < 180) return 'time-status-warning';
      return 'time-status-poor';
    },
    getTimeStatusColor() {
      if (!this.elapsedTime) return '#a9a9a9';
      const minutes = this.getElapsedTimeMinutes();
      if (minutes < 10) return '#00c2cb';
      if (minutes < 60) return '#f9c322';
      if (minutes < 180) return '#ff9800';
      return '#a52a2a';
    },
    getCreationTime() {
      if (!this.attention) return '';
      const createdDate = this.attention.createdDate || this.attention.createdAt;
      if (!createdDate) return '';
      const date = new Date(createdDate);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    },
    hasAttentionDate() {
      if (!this.attention) return false;
      return !!(this.attention.createdDate || this.attention.createdAt);
    },
  },
};
</script>

<template>
  <div class="attention-card-modern" :class="getCardTypeClass()">
    <div class="attention-card-main">
      <div class="attention-card-content">
        <div class="attention-number-section">
          <div
            v-if="identifier() !== undefined"
            class="attention-name-badge-overlay"
          >
            <div class="attention-name-icon">
              <i class="bi bi-person-circle"></i>
            </div>
            <span class="attention-name-text">{{ identifier() }}</span>
          </div>
          <div
            v-if="number"
            class="attention-number-modern"
            :class="colorNumberToShow()"
          >
            {{ number }}
          </div>
          <div
            v-if="showData && hasData()"
            class="attention-card-toggle"
            :class="colorDetailToShow()"
            data-bs-toggle="collapse"
            :href="`#user-data-${number}`"
            @click.prevent="showDetails()"
          >
            <i
              class="bi"
              :class="`${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
            ></i>
          </div>
        </div>
      </div>
    </div>
    <div
      :id="`#user-data-${number}`"
      :class="`collapse ${extendedEntity ? 'show' : ''} attention-card-details`"
    >
        <div class="user-details-compact">
          <div class="user-details-header">
            <span class="user-details-title">{{ $t('attentionNumber.details.title') }}</span>
          </div>
        <div class="user-details-items">
          <div class="user-detail-row" v-if="data.name || data.lastName">
            <div class="user-detail-item" v-if="data.name">
              <div class="user-detail-icon-wrapper">
                <i class="bi bi-person"></i>
              </div>
              <div class="user-detail-content">
                <span class="user-detail-label">{{ $t('attentionNumber.details.name') }}</span>
                <span class="user-detail-value">{{ data.name }}</span>
              </div>
            </div>
            <div class="user-detail-item" v-if="data.lastName">
              <div class="user-detail-icon-wrapper">
                <i class="bi bi-person-badge"></i>
              </div>
              <div class="user-detail-content">
                <span class="user-detail-label">{{ $t('attentionNumber.details.lastName') }}</span>
                <span class="user-detail-value">{{ data.lastName }}</span>
              </div>
            </div>
          </div>
          <div class="user-detail-item" v-if="data.idNumber">
            <div class="user-detail-icon-wrapper">
              <i class="bi bi-person-vcard"></i>
            </div>
            <div class="user-detail-content">
              <span class="user-detail-label">{{ $t('attentionNumber.details.idNumber') }}</span>
              <span class="user-detail-value">{{ data.idNumber }}</span>
            </div>
          </div>
            <div class="user-detail-item" v-if="data.phone">
              <div class="user-detail-icon-wrapper user-detail-icon-phone">
                <i class="bi bi-whatsapp"></i>
              </div>
              <div class="user-detail-content">
                <span class="user-detail-label">{{ $t('attentionNumber.details.phone') }}</span>
                <a :href="`https://wa.me/${data.phone.replace(/\D/g, '')}`" target="_blank" class="user-detail-value user-detail-link">{{ data.phone }}</a>
              </div>
            </div>
          <div class="user-detail-item" v-if="data.email">
            <div class="user-detail-icon-wrapper user-detail-icon-email">
              <i class="bi bi-envelope"></i>
            </div>
            <div class="user-detail-content">
              <span class="user-detail-label">{{ $t('attentionNumber.details.email') }}</span>
              <a :href="`mailto:${data.email}`" class="user-detail-value user-detail-link">{{ data.email }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Attention Card - Dashboard Style */
.attention-card-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  margin: 0.5rem 0;
  width: 100%;
}

.attention-card-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.attention-card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.attention-card-modern:hover::before {
  opacity: 0.6;
}

.attention-card-primary {
  border-left: 3px solid var(--verde-tu);
}

.attention-card-primary:hover {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.05) 0%, rgba(0, 194, 203, 0.02) 100%);
}

.attention-card-secondary {
  border-left: 3px solid var(--gris-default);
}

.attention-card-nodevice {
  border-left: 3px solid var(--orange-no-device);
}

.attention-card-nodevice:hover {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%);
}

.attention-card-main {
  padding: 0.75rem 1rem;
}

.attention-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: stretch;
}

.attention-number-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
}

.attention-name-badge-overlay {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.95) 0%, rgba(0, 194, 203, 0.95) 100%);
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12), 0 0 0 1.5px rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.attention-name-badge-overlay:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(255, 255, 255, 0.4);
}

.attention-name-badge-overlay .attention-name-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.95);
  flex-shrink: 0;
}

.attention-name-badge-overlay .attention-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  color: rgba(255, 255, 255, 0.95);
}

.attention-number-modern {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 900;
  font-size: 2.75rem;
  line-height: 1;
  text-align: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
  min-width: 100px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.attention-card-modern:hover .attention-number-modern {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.attention-card-toggle {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  opacity: 0.8;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.attention-card-toggle:hover {
  transform: translateY(-50%) scale(1.1);
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.attention-card-toggle i {
  font-size: 1rem;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.attention-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  margin-top: 0.25rem;
}

.attention-stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.attention-stat-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.attention-stat-item i {
  font-size: 0.85rem;
  opacity: 0.7;
}

.attention-stat-label {
  color: rgba(0, 0, 0, 0.6);
}

.attention-stat-value {
  color: rgba(0, 0, 0, 0.8);
  font-weight: 700;
}

.time-status-excellent {
  background: rgba(0, 194, 203, 0.1);
  border: 1px solid rgba(0, 194, 203, 0.2);
}

.time-status-excellent .attention-stat-value {
  color: #00c2cb;
}

.time-status-good {
  background: rgba(249, 195, 34, 0.1);
  border: 1px solid rgba(249, 195, 34, 0.2);
}

.time-status-good .attention-stat-value {
  color: #f9c322;
}

.time-status-warning {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.time-status-warning .attention-stat-value {
  color: #ff9800;
}

.time-status-poor {
  background: rgba(165, 42, 42, 0.1);
  border: 1px solid rgba(165, 42, 42, 0.2);
}

.time-status-poor .attention-stat-value {
  color: #a52a2a;
}

.attention-card-details {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.4s ease-out, padding 0.4s ease-out;
}

.attention-card-details.show {
  max-height: 600px;
  padding: 0 1.25rem 1rem 1.25rem;
}

/* Color Classes */
.color-primary {
  color: var(--verde-tu);
  background-color: var(--color-background);
  border: 1.5px solid var(--verde-tu);
}

.color-secondary {
  color: var(--gris-default);
  background-color: var(--color-background);
  border: 1px solid var(--gris-default);
}

.color-nodevice {
  color: var(--orange-no-device);
  background-color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}

.color-primary-reverse {
  background-color: var(--verde-tu);
  color: var(--color-background);
  border: 1.5px solid var(--verde-tu);
}

.color-secondary-reverse {
  color: var(--color-background);
  background-color: var(--gris-default);
  border: 1px solid var(--gris-default);
}

.color-nodevice-reverse {
  background-color: var(--orange-no-device);
  color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}

/* Legacy classes for backward compatibility */
.attention-identifier {
  width: 60%;
  padding: 0.1rem 1rem;
  margin: 0;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.8rem;
}

.attention-identifier-list {
  margin-bottom: -2rem;
  padding: 0rem 1.5rem 0rem 1.5rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.7rem;
}

.attention-number {
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  padding: 1rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 2.8rem;
  line-height: 2rem;
}

.attention-number-list {
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  padding: 0.3rem;
  padding-bottom: 0.5rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1.5rem;
}

/* Compact User Details - Similar to health-score-item */
.user-details-compact {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 0.5rem;
  transition: all 0.3s ease;
}

.user-details-header {
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.user-details-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

.user-details-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.user-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.4rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.user-detail-item:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: translateX(2px);
}

.user-detail-icon-wrapper {
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.user-detail-icon-wrapper i {
  font-size: 0.8rem;
}

.user-detail-icon-phone {
  background: rgba(37, 211, 102, 0.15);
  color: #25d366;
}

.user-detail-icon-email {
  background: rgba(249, 195, 34, 0.1);
  color: #f9c322;
}

.user-detail-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 0;
}

.user-detail-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  align-items: stretch;
}

.user-detail-row .user-detail-item {
  flex: 1;
  margin: 0;
}

.user-detail-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.user-detail-value {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.8);
  line-height: 1.3;
  word-break: break-word;
}

.user-detail-link {
  color: #004aad;
  text-decoration: none;
  transition: color 0.2s ease;
}

.user-detail-link:hover {
  color: #00c2cb;
  text-decoration: underline;
}

.user-detail-item .user-detail-icon-phone + .user-detail-content .user-detail-link {
  color: #25d366;
}

.user-detail-item .user-detail-icon-phone + .user-detail-content .user-detail-link:hover {
  color: #128c7e;
}

/* Responsive */
@media (max-width: 576px) {
  .user-details-compact {
    padding: 0.5rem;
    margin: 0.25rem;
  }

  .user-detail-item {
    padding: 0.4rem;
    gap: 0.5rem;
  }

  .user-detail-value {
    font-size: 0.8rem;
  }
}
</style>
