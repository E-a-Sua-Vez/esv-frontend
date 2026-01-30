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
      <div class="package-info p-2">
        <p class="mb-1">
          <strong>{{ $t('attentionCreation.youHaveActivePackage') || 'You have an active package for this service:' }}</strong>
        </p>
        <div class="package-details mb-2">
          <div class="row">
            <div class="col-6">
              <small class="text-muted">{{ $t('attentionCreation.packageName') || 'Package Name' }}</small>
              <div class="fw-bold">{{ packageInfo.name || 'N/A' }}</div>
            </div>
            <div class="col-6">
              <small class="text-muted">{{ $t('attentionCreation.sessionsUsed') || 'Sessions Used' }}</small>
              <div class="fw-bold">{{ (packageInfo.totalSessions || 0) - (packageInfo.sessionsRemaining || 0) }} / {{ packageInfo.totalSessions || 0 }}</div>
            </div>
          </div>
          <div class="row mt-1">
            <div class="col-6">
              <small class="text-muted">{{ $t('attentionCreation.lastSession') || 'Last Session' }}</small>
              <div class="fw-bold">{{ packageInfo.lastAttentionDate ? formatDate(packageInfo.lastAttentionDate) : 'N/A' }}</div>
            </div>
            <div class="col-6">
              <small class="text-muted">{{ $t('attentionCreation.nextExpected') || 'Next Expected' }}</small>
              <div class="fw-bold">{{ packageInfo.nextExpectedDate ? formatDate(packageInfo.nextExpectedDate) : 'N/A' }}</div>
            </div>
          </div>
        </div>
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
</style>