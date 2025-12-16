<template>
  <div class="patient-form-modern">
    <div class="form-layout-modern">
      <div class="form-input-section">
        <div class="form-section-header">
          <div class="form-section-icon">
            <i class="bi bi-clipboard-data"></i>
          </div>
          <div class="form-section-title">
            <h4 class="form-title-text">Orden de Exámenes Médicos</h4>
            <p class="form-title-subtitle">Solicitar exámenes estructurados</p>
          </div>
        </div>

        <!-- Exam Type -->
        <div class="form-field-modern">
          <label class="form-label-modern">Tipo de Examen *</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="examType"
            @change="sendData"
          >
            <option value="">Seleccione...</option>
            <option value="laboratory">Laboratorio</option>
            <option value="imaging">Imagenología</option>
            <option value="procedure">Procedimiento</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <!-- Priority -->
        <div class="form-field-modern">
          <label class="form-label-modern">Prioridad *</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="priority"
            @change="sendData"
          >
            <option value="routine">Rutina</option>
            <option value="urgent">Urgente</option>
            <option value="emergency">Emergencia</option>
          </select>
        </div>

        <!-- Exams List -->
        <div class="exams-section">
          <div class="section-header">
            <h5>Exámenes Solicitados</h5>
            <button
              v-if="toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-primary"
              @click="addExam"
            >
              <i class="bi bi-plus-circle me-1"></i>
              Agregar Examen
            </button>
          </div>

          <div v-if="exams.length === 0" class="empty-state">
            <Message
              title="No hay exámenes"
              content="Agregue al menos un examen para crear la orden"
            />
          </div>

          <div v-else class="exams-list">
            <div v-for="(exam, index) in exams" :key="index" class="exam-card">
              <div class="exam-header">
                <span class="exam-number">{{ index + 1 }}</span>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-danger"
                  @click="removeExam(index)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>

              <!-- Exam Search -->
              <div class="form-field-modern">
                <label>Examen *</label>
                <ExamSearch
                  :disabled="!toggles['patient.history.edit']"
                  :exam-type="examType"
                  :selected-exam="exam.exam"
                  @select="selectedExam => selectExam(index, selectedExam)"
                />
              </div>

              <!-- Preparation -->
              <div class="form-field-modern" v-if="exam.exam?.preparation">
                <label class="form-label-modern">Preparación Requerida</label>
                <div class="preparation-info">
                  <i class="bi bi-info-circle me-1"></i>
                  {{ exam.exam.preparation }}
                </div>
              </div>

              <!-- Custom Instructions -->
              <div class="form-field-modern">
                <label class="form-label-modern">Instrucciones Especiales</label>
                <div class="position-relative">
                  <textarea
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    v-model="exam.instructions"
                    rows="2"
                    placeholder="Instrucciones adicionales..."
                    @input="sendData"
                  ></textarea>
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm speech-recognition-btn"
                    :class="{
                      'btn-danger':
                        isListeningSpeech &&
                        currentSpeechField === 'examInstructions' &&
                        currentSpeechExamIndex === index,
                      'btn-outline-primary':
                        !isListeningSpeech ||
                        currentSpeechField !== 'examInstructions' ||
                        currentSpeechExamIndex !== index,
                    }"
                    @click="toggleSpeechRecognition('examInstructions', index)"
                    :title="
                      isListeningSpeech &&
                      currentSpeechField === 'examInstructions' &&
                      currentSpeechExamIndex === index
                        ? 'Parar gravação'
                        : 'Iniciar gravação de voz'
                    "
                  >
                    <i
                      :class="
                        isListeningSpeech &&
                        currentSpeechField === 'examInstructions' &&
                        currentSpeechExamIndex === index
                          ? 'bi bi-mic-fill'
                          : 'bi bi-mic'
                      "
                    ></i>
                    <span class="ms-1 d-inline">{{
                      isListeningSpeech &&
                      currentSpeechField === 'examInstructions' &&
                      currentSpeechExamIndex === index
                        ? 'Gravando...'
                        : 'Voz'
                    }}</span>
                  </button>
                  <div
                    v-if="
                      isListeningSpeech &&
                      currentSpeechField === 'examInstructions' &&
                      currentSpeechExamIndex === index
                    "
                    class="speech-recording-indicator"
                  >
                    <span class="recording-dot"></span>
                    <span>Gravando...</span>
                  </div>
                  <div
                    v-if="
                      speechError &&
                      currentSpeechField === 'examInstructions' &&
                      currentSpeechExamIndex === index
                    "
                    class="speech-error-message text-danger small mt-1"
                  >
                    {{ speechError }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Clinical Justification -->
        <div class="form-field-modern">
          <label class="form-label-modern">Justificación Clínica</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="clinicalJustification"
              rows="3"
              placeholder="Justificación clínica para los exámenes..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'clinicalJustification',
                'btn-outline-primary':
                  !isListeningSpeech || currentSpeechField !== 'clinicalJustification',
              }"
              @click="toggleSpeechRecognition('clinicalJustification')"
              :title="
                isListeningSpeech && currentSpeechField === 'clinicalJustification'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'clinicalJustification'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'clinicalJustification'
                  ? 'Gravando...'
                  : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'clinicalJustification'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'clinicalJustification'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Scheduled Date -->
        <div class="form-field-modern">
          <label class="form-label-modern">Fecha Programada (opcional)</label>
          <input
            :disabled="!toggles['patient.history.edit']"
            type="datetime-local"
            class="form-control-modern"
            v-model="scheduledDate"
            @input="sendData"
          />
        </div>

        <!-- Laboratory -->
        <div class="form-field-modern">
          <label class="form-label-modern">Laboratorio/Proveedor (opcional)</label>
          <input
            :disabled="!toggles['patient.history.edit']"
            type="text"
            class="form-control-modern"
            v-model="laboratoryName"
            placeholder="Nombre del laboratorio..."
            @input="sendData"
          />
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
import Message from '../../common/Message.vue';
import ExamSearch from './ExamSearch.vue';
import { useSpeechRecognition } from '../../patient-history/composables/useSpeechRecognition';

export default {
  name: 'MedicalExamOrderForm',
  components: {
    Warning,
    Message,
    ExamSearch,
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
    const examType = ref('');
    const priority = ref('routine');
    const exams = ref([]);
    const clinicalJustification = ref('');
    const scheduledDate = ref('');
    const laboratoryName = ref('');

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
    const currentSpeechExamIndex = ref(null);

    const handleSpeechResult = interimText => {
      // Optional: show interim results in real-time
    };

    const handleSpeechFinalResult = finalText => {
      if (!currentSpeechField.value) return;

      const field = currentSpeechField.value;
      if (field === 'clinicalJustification') {
        clinicalJustification.value = appendTranscriptionWithTimestamp(
          clinicalJustification.value,
          finalText
        );
      } else if (field === 'examInstructions' && currentSpeechExamIndex.value !== null) {
        const exam = exams.value[currentSpeechExamIndex.value];
        if (exam) {
          exam.instructions = appendTranscriptionWithTimestamp(exam.instructions || '', finalText);
        }
      }
      sendData();
    };

    const toggleSpeechRecognition = (fieldName, examIndex = null) => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
        currentSpeechField.value = null;
        currentSpeechExamIndex.value = null;
      } else {
        currentSpeechField.value = fieldName;
        currentSpeechExamIndex.value = examIndex;
        const language =
          props.commerce?.localeInfo?.language || props.commerce?.language || 'pt-BR';
        startSpeechListening(handleSpeechResult, handleSpeechFinalResult, language);
      }
    };

    const addExam = () => {
      exams.value.push({
        examId: '',
        exam: null,
        instructions: '',
      });
    };

    const removeExam = index => {
      exams.value.splice(index, 1);
      sendData();
    };

    const selectExam = (index, selectedExam) => {
      exams.value[index].examId = selectedExam.id;
      exams.value[index].exam = selectedExam;
      sendData();
    };

    const sendData = () => {
      const orderData = {
        exams: exams.value.map(exam => ({
          examId: exam.examId,
          examName: exam.exam?.name || '',
          examCode: exam.exam?.code,
          preparation: exam.exam?.preparation,
          instructions: exam.instructions,
        })),
        type: examType.value,
        priority: priority.value,
        clinicalJustification: clinicalJustification.value,
        scheduledDate: scheduledDate.value || undefined,
        laboratoryName: laboratoryName.value || undefined,
      };
      props.receiveData(orderData);
    };

    return {
      examType,
      priority,
      exams,
      clinicalJustification,
      scheduledDate,
      laboratoryName,
      addExam,
      removeExam,
      selectExam,
      sendData,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      currentSpeechField,
      currentSpeechExamIndex,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exams-section {
  margin: 1.5rem 0;
}

.exams-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exam-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  background: white;
  box-shadow: var(--shadow-sm);
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.exam-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--azul-turno);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
}

.preparation-info {
  padding: 0.75rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--azul-turno);
  color: var(--color-text);
}

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
