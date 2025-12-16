<template>
  <div class="patient-form-modern">
    <div class="form-layout-modern">
      <div class="form-input-section">
        <div class="form-section-header">
          <div class="form-section-icon">
            <i class="bi bi-arrow-left-right"></i>
          </div>
          <div class="form-section-title">
            <h4 class="form-title-text">Referencia Médica</h4>
            <p class="form-title-subtitle">Generar referencia a especialista</p>
          </div>
        </div>

        <!-- Specialty Destination -->
        <div class="form-field-modern">
          <label class="form-label-modern">Especialidad Destino *</label>
          <input
            :disabled="!toggles['patient.history.edit']"
            type="text"
            class="form-control-modern"
            v-model="specialtyDestination"
            placeholder="ej: Cardiología, Neurología..."
            @input="sendData"
            list="specialties"
          />
          <datalist id="specialties">
            <option>Cardiología</option>
            <option>Neurología</option>
            <option>Dermatología</option>
            <option>Oftalmología</option>
            <option>Otorrinolaringología</option>
            <option>Traumatología</option>
            <option>Ginecología</option>
            <option>Urología</option>
            <option>Psiquiatría</option>
            <option>Endocrinología</option>
          </datalist>
        </div>

        <!-- Doctor Destination (optional) -->
        <div class="form-field-modern">
          <label class="form-label-modern">Médico Destino (opcional)</label>
          <input
            :disabled="!toggles['patient.history.edit']"
            type="text"
            class="form-control-modern"
            v-model="doctorDestinationName"
            placeholder="Nombre del médico especialista..."
            @input="sendData"
          />
        </div>

        <!-- Reason -->
        <div class="form-field-modern">
          <label class="form-label-modern">Motivo de la Referencia *</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="reason"
              rows="3"
              placeholder="Motivo por el cual se deriva al paciente..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'reason',
                'btn-outline-primary': !isListeningSpeech || currentSpeechField !== 'reason',
              }"
              @click="toggleSpeechRecognition('reason')"
              :title="
                isListeningSpeech && currentSpeechField === 'reason'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'reason'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'reason' ? 'Gravando...' : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'reason'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'reason'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Presumptive Diagnosis -->
        <div class="form-field-modern">
          <label class="form-label-modern">Diagnóstico Presuntivo</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="presumptiveDiagnosis"
              rows="2"
              placeholder="Diagnóstico presuntivo..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'presumptiveDiagnosis',
                'btn-outline-primary':
                  !isListeningSpeech || currentSpeechField !== 'presumptiveDiagnosis',
              }"
              @click="toggleSpeechRecognition('presumptiveDiagnosis')"
              :title="
                isListeningSpeech && currentSpeechField === 'presumptiveDiagnosis'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'presumptiveDiagnosis'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'presumptiveDiagnosis'
                  ? 'Gravando...'
                  : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'presumptiveDiagnosis'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'presumptiveDiagnosis'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Studies Performed -->
        <div class="form-field-modern">
          <label class="form-label-modern">Estudios Realizados</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="studiesPerformed"
              rows="2"
              placeholder="Estudios ya realizados que se adjuntan..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'studiesPerformed',
                'btn-outline-primary':
                  !isListeningSpeech || currentSpeechField !== 'studiesPerformed',
              }"
              @click="toggleSpeechRecognition('studiesPerformed')"
              :title="
                isListeningSpeech && currentSpeechField === 'studiesPerformed'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'studiesPerformed'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'studiesPerformed'
                  ? 'Gravando...'
                  : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'studiesPerformed'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'studiesPerformed'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Current Treatment -->
        <div class="form-field-modern">
          <label class="form-label-modern">Tratamiento Actual</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="currentTreatment"
              rows="2"
              placeholder="Tratamiento que el paciente está recibiendo..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'currentTreatment',
                'btn-outline-primary':
                  !isListeningSpeech || currentSpeechField !== 'currentTreatment',
              }"
              @click="toggleSpeechRecognition('currentTreatment')"
              :title="
                isListeningSpeech && currentSpeechField === 'currentTreatment'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'currentTreatment'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'currentTreatment'
                  ? 'Gravando...'
                  : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'currentTreatment'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'currentTreatment'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Urgency -->
        <div class="form-field-modern">
          <label class="form-label-modern">Urgencia *</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="urgency"
            @change="sendData"
          >
            <option value="routine">Rutina</option>
            <option value="preferred">Preferente</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <!-- Errors -->
        <div class="form-errors-modern" v-if="errorsAdd && errorsAdd.length > 0">
          <Warning>
            <template v-slot:message>
              <li v-for="(error, index) in errorsAdd" :key="index">
                {{ $t(error) }}
              </li>
            </template>
          </Warning>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import Warning from '../../common/Warning.vue';
import { useSpeechRecognition } from '../../patient-history/composables/useSpeechRecognition';

export default {
  name: 'MedicalReferenceForm',
  components: {
    Warning,
  },
  props: {
    commerce: { type: Object, default: {} },
    client: { type: Object, default: {} },
    attention: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  setup(props) {
    const specialtyDestination = ref('');
    const doctorDestinationName = ref('');
    const reason = ref('');
    const presumptiveDiagnosis = ref('');
    const studiesPerformed = ref('');
    const currentTreatment = ref('');
    const urgency = ref('routine');

    // Speech recognition
    const {
      isListening: isListeningSpeech,
      isSupported: isSpeechSupported,
      error: speechError,
      startListening: startSpeechListening,
      stopListening: stopSpeechListening,
      appendTranscriptionWithTimestamp,
    } = useSpeechRecognition();

    // Current field being edited for speech recognition
    const currentSpeechField = ref(null);

    const handleSpeechResult = interimText => {
      // Optional: show interim results in real-time
    };

    const handleSpeechFinalResult = finalText => {
      if (!currentSpeechField.value) return;

      const field = currentSpeechField.value;
      if (field === 'reason') {
        reason.value = appendTranscriptionWithTimestamp(reason.value, finalText);
      } else if (field === 'presumptiveDiagnosis') {
        presumptiveDiagnosis.value = appendTranscriptionWithTimestamp(
          presumptiveDiagnosis.value,
          finalText
        );
      } else if (field === 'studiesPerformed') {
        studiesPerformed.value = appendTranscriptionWithTimestamp(
          studiesPerformed.value,
          finalText
        );
      } else if (field === 'currentTreatment') {
        currentTreatment.value = appendTranscriptionWithTimestamp(
          currentTreatment.value,
          finalText
        );
      }
      sendData();
    };

    const toggleSpeechRecognition = fieldName => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
        currentSpeechField.value = null;
      } else {
        currentSpeechField.value = fieldName;
        const language =
          props.commerce?.localeInfo?.language || props.commerce?.language || 'pt-BR';
        startSpeechListening(handleSpeechResult, handleSpeechFinalResult, language);
      }
    };

    const sendData = () => {
      const referenceData = {
        specialtyDestination: specialtyDestination.value,
        doctorDestinationName: doctorDestinationName.value || undefined,
        reason: reason.value,
        presumptiveDiagnosis: presumptiveDiagnosis.value || undefined,
        studiesPerformed: studiesPerformed.value || undefined,
        currentTreatment: currentTreatment.value || undefined,
        urgency: urgency.value,
      };
      props.receiveData(referenceData);
    };

    return {
      specialtyDestination,
      doctorDestinationName,
      reason,
      presumptiveDiagnosis,
      studiesPerformed,
      currentTreatment,
      urgency,
      sendData,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      currentSpeechField,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.position-relative {
  position: relative;
}

.speech-recognition-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: var(--border-radius-sm);
}

.speech-recognition-btn span {
  font-size: 0.7rem;
}

.speech-recognition-btn:hover {
  transform: scale(1.05);
}

.speech-recognition-btn.btn-danger {
  animation: pulse-recording 1.5s ease-in-out infinite;
}

@keyframes pulse-recording {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(220, 53, 69, 0);
  }
}

.speech-recording-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  background: rgba(220, 53, 69, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  color: #dc3545;
  font-weight: 600;
  z-index: 10;
  pointer-events: none;
}

.recording-dot {
  width: 8px;
  height: 8px;
  background: #dc3545;
  border-radius: 50%;
  animation: blink-recording 1s ease-in-out infinite;
  margin-right: 0.5rem;
}

@keyframes blink-recording {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.speech-error-message {
  padding: 0.25rem 0.5rem;
  background: rgba(220, 53, 69, 0.1);
  border-radius: var(--border-radius-sm);
  margin-top: 0.25rem;
}
</style>
