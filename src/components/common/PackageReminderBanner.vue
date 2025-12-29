<script>
export default {
  name: 'PackageReminderBanner',
  props: {
    packageInfo: {
      type: Object,
      default: null,
      validator: value => {
        if (!value) return true;
        return value.id && value.name && value.currentSession && value.totalSessions;
      },
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<template>
  <div v-if="packageInfo && !loading" class="package-reminder-banner mb-4">
    <div class="package-reminder-card">
      <div class="package-reminder-header">
        <i class="bi bi-box-seam me-2"></i>
        <span class="package-reminder-title">{{
          $t('package.activePackageReminder') || 'Paquete Activo'
        }}</span>
      </div>
      <div class="package-reminder-content">
        <div class="package-reminder-main">
          <span class="package-reminder-label"
            >{{ $t('package.youHaveActivePackage') || 'Tienes un paquete activo' }}:</span
          >
          <span class="package-reminder-name">{{ packageInfo.name }}</span>
        </div>
        <div class="package-reminder-details">
          <span v-if="packageInfo.serviceName" class="package-reminder-service">
            <i class="bi bi-tags-fill me-1"></i>
            {{ packageInfo.serviceName }}
          </span>
          <span class="package-reminder-sessions">
            <i class="bi bi-calendar-check me-1"></i>
            {{ packageInfo.currentSession }}/{{ packageInfo.totalSessions }}
            <span v-if="packageInfo.sessionsRemaining !== undefined" class="package-reminder-hint">
              ({{ $t('package.sessionsRemaining') || 'sesiones restantes' }}:
              {{ packageInfo.sessionsRemaining }})
            </span>
          </span>
        </div>
        <small class="package-reminder-message">
          {{
            $t('package.scheduleRemainingSessions') ||
            'Recuerda agendar las sesiones restantes de tu paquete'
          }}
        </small>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Package Reminder Banner Styles */
.package-reminder-banner {
  animation: slideInUp 0.4s ease-out;
}

.package-reminder-card {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.1) 0%, rgba(0, 74, 173, 0.1) 100%);
  border: 1px solid rgba(0, 194, 203, 0.3);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.15);
  transition: all 0.2s ease;
}

.package-reminder-card:hover {
  box-shadow: 0 4px 12px rgba(0, 194, 203, 0.2);
  transform: translateY(-1px);
}

.package-reminder-header {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.15) 0%, rgba(0, 74, 173, 0.15) 100%);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 194, 203, 0.2);
}

.package-reminder-header i {
  color: #00c2cb;
  font-size: 1.1rem;
}

.package-reminder-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #00c2cb;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.package-reminder-content {
  padding: 1rem;
}

.package-reminder-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.package-reminder-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

.package-reminder-name {
  font-size: 1rem;
  font-weight: 700;
  color: #00c2cb;
}

.package-reminder-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0.5rem;
}

.package-reminder-service,
.package-reminder-sessions {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #212529;
  font-weight: 500;
}

.package-reminder-service i,
.package-reminder-sessions i {
  color: #00c2cb;
  font-size: 0.9rem;
}

.package-reminder-sessions {
  font-weight: 700;
  color: #00c2cb;
}

.package-reminder-hint {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 500;
  margin-left: 0.25rem;
}

.package-reminder-message {
  display: block;
  font-size: 0.8rem;
  color: #6c757d;
  font-style: italic;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 194, 203, 0.2);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .package-reminder-content {
    padding: 0.75rem;
  }

  .package-reminder-main {
    flex-direction: column;
    align-items: flex-start;
  }

  .package-reminder-details {
    padding: 0.5rem;
  }
}
</style>
