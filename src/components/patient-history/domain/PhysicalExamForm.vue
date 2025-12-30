<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import { dateYYYYMMDD } from '../../../shared/utils/date';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import HistoryDetailsWithItemsCard from '../common/HistoryDetailsWithItemsCard.vue';
import TemplatePicker from '../../medical-templates/domain/TemplatePicker.vue';
import { useSpeechRecognition } from '../composables/useSpeechRecognition';
import { globalStore } from '../../../stores';

export default {
  name: 'PhysicalExamForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    Message,
    HistoryDetailsCard,
    HistoryDetailsWithItemsCard,
    TemplatePicker,
  },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    patientHistoryItems: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { commerce, cacheData, patientHistoryData, toggles, errorsAdd, patientHistoryItems } =
      toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newPhysicalExam: { exam: '' },
      oldPhysicalExam: {},
      oldPhysicalExams: [],
      habitsList: [],
      habitsAux: {},
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
      // Append transcribed text as new paragraph
      const currentText = state.newPhysicalExam.exam || '';
      const newText =
        currentText && currentText.trim() !== ''
          ? `${currentText}\n\n${finalText}`
          : finalText;

      state.newPhysicalExam.exam = newText;
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
      state.newPhysicalExam.exam = '';
      sendData();
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryItems.value && patientHistoryItems.value.length > 0) {
          state.habitsList = patientHistoryItems.value.filter(habit =>
            ['PHYSICAL_EXAM'].includes(habit.type)
          );
          state.habitsList = state.habitsList.sort((a, b) => b.order - a.order);
        }
        // Inicializar con objeto vacío y campo exam vacío
        state.newPhysicalExam = { exam: '' };

        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldPhysicalExams = patientHistoryData.value.physicalExam || [];
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          if (state.oldPhysicalExams && state.oldPhysicalExams.length > 0) {
            const sortedExams = [...state.oldPhysicalExams].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            // Buscar registro del día de hoy
            const todayExam = sortedExams.find(
              exam => dateYYYYMMDD(exam.createdAt) === dateYYYYMMDD(new Date())
            );
            // Si existe registro de hoy, usarlo, sino usar el más reciente
            const examToLoad = todayExam || sortedExams[0];
            if (examToLoad) {
              state.oldPhysicalExam = examToLoad;
              state.habitsAux = examToLoad.examDetails || {};
              state.newPhysicalExam = {
                ...examToLoad,
                exam: examToLoad.exam || '',
              };
            }
          }
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if (!state.newPhysicalExam.exam && cacheData.value) {
          state.newPhysicalExam = {
            ...cacheData.value,
            exam: cacheData.value.exam || '',
          };
          state.habitsAux = state.newPhysicalExam.examDetails || {};
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newPhysicalExam);
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldPhysicalExams && state.oldPhysicalExams.length > 0) {
        let elementsSorted = [];
        const elements = state.oldPhysicalExams;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldPhysicalExams = elementsSorted;
      }
    };

    const checkItem = (item, event) => {
      if (item && item.id) {
        if (event.target.checked) {
          if (!state.habitsAux[item.id]) {
            state.habitsAux[item.id] = {
              id: item.id,
              name: item.name,
              active: true,
            };
          } else {
            state.habitsAux[item.id].active = true;
          }
        } else {
          if (state.habitsAux[item.id]) {
            delete state.habitsAux[item.id];
          }
        }
        state.newPhysicalExam.examDetails = state.habitsAux;
        sendData();
      }
    };

    const sendValue = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const value = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].value = value;
            state.habitsAux[item.id].name = item.name;
          } else {
            state.habitsAux[item.id] = { value, name: item.name };
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].value = undefined;
          }
        }
        state.newPhysicalExam.examDetails = state.habitsAux;
        sendData();
      }
    };

    const sendComment = (item, event) => {
      if (item && item.id) {
        if (event.target.value) {
          const comment = event.target.value;
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = comment;
          }
        } else {
          if (state.habitsAux[item.id]) {
            state.habitsAux[item.id].comment = undefined;
          }
        }
        state.newPhysicalExam.examDetails = state.habitsAux;
        sendData();
      }
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.physicalExam &&
          patientHistoryData.value.physicalExam.length > 0 &&
          patientHistoryData.value.physicalExam[0]
        ) {
          state.oldPhysicalExams = patientHistoryData.value.physicalExam;
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          const sortedExams = [...state.oldPhysicalExams].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Buscar registro del día de hoy
          const todayExam = sortedExams.find(
            exam => dateYYYYMMDD(exam.createdAt) === dateYYYYMMDD(new Date())
          );
          // Si existe registro de hoy, usarlo, sino usar el más reciente
          const examToLoad = todayExam || sortedExams[0];
          if (examToLoad) {
            state.oldPhysicalExam = examToLoad;
            state.habitsAux = examToLoad.examDetails || {};
            state.newPhysicalExam = {
              ...examToLoad,
              exam: examToLoad.exam || '',
            };
          } else {
            state.newPhysicalExam = { exam: '' };
          }
        } else {
          state.newPhysicalExam = { exam: '' };
        }
      } else {
        state.newPhysicalExam = { exam: '' };
      }
      loading.value = false;
    });

    const store = globalStore();
    const currentUser = ref(null);

    onBeforeMount(async () => {
      currentUser.value = await store.getCurrentUser;
    });

    const handleTemplateSelected = content => {
      state.newPhysicalExam.exam = content;
      sendData();
    };

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      sendValue,
      sendData,
      checkAsc,
      checkItem,
      sendComment,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      clearField,
      handleTemplateSelected,
      store,
      currentUser,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-thermometer"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.physicalExam') }}</h3>
        <p class="form-header-subtitle">Registre os valores do exame físico do paciente</p>
      </div>
    </div>
    <div class="form-layout-modern">
      <!-- Form Input Section -->
      <div class="form-input-section">
        <!-- Template Picker -->
        <div class="form-field-modern" v-if="commerce && commerce.id && currentUser && currentUser.id">
          <TemplatePicker
            :commerce-id="commerce.id"
            :doctor-id="currentUser.id"
            template-type="general"
            :toggles="toggles"
            @template-selected="handleTemplateSelected"
          />
        </div>

        <!-- Dynamic Exam Items -->
        <div class="exam-items-container">
          <div v-for="item in state.habitsList" :key="item.id">
            <div v-if="item.active === true && item.online === true" class="exam-item-card">
              <div class="exam-item-header">
                <div class="exam-item-badge">
                  <span class="badge badge-primary">{{ item.tag }}</span>
                </div>
                <div class="exam-item-title-wrapper">
                  <div
                    v-if="item.characteristics && item.characteristics.check"
                    class="exam-item-toggle"
                  >
                    <input
                      class="form-check-input exam-checkbox"
                      type="checkbox"
                      :name="item.name"
                      :id="`exam-item-${item.id}`"
                      :checked="
                        state.habitsAux &&
                        state.habitsAux[item.id] &&
                        state.habitsAux[item.id].active
                      "
                      @click="checkItem(item, $event)"
                    />
                    <label class="exam-item-label" :for="`exam-item-${item.id}`">
                      {{ item.name }}
                    </label>
                  </div>
                  <div v-else class="exam-item-label-static">
                    {{ item.name }}
                  </div>
                </div>
              </div>

              <div
                v-if="
                  !item.characteristics?.check ||
                  (state.habitsAux[item.id] && state.habitsAux[item.id].active)
                "
                class="exam-item-content"
              >
                <div
                  v-if="item.characteristics.value && item.characteristics.value === true"
                  class="exam-item-field"
                >
                  <label class="form-label-modern" :for="`value-${item.id}`">
                    <i class="bi bi-123 me-1"></i>
                    {{ $t('businessPatientHistoryItemAdmin.value') }}
                  </label>
                  <input
                    :id="`value-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    min="0"
                    max="1000"
                    type="number"
                    :value="state.habitsAux[item.id]?.value"
                    @keyup="sendValue(item, $event)"
                    class="form-control-modern"
                    placeholder="Digite o valor..."
                  />
                </div>

                <div
                  v-if="item.characteristics.comment && item.characteristics.comment === true"
                  class="exam-item-field"
                >
                  <label class="form-label-modern" :for="`comment-${item.id}`">
                    <i class="bi bi-chat-text me-1"></i>
                    {{ $t('businessPatientHistoryItemAdmin.comment') }}
                  </label>
                  <textarea
                    :id="`comment-${item.id}`"
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    rows="3"
                    :max="200"
                    :value="state.habitsAux[item.id]?.comment || ''"
                    @keyup="sendComment(item, $event)"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Template Picker -->
        <div class="form-field-modern" v-if="store.commerce && store.user">
          <TemplatePicker
            :commerce-id="store.commerce.id"
            :doctor-id="store.user.id"
            template-type="physical_exam"
            :toggles="toggles"
            @template-selected="handleTemplateSelected"
          />
        </div>

        <div class="form-field-modern general-comment">
          <label class="form-label-modern" for="physical-exam-comment">
            <i class="bi bi-file-text me-2"></i>
            {{ $t('businessPatientHistoryItemAdmin.comment') }}
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition"
              :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
            >
              <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
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
              id="physical-exam-comment"
              rows="6"
              :max="500"
              @keyup="sendData"
              v-bind:class="{ 'form-control-invalid': state.examError }"
              v-model="state.newPhysicalExam.exam"
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
          <div class="form-field-hint" v-if="state.newPhysicalExam.exam">
            <span class="character-count">{{ (state.newPhysicalExam.exam || '').length }}/500</span>
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
              <label class="sort-toggle-label" for="asc-physical">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-physical"
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
                state.oldPhysicalExams &&
                state.oldPhysicalExams.length > 0 &&
                state.oldPhysicalExams[0]
              "
              class="history-timeline-content"
            >
              <div
                v-for="(element, index) in state.oldPhysicalExams"
                :key="`exam-${index}`"
                class="history-timeline-item"
              >
                <HistoryDetailsWithItemsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :details="element.examDetails"
                  :content="element.exam"
                >
                </HistoryDetailsWithItemsCard>
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

/* Form Section Header */
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

/* Exam Items Container */
.exam-items-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.exam-item-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 1rem;
  transition: all 0.3s ease;
}

.exam-item-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.exam-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.exam-item-badge {
  flex-shrink: 0;
}

.badge-primary {
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.exam-item-title-wrapper {
  flex: 1;
}

.exam-item-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.exam-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
  margin: 0;
}

.exam-item-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  margin: 0;
}

.exam-item-label-static {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

.exam-item-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.exam-item-field {
  display: flex;
  flex-direction: column;
}

/* Form Fields */
.form-field-modern {
  margin-bottom: 0.75rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.65rem 0.875rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.625rem;
  font-size: 0.9rem;
  background: white;
  transition: all 0.3s ease;
  font-family: inherit;
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

.general-comment {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid rgba(0, 0, 0, 0.05);
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
  border-radius: 50%;
  border: none;
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
