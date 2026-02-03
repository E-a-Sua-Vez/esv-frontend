<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import { getControlReasonsTypes, getControlStatusTypes } from '../../../shared/utils/data.ts';
import HistoryControlDetailsCard from '../common/HistoryControlDetailsCard.vue';

export default {
  name: 'ControlForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, Message, HistoryControlDetailsCard },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    onSave: { type: Function, default: () => {} },
    onUpdate: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { commerce, cacheData, patientHistoryData, toggles, errorsAdd } = toRefs(props);

    const { receiveData, onSave, onUpdate } = props;

    const state = reactive({
      newControl: {},
      oldControl: [],
      status: [],
      reasons: [],
      clientId: undefined,
      captcha: false,
      controlError: false,
      showAdd: false,
      date: new Date().toISOString().slice(0, 10),
      status: 'PENDING',
      reason: undefined,
      result: undefined,
      errorsAddControl: [],
      asc: true,
      showHistory: false,
    });

    // Speech Recognition
    const isListeningSpeech = ref(false);
    const isSpeechSupported = ref(false);
    let speechRecognition = null;

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.reasons = getControlReasonsTypes();
        state.statuses = getControlStatusTypes();
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldControl = patientHistoryData.value.control;
          state.clientId = patientHistoryData.value.clientId;
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if (!state.oldControl && cacheData.value) {
          state.newControl = cacheData.value;
        }

        // Initialize Speech Recognition
        initializeSpeechRecognition();

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newControl);
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldControl && state.oldControl.length > 0) {
        let elementsSorted = [];
        const elements = state.oldControl;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldControl = elementsSorted;
      }
    };

    const validateAdd = control => {
      state.errorsAddControl = [];
      if (!control.reason || control.reason.length === 0) {
        state.reasonError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.reason');
      } else {
        state.reasonError = false;
      }
      if (!control.status || control.status.length === 0) {
        state.statusError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.status');
      } else {
        state.statusError = false;
      }
      if (!control.scheduledDate || control.scheduledDate.length === 0) {
        state.scheduledDateError = true;
        state.errorsAddControl.push('patientHistoryView.validate.control.scheduledDate');
      } else {
        state.scheduledDateError = false;
      }
      if (state.errorsAddControl.length === 0) {
        return true;
      }
      return false;
    };

    const addControl = () => {
      state.newControl = {
        reason: state.reason || undefined,
        status: state.status || undefined,
        scheduledDate: state.date || undefined,
        controlResult: state.result || undefined,
      };
      if (validateAdd(state.newControl)) {
        sendData();
        onSave();
        resetAdd();
        state.showAdd = false;
      }
    };

    const updateControl = (index, reason, status, controlResult) => {
      if (state.oldControl && state.oldControl.length > 0) {
        const element = state.oldControl[index];
        if (reason) {
          element.reason = reason;
        }
        if (status) {
          element.status = status;
        }
        if (controlResult) {
          element.controlResult = controlResult;
        }
        onUpdate(state.oldControl);
      }
    };

    const resetAdd = () => {
      state.date = new Date().toISOString().slice(0, 10);
      state.status = 'PENDING';
      state.reason = undefined;
      state.result = undefined;
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.control &&
          patientHistoryData.value.control.length > 0 &&
          patientHistoryData.value.control[0]
        )
          state.oldControl = patientHistoryData.value.control;
      }
      loading.value = false;
    });

    // Speech Recognition Functions
    const initializeSpeechRecognition = () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        isSpeechSupported.value = true;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = 'pt-BR';

        speechRecognition.onresult = event => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            state.result = (state.result || '') + finalTranscript + ' ';
          }
        };

        speechRecognition.onerror = event => {
          console.error('Speech recognition error:', event.error);
          isListeningSpeech.value = false;
        };

        speechRecognition.onend = () => {
          isListeningSpeech.value = false;
        };
      }
    };

    const toggleSpeechRecognition = () => {
      if (!speechRecognition) return;

      if (isListeningSpeech.value) {
        speechRecognition.stop();
        isListeningSpeech.value = false;
      } else {
        speechRecognition.start();
        isListeningSpeech.value = true;
      }
    };

    return {
      state,
      loading,
      commerce,
      toggles,
      errorsAdd,
      sendData,
      checkAsc,
      addControl,
      showAdd,
      updateControl,
      // Speech Recognition
      isListeningSpeech,
      isSpeechSupported,
      toggleSpeechRecognition,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-calendar-event"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.control') }}</h3>
        <p class="form-header-subtitle">Gerencie os controles e retornos do paciente</p>
      </div>
    </div>
    <div class="form-layout-modern">
      <!-- Form Input Section -->
      <div class="form-input-section">
        <div class="form-actions-modern">
          <button
            class="btn-add-control"
            @click="showAdd()"
          >
            <i class="bi bi-plus-circle-fill me-2"></i>
            {{ $t('patientHistoryView.addControl') }}
          </button>
        </div>

        <!-- Add Control Form -->
        <div v-if="state.showAdd" class="add-control-form">
          <div class="add-control-header">
            <h5 class="add-control-title">
              <i class="bi bi-plus-square me-2"></i>
              Novo Controle
            </h5>
            <button class="btn-close-form" @click="showAdd()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="form-group-content">
            <div class="form-row-modern">
              <div class="form-field-modern">
                <label class="form-label-modern" for="select-reason">
                  <i class="bi bi-question-circle me-1"></i>
                  {{ $t('patientHistoryView.controlReason') }}
                </label>
                <select
                  id="select-reason"
                  class="form-control-modern form-select-modern"
                  v-model="state.reason"
                  :class="{ 'form-control-invalid': state.reasonError }"
                >
                  <option value="">{{ $t('patientHistoryView.select') || 'Selecione...' }}</option>
                  <option v-for="reason in state.reasons" :key="reason.name" :value="reason.id">
                    {{ $t(`controlReasonTypes.${reason.id}`) }}
                  </option>
                </select>
              </div>

              <div class="form-field-modern">
                <label class="form-label-modern" for="select-status">
                  <i class="bi bi-info-circle me-1"></i>
                  {{ $t('patientHistoryView.controlStatus') }}
                </label>
                <select
                  id="select-status"
                  class="form-control-modern form-select-modern"
                  v-model="state.status"
                  :class="{ 'form-control-invalid': state.statusError }"
                >
                  <option v-for="status in state.statuses" :key="status.name" :value="status.id">
                    {{ $t(`controlStatusTypes.${status.id}`) }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row-modern">
              <div class="form-field-modern">
                <label class="form-label-modern" for="control-date">
                  <i class="bi bi-calendar3 me-1"></i>
                  {{ $t('patientHistoryView.controlDate') }}
                </label>
                <input
                  id="control-date"
                  class="form-control-modern"
                  type="date"
                  v-model="state.date"
                  :class="{ 'form-control-invalid': state.scheduledDateError }"
                />
              </div>
            </div>

            <div class="form-row-modern">
              <div class="form-field-modern">
                <label class="form-label-modern" for="control-result">
                  <i class="bi bi-file-text me-1"></i>
                  {{ $t('businessPatientHistoryItemAdmin.comment') || 'Resultado/Comentário' }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm ms-2 btn-outline-secondary d-flex align-items-center"
                    :class="{ recording: isListeningSpeech }"
                    @click="toggleSpeechRecognition"
                    :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
                  >
                    <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                </label>
                <textarea
                  id="control-result"
                  class="form-control-modern"
                  rows="4"
                  :max="500"
                  v-model="state.result"
                ></textarea>
                <div class="form-field-hint" v-if="state.result">
                  <span class="character-count">{{ (state.result || '').length }}/500</span>
                </div>
              </div>
            </div>

            <div class="form-actions-inline">
              <button
                class="btn-save-control"
                @click="addControl()"
              >
                <i class="bi bi-check-circle-fill me-2"></i>
                {{ $t('patientHistoryView.add') }}
              </button>
              <button class="btn-cancel-control" @click="showAdd()">
                <i class="bi bi-x-circle me-2"></i>
                Cancelar
              </button>
            </div>

            <div
              class="form-errors-modern"
              v-if="state.errorsAddControl && state.errorsAddControl.length > 0"
            >
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in state.errorsAddControl" :key="index">
                    {{ $t(error) }}
                  </li>
                </template>
              </Warning>
            </div>
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
              <label class="sort-toggle-label" for="asc-control">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-control"
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
              v-if="state.oldControl && state.oldControl.length > 0 && state.oldControl[0]"
              class="history-timeline-content"
            >
              <div
                v-for="(element, index) in state.oldControl"
                :key="`control-${index}`"
                class="history-timeline-item"
              >
                <HistoryControlDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.scheduledDate"
                  :commerce="commerce"
                  :client-id="state.clientId"
                  :content="element.controlResult"
                  :status="element.status"
                  :reason="element.reason"
                  :toggles="toggles"
                  :index="index"
                  @onSave="updateControl"
                >
                </HistoryControlDetailsCard>
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
  width: 36px;
  height: 36px;
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
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.15rem 0;
  line-height: 1.3;
}

.form-title-subtitle {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
  line-height: 1.4;
}

/* Add Button */
.form-actions-modern {
  margin-bottom: 0.5rem;
}

.btn-add-control {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  height: 32px;
}

.btn-add-control:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-add-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Add Control Form */
.add-control-form {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 0.875rem;
  margin-bottom: 1rem;
  animation: slideDown 0.2s ease;
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

.add-control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.add-control-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
}

.btn-close-form {
  background: none;
  border: none;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.btn-close-form:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

/* Form Fields */
.form-group-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form-row-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.625rem;
}

.form-field-modern {
  display: flex;
  flex-direction: column;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.375rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s ease;
  font-family: inherit;
  height: 36px;
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

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
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

/* Form Actions */
.form-actions-inline {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.625rem;
}

.btn-save-control {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 34px;
}

.btn-save-control:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-save-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel-control {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 34px;
}

.btn-cancel-control:hover {
  background: rgba(0, 0, 0, 0.1);
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

  .form-row-modern {
    grid-template-columns: 1fr;
  }
}

/* Voice Recognition Button with btn-action styles */
.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  height: 32px;
  min-width: fit-content;
}

.btn-action-secondary {
  background: rgba(255, 255, 255, 0.9);
  color: #6c757d;
  border-color: #e9ecef;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.btn-action-secondary:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #dde2e6;
  color: #495057;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-action-secondary.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  border-color: #dc2626;
  color: white;
  animation: pulse-recording 2s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-action-secondary.recording:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border-color: #b91c1c;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
}

.btn-action-secondary.recording i {
  animation: mic-pulse 1.5s ease-in-out infinite;
}

@keyframes pulse-recording {
  0%,
  100% {
    transform: translateY(-1px) scale(1);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.5);
  }
}

@keyframes mic-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.9;
  }
}
</style>
