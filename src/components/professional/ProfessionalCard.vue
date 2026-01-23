<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  professional: {
    type: Object,
    required: true,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['edit', 'view']);

const statusBadgeClass = computed(() => {
  if (!props.professional.active) return 'badge-danger';
  if (!props.professional.available) return 'badge-warning';
  return 'badge-success';
});

const statusText = computed(() => {
  if (!props.professional.active) return t('professionals.status.inactive');
  if (!props.professional.available) return t('professionals.status.unavailable');
  return t('professionals.status.active');
});

const professionalTypeLabel = computed(() => {
  const type = props.professional.professionalInfo?.professionalType;
  return type ? t(`professionals.types.${type}`) : '-';
});

const commissionLabel = computed(() => {
  const { commissionType, commissionValue } = props.professional.financialInfo || {};
  if (!commissionType || !commissionValue) return '-';

  if (commissionType === 'PERCENTAGE') {
    return `${commissionValue}%`;
  }
  return `$${commissionValue}`;
});
</script>

<template>
  <div class="professional-card">
    <div class="professional-card-header">
      <div class="professional-info">
        <div class="professional-avatar">
          <img
            v-if="professional.personalInfo?.profilePhoto"
            :src="professional.personalInfo.profilePhoto"
            :alt="professional.personalInfo?.name"
            class="avatar-img"
          />
          <i v-else class="bi bi-person-circle avatar-placeholder"></i>
        </div>
        <div class="professional-details">
          <h5 class="professional-name">{{ professional.personalInfo?.name || '-' }}</h5>
          <p class="professional-type">{{ professionalTypeLabel }}</p>
          <span class="badge" :class="statusBadgeClass">{{ statusText }}</span>
        </div>
      </div>
      <div v-if="showActions" class="professional-actions">
        <button
          class="btn btn-sm btn-outline-primary"
          @click="emit('view', professional)"
          :title="t('common.view')"
        >
          <i class="bi bi-eye"></i>
        </button>
        <button
          class="btn btn-sm btn-outline-secondary"
          @click="emit('edit', professional)"
          :title="t('common.edit')"
        >
          <i class="bi bi-pencil"></i>
        </button>
      </div>
    </div>
    <div class="professional-card-body">
      <div class="info-row">
        <span class="info-label">{{ t('professionals.email') }}:</span>
        <span class="info-value">{{ professional.personalInfo?.email || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('professionals.phone') }}:</span>
        <span class="info-value">{{ professional.personalInfo?.phone || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('professionals.license') }}:</span>
        <span class="info-value">{{ professional.professionalInfo?.license || '-' }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('professionals.commission') }}:</span>
        <span class="info-value">{{ commissionLabel }}</span>
      </div>
      <div v-if="professional.professionalInfo?.specialties?.length" class="info-row">
        <span class="info-label">{{ t('professionals.specialties') }}:</span>
        <div class="specialties-container">
          <span
            v-for="(specialty, index) in professional.professionalInfo.specialties"
            :key="index"
            class="badge badge-info specialty-badge"
          >
            {{ specialty }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.professional-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.3s ease;
}

.professional-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.professional-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.professional-info {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.professional-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 3rem;
  color: #999;
}

.professional-details {
  flex: 1;
}

.professional-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.professional-type {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: #666;
}

.professional-actions {
  display: flex;
  gap: 0.5rem;
}

.professional-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
  font-size: 0.9rem;
}

.info-value {
  color: #333;
  font-size: 0.9rem;
}

.specialties-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.specialty-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background-color: #d4edda;
  color: #155724;
}

.badge-warning {
  background-color: #fff3cd;
  color: #856404;
}

.badge-danger {
  background-color: #f8d7da;
  color: #721c24;
}

.badge-info {
  background-color: #d1ecf1;
  color: #0c5460;
}
</style>
