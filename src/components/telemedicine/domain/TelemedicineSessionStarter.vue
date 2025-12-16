<template>
  <div>
    <!-- Botón para iniciar sesión de telemedicina -->
    <button
      v-if="showButton && sessionId"
      type="button"
      class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-2 card-action"
      @click="startSession"
      :disabled="loading || starting"
    >
      <i v-if="starting" class="spinner-border spinner-border-sm me-1"></i>
      <i v-else class="bi bi-camera-video me-1"></i>
      {{ buttonText }}
    </button>

    <!-- Modal para seleccionar tipo de sesión -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content modern-card">
        <div class="modal-header">
          <h5>
            <i class="bi bi-camera-video me-2"></i>
            Iniciar Consulta Virtual
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="text-center py-4">
            <Spinner />
          </div>

          <div v-else>
            <div class="session-type-selector">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-list-check"></i>
                  Tipo de Consulta
                </label>
                <div class="session-type-options">
                  <button
                    type="button"
                    class="session-type-option"
                    :class="{ 'session-type-active': selectedType === 'video' }"
                    @click="selectedType = 'video'"
                  >
                    <i class="bi bi-camera-video"></i>
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    class="session-type-option"
                    :class="{ 'session-type-active': selectedType === 'chat' }"
                    @click="selectedType = 'chat'"
                  >
                    <i class="bi bi-chat-dots"></i>
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button
            type="button"
            class="btn-modern"
            @click="confirmStart"
            :disabled="starting || !selectedType"
          >
            <i class="bi bi-play-circle me-1"></i>
            Iniciar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import {
  startTelemedicineSession,
  getTelemedicineSession,
} from '../../../application/services/telemedicine';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'TelemedicineSessionStarter',
  components: {
    Spinner,
  },
  props: {
    sessionId: {
      type: String,
      default: null,
    },
    attentionId: {
      type: String,
      default: null,
    },
    showButton: {
      type: Boolean,
      default: true,
    },
    buttonText: {
      type: String,
      default: 'Iniciar Consulta Virtual',
    },
    userType: {
      type: String,
      default: 'doctor',
      validator: value => ['doctor', 'patient'].includes(value),
    },
  },
  emits: ['session-started', 'error'],
  setup(props, { emit }) {
    const loading = ref(false);
    const starting = ref(false);
    const showModal = ref(false);
    const selectedType = ref('video');
    const session = ref(null);

    const hasSession = computed(() => !!props.sessionId);

    const loadSession = async () => {
      if (!props.sessionId) return;

      try {
        loading.value = true;
        session.value = await getTelemedicineSession(props.sessionId);
      } catch (err) {
        console.error('Error loading session:', err);
        emit('error', err);
      } finally {
        loading.value = false;
      }
    };

    const startSession = async () => {
      if (!props.sessionId) {
        emit('error', new Error('No hay sesión de telemedicina disponible'));
        return;
      }

      // Si la sesión ya tiene tipo definido, iniciar directamente
      if (session.value && session.value.type !== 'both') {
        await doStartSession(session.value.type);
      } else {
        // Mostrar modal para seleccionar tipo
        showModal.value = true;
        if (!session.value) {
          await loadSession();
        }
      }
    };

    const confirmStart = async () => {
      if (!selectedType.value) return;
      await doStartSession(selectedType.value);
    };

    const doStartSession = async type => {
      try {
        starting.value = true;

        // Iniciar sesión en backend
        await startTelemedicineSession(props.sessionId);

        // Emitir evento con el tipo seleccionado
        emit('session-started', {
          sessionId: props.sessionId,
          type,
          session: session.value,
        });

        showModal.value = false;
      } catch (err) {
        console.error('Error starting session:', err);
        emit('error', err);
      } finally {
        starting.value = false;
      }
    };

    const closeModal = () => {
      showModal.value = false;
      selectedType.value = 'video';
    };

    return {
      loading,
      starting,
      showModal,
      selectedType,
      session,
      hasSession,
      startSession,
      confirmStart,
      closeModal,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.modal-header h5 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.modal-body {
  padding: 1.5rem;
}

.session-type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

.session-type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-type-option:hover {
  border-color: var(--azul-turno);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.session-type-active {
  border-color: var(--azul-turno);
  background: rgba(68, 111, 252, 0.05);
}

.session-type-option i {
  font-size: 2rem;
  color: var(--azul-turno);
}

.session-type-active i {
  color: var(--azul-turno);
}

.session-type-option span {
  font-weight: 600;
  color: var(--color-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.02);
}

@media (max-width: 768px) {
  .session-type-options {
    grid-template-columns: 1fr;
  }
}
</style>
