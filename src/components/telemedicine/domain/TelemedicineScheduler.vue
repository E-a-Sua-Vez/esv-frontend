<template>
  <div class="telemedicine-scheduler patient-form-modern">
    <div class="scheduler-header">
      <div class="scheduler-header-content">
        <div class="scheduler-header-icon">
          <i class="bi bi-calendar-plus"></i>
        </div>
        <div class="scheduler-header-title">
          <h4>{{ $t('telemedicineSession.scheduler.title') }}</h4>
          <p class="text-muted small mb-0">{{ $t('telemedicineSession.scheduler.subtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="scheduler-body">
      <div class="form-field-modern">
        <label class="form-label-modern">
          <i class="bi bi-calendar3"></i>
          {{ $t('telemedicineSession.scheduler.dateTime') }} *
        </label>
        <input
          type="datetime-local"
          class="form-control-modern"
          v-model="formData.scheduledAt"
          :min="minDateTime"
          required
        />
      </div>
    </div>

    <div class="scheduler-footer">
      <button type="button" class="btn btn-secondary" @click="$emit('cancel')">{{ $t('telemedicineSession.scheduler.cancel') }}</button>
      <button
        type="button"
        class="btn-modern"
        @click="scheduleSession"
        :disabled="saving || !isFormValid"
      >
        <i class="bi bi-calendar-check me-1"></i>
        {{ $t('telemedicineSession.scheduler.schedule') }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed } from 'vue';

export default {
  name: 'TelemedicineScheduler',
  props: {
    commerceId: {
      type: String,
      required: true,
    },
    commerce: {
      type: Object,
      default: () => ({}),
    },
    clientId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    attentionId: {
      type: String,
      default: undefined,
    },
    patientHistoryId: {
      type: String,
      default: undefined,
    },
  },
  emits: ['scheduled', 'cancel'],
  setup(props, { emit }) {
    const saving = ref(false);
    const formData = reactive({
      scheduledAt: '',
      type: 'video', // Always VIDEO for telemedicine
      recordingEnabled: false, // Will be set from commerce config
      notes: '',
    });

    // Set recordingEnabled from commerce config
    if (props.commerce?.telemedicineRecordingEnabled) {
      formData.recordingEnabled = props.commerce.telemedicineRecordingEnabled;
    }

    const minDateTime = computed(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      return now.toISOString().slice(0, 16);
    });

    const isFormValid = computed(() => formData.scheduledAt && formData.type);

    const scheduleSession = async () => {
      if (!isFormValid.value) return;

      try {
        saving.value = true;

        const sessionData = {
          commerceId: props.commerceId,
          clientId: props.clientId,
          doctorId: props.doctorId,
          attentionId: props.attentionId,
          patientHistoryId: props.patientHistoryId,
          type: 'video', // Always VIDEO for telemedicine
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          recordingEnabled: props.commerce?.telemedicineRecordingEnabled || false,
        };

        emit('scheduled', sessionData);
      } catch (error) {
        console.error('Error scheduling session:', error);
        alert('Error al programar la consulta');
      } finally {
        saving.value = false;
      }
    };

    return {
      saving,
      formData,
      minDateTime,
      isFormValid,
      scheduleSession,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-scheduler {
  padding: 1.5rem;
}

.scheduler-header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.scheduler-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scheduler-header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.scheduler-header-title h4 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.scheduler-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scheduler-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .scheduler-header-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
