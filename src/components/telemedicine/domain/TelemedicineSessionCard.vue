<template>
  <div class="telemedicine-session-card modern-card">
    <div class="session-card-header">
      <div class="session-card-meta">
        <span class="session-date-badge">
          <i class="bi bi-calendar3 me-1"></i>
          {{ formatDate(session.scheduledAt) }}
        </span>
        <span class="session-status-badge" :class="getStatusClass(session.status)">
          {{ getStatusLabel(session.status) }}
        </span>
        <span class="session-type-badge" :class="getTypeClass(session.type)">
          <i :class="getTypeIcon(session.type)" class="me-1"></i>
          {{ getTypeLabel(session.type) }}
        </span>
      </div>
      <div class="session-card-actions">
        <button
          v-if="session.status === 'SCHEDULED' || session.status === 'scheduled'"
          type="button"
          class="btn btn-sm btn-primary"
          @click="handleStartSession"
          :title="$t('telemedicineSession.card.startSession')"
        >
          <i class="bi bi-play-circle me-1"></i>
          {{ $t('telemedicineSession.card.start') }}
        </button>
        <button
          v-if="session.status === 'ACTIVE' || session.status === 'active'"
          type="button"
          class="btn btn-sm btn-success"
          @click="handleJoinSession"
          :title="$t('telemedicineSession.card.joinSession')"
        >
          <i class="bi bi-camera-video me-1"></i>
          {{ $t('telemedicineSession.card.join') }}
        </button>
        <button
          v-if="
            (session.status === 'ACTIVE' || session.status === 'active') && userType === 'doctor'
          "
          type="button"
          class="btn btn-sm btn-outline-danger"
          @click="$emit('end', session.id)"
          :title="$t('telemedicineSession.card.endSession')"
        >
          <i class="bi bi-stop-circle me-1"></i>
          {{ $t('telemedicineSession.card.end') }}
        </button>
        <button
          v-if="
            (session.status === 'SCHEDULED' || session.status === 'scheduled') &&
            userType === 'doctor'
          "
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="$emit('cancel', session.id)"
          :title="$t('telemedicineSession.card.cancelSession')"
        >
          <i class="bi bi-x-circle"></i>
        </button>
      </div>
    </div>

    <div class="session-card-body">
      <div class="session-info">
        <div class="session-info-item">
          <i class="bi bi-person-circle me-2"></i>
          <span>{{ $t('telemedicineSession.card.patient') }} {{ clientName || 'N/A' }}</span>
        </div>
        <div class="session-info-item">
          <i class="bi bi-person-badge me-2"></i>
          <span>{{ $t('telemedicineSession.card.doctor') }} {{ doctorName || session.doctorId }}</span>
        </div>
        <div v-if="session.duration" class="session-info-item">
          <i class="bi bi-clock-history me-2"></i>
          <span>{{ $t('telemedicineSession.card.duration') }} {{ session.duration }} {{ $t('telemedicineSession.card.minutes') }}</span>
        </div>
        <div v-if="session.recordingUrl" class="session-info-item">
          <i class="bi bi-camera-reels me-2"></i>
          <a :href="session.recordingUrl" target="_blank" class="recording-link">
            {{ $t('telemedicineSession.card.viewRecording') }}
            <i class="bi bi-box-arrow-up-right ms-1"></i>
          </a>
        </div>
      </div>

      <div v-if="session.notes" class="session-notes">
        <strong>{{ $t('telemedicineSession.card.notes') }}</strong>
        <p>{{ session.notes }}</p>
      </div>

      <div v-if="session.diagnosis" class="session-diagnosis">
        <strong>{{ $t('telemedicineSession.card.diagnosis') }}</strong>
        <p>{{ session.diagnosis }}</p>
      </div>
    </div>

    <div v-if="session.status === 'active'" class="session-card-footer">
      <div class="session-room-info">
        <i class="bi bi-door-open me-1"></i>
        <span>{{ $t('telemedicineSession.card.room') }} {{ session.roomId }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'TelemedicineSessionCard',
  props: {
    session: {
      type: Object,
      required: true,
    },
    clientName: {
      type: String,
      default: '',
    },
    doctorName: {
      type: String,
      default: '',
    },
    userType: {
      type: String,
      default: 'patient',
      validator: value => ['doctor', 'patient'].includes(value),
    },
    currentUserId: {
      type: String,
      default: '',
    },
    toggles: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['start', 'join', 'end', 'cancel', 'session-selected', 'start-session'],
  setup(props, { emit }) {
    const formatDate = date => {
      if (!date) return '';
      return getDate(date);
    };

    const getStatusClass = status => {
      const normalizedStatus = status?.toUpperCase() || status;
      const classes = {
        SCHEDULED: 'badge-modern badge-modern-info',
        scheduled: 'badge-modern badge-modern-info',
        ACTIVE: 'badge-modern badge-modern-success',
        active: 'badge-modern badge-modern-success',
        ENDED: 'badge-modern badge-modern-primary',
        ended: 'badge-modern badge-modern-primary',
        completed: 'badge-modern badge-modern-primary',
        CANCELLED: 'badge-modern badge-modern-danger',
        cancelled: 'badge-modern badge-modern-danger',
      };
      return classes[normalizedStatus] || classes[status] || 'badge-modern';
    };

    const getTypeClass = type => {
      const normalizedType = type?.toUpperCase() || type;
      const classes = {
        VIDEO: 'badge-modern badge-modern-primary',
        video: 'badge-modern badge-modern-primary',
        CHAT: 'badge-modern badge-modern-info',
        chat: 'badge-modern badge-modern-info',
        BOTH: 'badge-modern badge-modern-success',
        both: 'badge-modern badge-modern-success',
      };
      return classes[normalizedType] || classes[type] || 'badge-modern';
    };

    const getTypeIcon = type => {
      const normalizedType = type?.toUpperCase() || type;
      const icons = {
        VIDEO: 'bi-camera-video',
        video: 'bi-camera-video',
        CHAT: 'bi-chat-dots',
        chat: 'bi-chat-dots',
        BOTH: 'bi-camera-video-fill',
        both: 'bi-camera-video-fill',
      };
      return icons[normalizedType] || icons[type] || 'bi-circle';
    };

    const handleStartSession = () => {
      emit('start-session', props.session);
    };

    const handleJoinSession = () => {
      emit('session-selected', props.session);
    };

    return {
      formatDate,
      getStatusClass,
      getTypeClass,
      getTypeIcon,
      handleStartSession,
      handleJoinSession,
    };
  },
  methods: {
    getStatusLabel(status) {
      const normalizedStatus = status?.toUpperCase() || status;
      const labelMap = {
        SCHEDULED: 'telemedicineSession.card.statusScheduled',
        scheduled: 'telemedicineSession.card.statusScheduled',
        ACTIVE: 'telemedicineSession.card.statusActive',
        active: 'telemedicineSession.card.statusActive',
        ENDED: 'telemedicineSession.card.statusEnded',
        ended: 'telemedicineSession.card.statusEnded',
        completed: 'telemedicineSession.card.statusCompleted',
        CANCELLED: 'telemedicineSession.card.statusCancelled',
        cancelled: 'telemedicineSession.card.statusCancelled',
      };
      const key = labelMap[normalizedStatus] || labelMap[status];
      return key ? this.$t(key) : status;
    },
    getTypeLabel(type) {
      const normalizedType = type?.toUpperCase() || type;
      const labelMap = {
        VIDEO: 'telemedicineSession.card.typeVideo',
        video: 'telemedicineSession.card.typeVideo',
        CHAT: 'telemedicineSession.card.typeChat',
        chat: 'telemedicineSession.card.typeChat',
        BOTH: 'telemedicineSession.card.typeBoth',
        both: 'telemedicineSession.card.typeBoth',
      };
      const key = labelMap[normalizedType] || labelMap[type];
      return key ? this.$t(key) : type;
    }
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-session-card {
  transition: all 0.3s ease;
}

.telemedicine-session-card:hover {
  transform: translateY(-2px);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.session-card-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.session-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: var(--border-radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--azul-turno);
}

.session-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.session-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-text);
}

.session-notes,
.session-diagnosis {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--azul-turno);
}

.session-notes p,
.session-diagnosis p {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  line-height: 1.6;
}

.recording-link {
  color: var(--azul-turno);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
}

.recording-link:hover {
  color: var(--verde-tu);
  text-decoration: underline;
}

.session-card-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-room-info {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-family: monospace;
}

@media (max-width: 768px) {
  .session-card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .session-card-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
