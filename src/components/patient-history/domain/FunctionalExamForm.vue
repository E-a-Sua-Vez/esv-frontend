<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import TemplatePicker from '../../medical-templates/domain/TemplatePicker.vue';
import { useSpeechRecognition } from '../composables/useSpeechRecognition';
import { globalStore } from '../../../stores';
import { dateYYYYMMDD } from '../../../shared/utils/date';

export default {
  name: 'FunctionalExamForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    Message,
    HistoryDetailsCard,
    TemplatePicker,
  },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { commerce, cacheData, patientHistoryData, toggles, errorsAdd } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newFunctionalExam: { exam: '' },
      oldFunctionalExam: [],
      captcha: false,
      examError: false,
      asc: true,
      showHistory: false,
    });

    // Speech recognition
    const {
      isListening: isListeningSpeech,
      isSupported: isSpeechSupported,
      error: speechError,
      startListening: startSpeechListening,
      stopListening: stopSpeechListening,
    } = useSpeechRecognition();

    const handleSpeechResult = interimText => {
      // Show interim results (optional - for real-time display)
    };

    const handleSpeechFinalResult = finalText => {
      // Append transcribed text with timestamp as new paragraph
      const currentText = state.newFunctionalExam.exam || '';
      const now = new Date();
      const timestamp = `[${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(
        2,
        '0'
      )}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(
        2,
        '0'
      )}]`;
      const timestampedText = `${timestamp} ${finalText}`;

      const newText =
        currentText && currentText.trim() !== ''
          ? `${currentText}\n\n${timestampedText}`
          : timestampedText;

      state.newFunctionalExam.exam = newText;
      sendData();
    };

    const toggleSpeechRecognition = () => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
      } else {
        // Get language from commerce or default to pt-BR
        const language = commerce.value?.localeInfo?.language || 'pt-BR';
        startSpeechListening(handleSpeechResult, handleSpeechFinalResult, language);
      }
    };

    const clearField = () => {
      state.newFunctionalExam.exam = '';
      sendData();
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        // Inicializar con objeto vacío y campo exam vacío
        state.newFunctionalExam = { exam: '' };

        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldFunctionalExam = patientHistoryData.value.functionalExam || [];
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          if (state.oldFunctionalExam && state.oldFunctionalExam.length > 0) {
            const sortedExams = [...state.oldFunctionalExam].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            // Buscar registro del día de hoy
            const todayExam = sortedExams.find(
              exam => dateYYYYMMDD(exam.createdAt) === dateYYYYMMDD(new Date())
            );
            // Si existe registro de hoy, usarlo, sino usar el más reciente
            const examToLoad = todayExam || sortedExams[0];
            if (examToLoad) {
              state.newFunctionalExam = {
                ...examToLoad,
                exam: examToLoad.exam || '',
              };
            }
          }
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if (!state.newFunctionalExam.exam && cacheData.value) {
          state.newFunctionalExam = {
            ...cacheData.value,
            exam: cacheData.value.exam || '',
          };
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newFunctionalExam);
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldFunctionalExam && state.oldFunctionalExam.length > 0) {
        let elementsSorted = [];
        const elements = state.oldFunctionalExam;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldFunctionalExam = elementsSorted;
      }
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.functionalExam &&
          patientHistoryData.value.functionalExam.length > 0 &&
          patientHistoryData.value.functionalExam[0]
        ) {
          state.oldFunctionalExam = patientHistoryData.value.functionalExam;
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          const sortedExams = [...state.oldFunctionalExam].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Buscar registro del día de hoy
          const todayExam = sortedExams.find(
            exam => dateYYYYMMDD(exam.createdAt) === dateYYYYMMDD(new Date())
          );
          // Si existe registro de hoy, usarlo, sino usar el más reciente
          const examToLoad = todayExam || sortedExams[0];
          if (examToLoad) {
            state.newFunctionalExam = {
              ...examToLoad,
              exam: examToLoad.exam || '',
            };
          } else {
            state.newFunctionalExam = { exam: '' };
          }
        } else {
          state.newFunctionalExam = { exam: '' };
        }
      } else {
        state.newFunctionalExam = { exam: '' };
      }
      loading.value = false;
    });

    const store = globalStore();

    const handleTemplateSelected = content => {
      state.newFunctionalExam.exam = content;
      sendData();
    };

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      sendData,
      checkAsc,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      clearField,
      handleTemplateSelected,
      store,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-heart-pulse"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.functionalExam') }}</h3>
        <p class="form-header-subtitle">Descreva o exame funcional do paciente</p>
      </div>
    </div>
    <div class="form-layout-modern">
      <!-- Form Input Section -->
      <div class="form-input-section">
        <!-- Template Picker -->
        <div class="form-field-modern" v-if="store.commerce && store.user">
          <TemplatePicker
            :commerce-id="store.commerce.id"
            :doctor-id="store.user.id"
            template-type="functional_exam"
            :toggles="toggles"
            @template-selected="handleTemplateSelected"
          />
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="functional-exam-textarea">
            <i class="bi bi-clipboard-pulse me-2"></i>
            {{ $t('patientHistoryView.functionalExam') }}
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-2 speech-recognition-btn btn-outline-primary"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition"
              :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
            >
              <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
              <span class="ms-1 d-inline">{{ isListeningSpeech ? 'Gravando...' : 'Voz' }}</span>
            </button>
            <button
              v-if="toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
              @click="clearField"
              title="Limpar campo"
            >
              <i class="bi bi-eraser"></i>
            </button>
          </label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              id="functional-exam-textarea"
              rows="8"
              :max="500"
              @keyup="sendData"
              @input="sendData"
              v-bind:class="{
                'form-control-invalid': state.examError || (errorsAdd && errorsAdd.length > 0),
              }"
              v-model="state.newFunctionalExam.exam"
            ></textarea>
            <div v-if="isListeningSpeech" class="speech-recording-indicator">
              <span class="recording-dot"></span>
              <span class="ms-2">Gravando... Fale agora</span>
            </div>
            <div v-if="speechError" class="speech-error-message text-danger small mt-1">
              <i class="bi bi-exclamation-triangle me-1"></i>
              {{ speechError }}
            </div>
          </div>
          <div class="form-field-hint" v-if="state.newFunctionalExam.exam">
            <span class="character-count"
              >{{ (state.newFunctionalExam.exam || '').length }}/500</span
            >
          </div>
        </div>

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

      <!-- Collapsed Indicator (visible when collapsed) - Outside the section -->
      <button
        v-if="!state.showHistory"
        class="history-collapsed-indicator"
        @click="state.showHistory = !state.showHistory"
        :title="$t('patientHistoryView.showMenu')"
      >
        <i class="bi bi-clock-history"></i>
        <i class="bi bi-chevron-left"></i>
      </button>

      <!-- History Timeline Section -->
      <div :class="['form-history-section', { collapsed: !state.showHistory }]">
        <!-- Full History Section (visible when expanded) -->
        <template v-if="state.showHistory">
          <div class="history-section-header">
            <div class="history-header-content">
              <button
                class="history-toggle-btn"
                @click="state.showHistory = !state.showHistory"
                :title="$t('patientHistoryView.hideMenu')"
              >
                <i class="bi bi-chevron-right"></i>
              </button>
              <i class="bi bi-clock-history history-header-icon"></i>
              <h4 class="history-header-title">{{ $t('patientHistoryView.history') }}</h4>
            </div>
            <div class="history-sort-control">
              <label class="sort-toggle-label" for="asc-functional">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-functional"
                  v-model="state.asc"
                  @click="checkAsc($event)"
                />
                <span class="sort-toggle-text">
                  <i :class="state.asc ? 'bi bi-sort-down' : 'bi bi-sort-up'"></i>
                  {{ state.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                </span>
              </label>
            </div>
          </div>

          <div class="history-timeline">
            <div
              v-if="
                state.oldFunctionalExam &&
                state.oldFunctionalExam.length > 0 &&
                state.oldFunctionalExam[0]
              "
              class="history-timeline-content"
            >
              <div
                v-for="(element, index) in state.oldFunctionalExam"
                :key="`exam-${index}`"
                class="history-timeline-item"
              >
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.exam"
                >
                </HistoryDetailsCard>
              </div>
            </div>
            <div v-else class="history-empty-state">
              <Message
                :title="$t('patientHistoryView.message.1.title')"
                :content="$t('patientHistoryView.message.1.content')"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.patient-form-modern {
  width: 100%;
  height: 100%;
}

.form-layout-modern {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  height: 100%;
  position: relative;
  overflow: visible;
}

/* Ensure the collapsed indicator container has space */
.form-layout-modern:has(.history-collapsed-indicator) {
  position: relative;
}

.form-layout-modern:has(.form-history-section.collapsed) .form-input-section {
  grid-column: 1 / -1;
}

.form-input-section,
.form-history-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  transition: all 0.3s ease;
}

.form-history-section {
  position: relative;
  overflow: hidden;
}

.form-history-section.collapsed {
  width: 0;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: none;
  overflow: visible;
  position: relative;
}

/* Collapsed Indicator - Always visible on the right edge, similar to sidebar toggle */
.history-collapsed-indicator {
  position: absolute;
  right: -12px;
  top: 0.25rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 36px;
  height: 56px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem 0 0 0.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  padding: 0.5rem 0.3rem;
  pointer-events: auto;
}

.history-collapsed-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.history-collapsed-indicator i {
  font-size: 1rem;
}

.history-collapsed-indicator i:first-child {
  font-size: 1.1rem;
}

/* Form Input Section */
.form-section-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.form-section-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.form-section-title {
  flex: 1;
}

.form-title-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.form-title-subtitle {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
  line-height: 1.4;
}

/* Form Fields */
.form-field-modern {
  margin-bottom: 0.75rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.6;
  background: white;
  transition: all 0.3s ease;
  font-family: inherit;
  resize: vertical;
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  background: white;
}

.form-control-modern:disabled {
  background: rgba(0, 0, 0, 0.03);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-invalid {
  border-color: #dc3545 !important;
}

.form-control-invalid:focus {
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
}

.form-field-hint {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.character-count {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.form-errors-modern {
  margin-top: 1rem;
}

/* History Section */
.history-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.history-header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.history-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.history-header-icon {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.history-header-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.history-sort-control {
  display: flex;
  align-items: center;
}

.sort-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  margin: 0;
}

.sort-toggle-label:hover {
  background: rgba(0, 0, 0, 0.05);
}

.sort-toggle-input {
  margin: 0;
  cursor: pointer;
}

.sort-toggle-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.sort-asc {
  background-color: #28a745;
}

.sort-desc {
  background-color: #dc3545;
}

.history-timeline {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
}

.history-timeline-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-timeline-item {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

/* Scrollbar Styling */
.history-timeline::-webkit-scrollbar {
  width: 6px;
}

.history-timeline::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.history-timeline::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.history-timeline::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Responsive Design */
@media (max-width: 991px) {
  .form-layout-modern {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .form-section-header {
    margin-bottom: 1rem;
  }

  .history-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}

/* Speech Recognition Styles */
.speech-recognition-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.speech-recognition-btn span {
  display: inline !important;
  visibility: visible !important;
  opacity: 1 !important;
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

.position-relative {
  position: relative;
}

.speech-recording-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  background: rgba(220, 53, 69, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
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
  border-radius: 0.375rem;
  margin-top: 0.25rem;
}
</style>
