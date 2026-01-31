<template>
  <div>
    <div v-if="loading" class="d-flex justify-content-center p-3">
      <Spinner :show="true" />
    </div>
    <div v-else-if="packageInfo">
      <div class="choose-attention py-2 mb-2">
        <i class="bi bi-list-check h5 m-1"></i>
        <span class="fw-bold h6">{{ $t('attentionCreation.packageReminder') || 'Package Reminder' }}</span>
      </div>
      <div class="detailed-data">
        <!-- Package Overview Section -->
        <div class="info-section compact-section">
          <div class="info-section-header-compact">
            <i class="bi bi-box-seam-fill"></i>
            <span class="info-section-title-compact">Resumo do Pacote</span>
          </div>
          <div class="package-overview-grid">
            <!-- Package Details Card -->
            <div class="package-stat-card">
              <div class="stat-card-header">
                <i class="bi bi-tag-fill"></i>
                <span class="stat-card-label">{{ $t('attentionCreation.packageName') || 'Package Name' }}</span>
              </div>
              <div class="stat-card-value">{{ packageInfo.name || 'N/A' }}</div>
              <div class="stat-card-details">
                <div class="detail-item">
                  <i class="bi bi-calendar-check"></i>
                  <span class="detail-label">{{ $t('attentionCreation.lastSession') || 'Last Session' }}:</span>
                  <span class="detail-value">{{ packageInfo.lastAttentionDate ? formatDate(packageInfo.lastAttentionDate) : 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <i class="bi bi-calendar-event"></i>
                  <span class="detail-label">{{ $t('attentionCreation.nextExpected') || 'Next Expected' }}:</span>
                  <span class="detail-value">{{ packageInfo.nextExpectedDate ? formatDate(packageInfo.nextExpectedDate) : 'N/A' }}</span>
                </div>
              </div>
            </div>
            <!-- Sessions Progress Card -->
            <div class="package-stat-card">
              <div class="stat-card-header">
                <i class="bi bi-graph-up-arrow"></i>
                <span class="stat-card-label">{{ $t('attentionCreation.sessionsUsed') || 'Sessions' }}</span>
              </div>
              <div class="stat-card-value">
                <span class="stat-number">{{ sessionsUsed }}</span>
                <span class="stat-separator">/</span>
                <span class="stat-number">{{ packageInfo.totalSessions || 0 }}</span>
              </div>
              <div class="stat-card-progress">
                <div class="progress-bar-full">
                  <div class="progress-bar-fill" :style="{ width: progressPercentage + '%', backgroundColor: 'rgb(0, 194, 203)' }"></div>
                </div>
              </div>
              <div class="stat-card-footer">
                <span class="stat-footer-text">{{ packageInfo.sessionsRemaining || 0 }} Sessões Restantes</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Alert Message -->
        <div class="alert alert-info" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ $t('attentionCreation.packageBookingNote') || 'This booking will be made within your active package. If you agree, press Continue.' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Spinner from '../common/Spinner.vue';

export default {
  name: 'PackageReminderCard',
  components: {
    Spinner,
  },
  props: {
    packageInfo: {
      type: Object,
      required: false,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    sessionsUsed() {
      return (this.packageInfo.totalSessions || 0) - (this.packageInfo.sessionsRemaining || 0);
    },
    progressPercentage() {
      const total = this.packageInfo.totalSessions || 0;
      const used = this.sessionsUsed;
      return total > 0 ? Math.round((used / total) * 100) : 0;
    },
  },
  methods: {
    formatDate(date) {
      if (!date || isNaN(new Date(date).getTime())) return 'N/A';
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(date));
    },
  },
};
</script>

<style scoped>
.package-details .row {
  margin-bottom: 0.25rem;
}

.alert-info {
  background-color: #d1ecf1;
  border-color: #bee5eb;
  color: #0c5460;
  font-size: 0.875rem;
  line-height: 1.25;
}

/* New styles for improved design */
.detailed-data {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
  min-height: 350px;
}

.info-section {
  margin-bottom: 16px;
}

.compact-section {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #495057;
}

.info-section-header-compact i {
  margin-right: 8px;
  color: #6c757d;
}

.info-section-title-compact {
  font-size: 1rem;
}

.package-overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.package-stat-card {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.875rem;
  color: #6c757d;
}

.stat-card-header i {
  margin-right: 6px;
}

.stat-card-label {
  font-weight: 500;
}

.stat-card-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 8px;
}

.stat-number {
  color: #00c2cb;
}

.stat-separator {
  margin: 0 4px;
}

.stat-card-progress {
  margin-bottom: 8px;
}

.progress-bar-full {
  width: 100%;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.stat-card-footer {
  font-size: 0.75rem;
  color: #6c757d;
}

.stat-footer-text {
  font-weight: 500;
}

.stat-card-details {
  margin-top: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.875rem;
}

.detail-item i {
  margin-right: 6px;
  color: #6c757d;
  width: 16px;
}

.detail-label {
  font-weight: 500;
  color: #495057;
  margin-right: 4px;
}

.detail-value {
  color: #212529;
}
</style>