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
import {
  searchCIE10Codes,
  getCIE10CodeByCode,
  validateCIE10Code,
} from '../../../application/services/cie10';
import { globalStore } from '../../../stores';
import { dateYYYYMMDD } from '../../../shared/utils/date';

export default {
  name: 'DiagnosticForm',
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
      newDiagnostic: {
        diagnostic: '',
        cie10Code: '',
        cie10Description: '',
        type: 'principal',
        confirmation: 'presuntivo',
        laterality: undefined,
      },
      oldDiagnostic: [],
      captcha: false,
      diagnosticError: false,
      cie10Error: false,
      cie10ErrorMessage: '',
      asc: true,
      showHistory: false,
      // CIE-10
      cie10SearchTerm: '',
      cie10SearchResults: [],
      cie10Searching: false,
      cie10Selected: null,
      showCIE10Search: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldDiagnostic = patientHistoryData.value.diagnostic || [];
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          if (state.oldDiagnostic && state.oldDiagnostic.length > 0) {
            const sortedDiagnostics = [...state.oldDiagnostic].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            // Buscar registro del día de hoy
            const todayDiagnostic = sortedDiagnostics.find(
              diagnostic => dateYYYYMMDD(diagnostic.createdAt) === dateYYYYMMDD(new Date())
            );
            // Si existe registro de hoy, usarlo, sino usar el más reciente
            const diagnosticToLoad = todayDiagnostic || sortedDiagnostics[0];
            if (diagnosticToLoad) {
              state.newDiagnostic = {
                ...diagnosticToLoad,
                diagnostic: diagnosticToLoad.diagnostic || '',
              };
            }
          }
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if (!state.newDiagnostic.diagnostic && cacheData.value) {
          state.newDiagnostic = {
            ...cacheData.value,
            diagnostic: cacheData.value.diagnostic || '',
          };
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      // Validar que CIE-10 sea obligatorio
      if (!state.newDiagnostic.cie10Code || state.newDiagnostic.cie10Code.trim() === '') {
        state.cie10Error = true;
        state.cie10ErrorMessage = 'El código CIE-10 es obligatorio';
        return;
      }

      // Validar que el código CIE-10 sea válido
      if (state.diagnosticError) {
        state.cie10Error = true;
        state.cie10ErrorMessage = 'El código CIE-10 ingresado no es válido';
        return;
      }

      // Si todo está bien, limpiar errores y enviar
      state.cie10Error = false;
      state.cie10ErrorMessage = '';
      receiveData(state.newDiagnostic);
    };

    // CIE-10 Search
    const searchCIE10 = async () => {
      if (!state.cie10SearchTerm || state.cie10SearchTerm.length < 2) {
        state.cie10SearchResults = [];
        return;
      }
      try {
        state.cie10Searching = true;
        const results = await searchCIE10Codes(state.cie10SearchTerm, 20);
        // Ensure results is an array
        state.cie10SearchResults = Array.isArray(results) ? results : [];
      } catch (error) {
        console.error('Error searching CIE-10:', error);
        state.cie10SearchResults = [];
      } finally {
        state.cie10Searching = false;
      }
    };

    const selectCIE10Code = async code => {
      try {
        // code is already a CIE10Code object from search results
        if (code && code.code) {
          state.newDiagnostic.cie10Code = code.code;
          state.newDiagnostic.cie10Description = code.description;
          state.cie10Selected = code;
          state.showCIE10Search = false;
          state.cie10SearchTerm = '';
          state.cie10Error = false;
          state.diagnosticError = false;
          sendData();
        }
      } catch (error) {
        console.error('Error selecting CIE-10:', error);
        state.cie10Error = true;
        state.cie10ErrorMessage = 'Error al seleccionar código CIE-10';
      }
    };

    const validateCIE10 = async () => {
      if (!state.newDiagnostic.cie10Code || state.newDiagnostic.cie10Code.trim() === '') {
        state.cie10Error = true;
        state.cie10ErrorMessage = 'El código CIE-10 es obligatorio';
        state.diagnosticError = true;
        return;
      }
      try {
        const validation = await validateCIE10Code(state.newDiagnostic.cie10Code);
        if (!validation || !validation.valid) {
          state.diagnosticError = true;
          state.cie10Error = true;
          state.cie10ErrorMessage = 'El código CIE-10 ingresado no es válido';
        } else {
          state.diagnosticError = false;
          state.cie10Error = false;
          state.cie10ErrorMessage = '';
          if (validation.code && validation.code.description) {
            state.newDiagnostic.cie10Description = validation.code.description;
            state.cie10Selected = validation.code;
          }
          sendData();
        }
      } catch (error) {
        console.error('Error validating CIE-10:', error);
        state.diagnosticError = true;
        state.cie10Error = true;
        state.cie10ErrorMessage = 'Error al validar código CIE-10';
      }
    };

    const handleCIE10Blur = () => {
      // Delay hiding dropdown to allow click events on dropdown items
      setTimeout(() => {
        state.showCIE10Search = false;
      }, 200);
    };

    // Speech recognition
    const {
      isListening: isListeningSpeech,
      isSupported: isSpeechSupported,
      error: speechError,
      startListening: startSpeechListening,
      stopListening: stopSpeechListening,
    } = useSpeechRecognition();

    const handleSpeechResult = interimText => {
      // Show interim results (optional)
    };

    const handleSpeechFinalResult = finalText => {
      // Append transcribed text with timestamp as new paragraph
      const currentText = state.newDiagnostic.diagnostic || '';
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

      state.newDiagnostic.diagnostic = newText;
      sendData();
    };

    const toggleSpeechRecognition = () => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
      } else {
        const language = commerce.value?.localeInfo?.language || 'pt-BR';
        startSpeechListening(handleSpeechResult, handleSpeechFinalResult, language);
      }
    };

    const clearField = () => {
      state.newDiagnostic.diagnostic = '';
      sendData();
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldDiagnostic && state.oldDiagnostic.length > 0) {
        let elementsSorted = [];
        const elements = state.oldDiagnostic;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldDiagnostic = elementsSorted;
      }
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.diagnostic &&
          patientHistoryData.value.diagnostic.length > 0 &&
          patientHistoryData.value.diagnostic[0]
        ) {
          state.oldDiagnostic = patientHistoryData.value.diagnostic;
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          const sortedDiagnostics = [...state.oldDiagnostic].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Buscar registro del día de hoy
          const todayDiagnostic = sortedDiagnostics.find(
            diagnostic => dateYYYYMMDD(diagnostic.createdAt) === dateYYYYMMDD(new Date())
          );
          // Si existe registro de hoy, usarlo, sino usar el más reciente
          const diagnosticToLoad = todayDiagnostic || sortedDiagnostics[0];
          if (diagnosticToLoad) {
            state.newDiagnostic = {
              ...diagnosticToLoad,
              diagnostic: diagnosticToLoad.diagnostic || '',
            };
          } else {
            state.newDiagnostic = {
              ...state.newDiagnostic,
              diagnostic: '',
            };
          }
        } else {
          state.newDiagnostic = {
            ...state.newDiagnostic,
            diagnostic: '',
          };
        }
      } else {
        state.newDiagnostic = {
          ...state.newDiagnostic,
          diagnostic: '',
        };
      }
      loading.value = false;
    });

    const store = globalStore();

    const handleTemplateSelected = content => {
      state.newDiagnostic.diagnostic = content;
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
      // CIE-10
      searchCIE10,
      selectCIE10Code,
      validateCIE10,
      handleCIE10Blur,
      // Templates
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
        <i class="bi bi-file-earmark-medical-fill"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.diagnostic') }}</h3>
        <p class="form-header-subtitle">Registre o diagnóstico do paciente</p>
      </div>
    </div>
    <div class="form-layout-modern">
      <!-- Form Input Section -->
      <div class="form-input-section">
        <!-- CIE-10 Code Field -->
        <div class="form-field-modern">
          <label class="form-label-modern" for="cie10-code">
            <i class="bi bi-code-square me-2"></i>
            Código CIE-10 <span class="text-danger">*</span>
          </label>
          <div class="position-relative">
            <div class="input-group">
              <input
                :disabled="!toggles['patient.history.edit']"
                type="text"
                class="form-control-modern"
                id="cie10-code"
                v-model="state.cie10SearchTerm"
                @input="searchCIE10"
                @focus="state.showCIE10Search = true"
                @blur="handleCIE10Blur"
                placeholder="Buscar código CIE-10 (ej: E11, I10)..."
                :class="{
                  'form-control-invalid':
                    state.cie10Error || (state.diagnosticError && !state.newDiagnostic.cie10Code),
                }"
              />
              <input
                :disabled="!toggles['patient.history.edit']"
                type="text"
                class="form-control-modern"
                v-model="state.newDiagnostic.cie10Code"
                @blur="validateCIE10"
                placeholder="Código"
                style="max-width: 120px"
                :class="{
                  'form-control-invalid':
                    state.cie10Error || (state.diagnosticError && !state.newDiagnostic.cie10Code),
                }"
              />
            </div>
            <!-- CIE-10 Search Results Dropdown -->
            <div
              v-if="state.showCIE10Search && state.cie10SearchResults.length > 0"
              class="cie10-search-dropdown"
              @mousedown.prevent
            >
              <div
                v-for="(result, index) in state.cie10SearchResults"
                :key="index"
                class="cie10-search-item"
                @click="selectCIE10Code(result)"
              >
                <div class="cie10-code-badge">{{ result.code }}</div>
                <div class="cie10-description">{{ result.description }}</div>
              </div>
            </div>
            <div v-if="state.cie10Selected" class="cie10-selected-info mt-2">
              <span class="badge bg-primary">{{ state.cie10Selected.code }}</span>
              <span class="ms-2">{{ state.cie10Selected.description }}</span>
            </div>
            <div
              v-if="state.newDiagnostic.cie10Description && !state.cie10Selected"
              class="cie10-selected-info mt-2"
            >
              <span class="text-muted">{{ state.newDiagnostic.cie10Description }}</span>
            </div>
            <div v-if="state.cie10Error" class="text-danger small mt-1">
              <i class="bi bi-exclamation-triangle me-1"></i>
              {{ state.cie10ErrorMessage }}
            </div>
          </div>
        </div>

        <!-- Diagnostic Type -->
        <div class="form-field-modern">
          <label class="form-label-modern">Tipo de Diagnóstico</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="state.newDiagnostic.type"
            @change="sendData"
          >
            <option value="principal">Principal</option>
            <option value="secundario">Secundario</option>
          </select>
        </div>

        <!-- Confirmation -->
        <div class="form-field-modern">
          <label class="form-label-modern">Confirmación</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="state.newDiagnostic.confirmation"
            @change="sendData"
          >
            <option value="presuntivo">Presuntivo</option>
            <option value="confirmado">Confirmado</option>
          </select>
        </div>

        <!-- Laterality (if applicable) -->
        <div class="form-field-modern" v-if="state.newDiagnostic.cie10Code">
          <label class="form-label-modern">Lateralidad (si aplica)</label>
          <select
            :disabled="!toggles['patient.history.edit']"
            class="form-control-modern"
            v-model="state.newDiagnostic.laterality"
            @change="sendData"
          >
            <option :value="undefined">No aplica</option>
            <option value="derecho">Derecho</option>
            <option value="izquierdo">Izquierdo</option>
            <option value="bilateral">Bilateral</option>
          </select>
        </div>

        <!-- Template Picker -->
        <div class="form-field-modern" v-if="store.commerce && store.user">
          <TemplatePicker
            :commerce-id="store.commerce.id"
            :doctor-id="store.user.id"
            template-type="diagnostic"
            :toggles="toggles"
            @template-selected="handleTemplateSelected"
          />
        </div>

        <!-- Diagnostic Description -->
        <div class="form-field-modern">
          <label class="form-label-modern" for="diagnostic-textarea">
            <i class="bi bi-clipboard-check me-2"></i>
            {{ $t('patientHistoryView.diagnostic') }} (Descripción)
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
              id="diagnostic-textarea"
              rows="6"
              :max="500"
              @keyup="sendData"
              @input="sendData"
              v-bind:class="{
                'form-control-invalid':
                  state.diagnosticError || (errorsAdd && errorsAdd.length > 0),
              }"
              v-model="state.newDiagnostic.diagnostic"
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
          <div class="form-field-hint" v-if="state.newDiagnostic.diagnostic">
            <span class="character-count"
              >{{ (state.newDiagnostic.diagnostic || '').length }}/500</span
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
              <label class="sort-toggle-label" for="asc-diagnostic">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-diagnostic"
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
              v-if="state.oldDiagnostic && state.oldDiagnostic.length > 0 && state.oldDiagnostic[0]"
              class="history-timeline-content"
            >
              <div
                v-for="(element, index) in state.oldDiagnostic"
                :key="`diagnostic-${index}`"
                class="history-timeline-item"
              >
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.diagnostic"
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

/* CIE-10 Search Styles */
.input-group {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  align-items: stretch;
}

.input-group .form-control-modern {
  flex: 1;
}

.input-group .form-control-modern:last-child {
  flex: 0 0 auto;
}

.cie10-search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 0.25rem;
}

.cie10-search-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background 0.2s ease;
}

.cie10-search-item:hover {
  background: rgba(0, 123, 255, 0.1);
}

.cie10-search-item:last-child {
  border-bottom: none;
}

.cie10-code-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.cie10-description {
  font-size: 0.9rem;
  color: var(--color-text);
}

.cie10-selected-info {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(40, 167, 69, 0.1);
  border-radius: 0.5rem;
  border-left: 3px solid #28a745;
}
</style>
