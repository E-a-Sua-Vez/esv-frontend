<script>
export default {
  name: 'TelemedicineDetails',
  props: {
    show: { type: Boolean, default: true },
    total: { type: [String, Number], default: 0 },
    completed: { type: [String, Number], default: 0 },
    cancelled: { type: [String, Number], default: 0 },
    scheduled: { type: [String, Number], default: 0 },
    active: { type: [String, Number], default: 0 },
    averageDuration: { type: [String, Number], default: 0 },
    accessKeysSent: { type: [String, Number], default: 0 },
    accessKeysValidated: { type: [String, Number], default: 0 },
    doctorsConnected: { type: [String, Number], default: 0 },
    patientsConnected: { type: [String, Number], default: 0 },
    sessionsStarted: { type: [String, Number], default: 0 },
    sessionsEnded: { type: [String, Number], default: 0 },
    statusFlow: { type: Object, default: () => ({}) },
    accessKeyFlow: { type: Object, default: () => ({ sent: 0, validated: 0, pending: 0 }) },
    connectionFlow: {
      type: Object,
      default: () => ({ doctors: 0, patients: 0, both: 0, none: 0 }),
    },
  },
  data() {
    return {};
  },
  methods: {},
};
</script>

<template>
  <div v-if="show" class="telemedicine-details">
    <!-- Status Overview -->
    <div class="telemedicine-grid">
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-blue">
          <i class="bi bi-calendar-check-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.scheduled') || 'Programadas' }}
          </div>
          <div class="telemedicine-value">{{ scheduled || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-play-circle-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.active') || 'Activas' }}
          </div>
          <div class="telemedicine-value">{{ active || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.completed') || 'Completadas' }}
          </div>
          <div class="telemedicine-value">{{ completed || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-red">
          <i class="bi bi-x-circle-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.cancelled') || 'Canceladas' }}
          </div>
          <div class="telemedicine-value">{{ cancelled || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="telemedicine-divider"></div>

    <!-- Access Key Flow -->
    <div class="telemedicine-grid">
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-blue">
          <i class="bi bi-key-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.accessKeysSent') || 'Claves Enviadas' }}
          </div>
          <div class="telemedicine-value">{{ accessKeysSent || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-key-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.accessKeysValidated') || 'Claves Validadas' }}
          </div>
          <div class="telemedicine-value">{{ accessKeysValidated || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-yellow">
          <i class="bi bi-hourglass-split"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.accessKeysPending') || 'Claves Pendientes' }}
          </div>
          <div class="telemedicine-value">{{ accessKeyFlow.pending || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="telemedicine-divider"></div>

    <!-- Connection Flow -->
    <div class="telemedicine-grid">
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-person-badge-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.doctorsConnected') || 'Doctores Conectados' }}
          </div>
          <div class="telemedicine-value">{{ doctorsConnected || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-blue">
          <i class="bi bi-person-heart"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.patientsConnected') || 'Pacientes Conectados' }}
          </div>
          <div class="telemedicine-value">{{ patientsConnected || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-people-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.bothConnected') || 'Ambos Conectados' }}
          </div>
          <div class="telemedicine-value">{{ connectionFlow.both || 0 }}</div>
        </div>
      </div>
    </div>

    <div class="telemedicine-divider"></div>

    <!-- Session Flow -->
    <div class="telemedicine-grid">
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-blue">
          <i class="bi bi-play-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.sessionsStarted') || 'Sesiones Iniciadas' }}
          </div>
          <div class="telemedicine-value">{{ sessionsStarted || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-green">
          <i class="bi bi-stop-circle-fill"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.sessionsEnded') || 'Sesiones Finalizadas' }}
          </div>
          <div class="telemedicine-value">{{ sessionsEnded || 0 }}</div>
        </div>
      </div>
      <div class="telemedicine-item">
        <div class="telemedicine-icon-container icon-orange">
          <i class="bi bi-clock-history"></i>
        </div>
        <div class="telemedicine-content">
          <div class="telemedicine-label">
            {{ $t('dashboard.telemedicine.averageDuration') || 'Duración Promedio' }}
          </div>
          <div class="telemedicine-value">
            {{ averageDuration || 0 }} {{ $t('dashboard.telemedicine.minutes') || 'min' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.telemedicine-details {
  padding: 0;
}

.telemedicine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.telemedicine-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.telemedicine-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
}

.telemedicine-icon-container {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.telemedicine-icon-container i {
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

.telemedicine-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.telemedicine-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.telemedicine-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
}

.telemedicine-divider {
  height: 1px;
  background: rgba(169, 169, 169, 0.1);
  margin: 1rem 0;
}

.telemedicine-grid:last-of-type {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .telemedicine-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .telemedicine-item {
    padding: 0.5rem;
  }

  .telemedicine-value {
    font-size: 1.1rem;
  }
}

@media (max-width: 576px) {
  .telemedicine-grid {
    grid-template-columns: 1fr;
  }
}
</style>
