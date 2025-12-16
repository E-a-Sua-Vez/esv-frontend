<template>
  <div class="patient-form-modern">
    <div class="form-layout-modern">
      <div class="form-input-section">
        <div class="form-section-header">
          <div class="form-section-icon">
            <i class="bi bi-prescription"></i>
          </div>
          <div class="form-section-title">
            <h4 class="form-title-text">Receta Médica</h4>
            <p class="form-title-subtitle">Crear receta estructurada con medicamentos</p>
          </div>
        </div>

        <!-- Clinical Alerts Banner -->
        <ClinicalAlertsBanner
          v-if="alerts && alerts.length > 0"
          :alerts="alerts"
          @acknowledge="handleAcknowledgeAlert"
        />

        <!-- Medications List -->
        <div class="medications-section">
          <div class="section-header">
            <h5>Medicamentos</h5>
            <button
              v-if="toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-primary"
              @click="addMedication"
            >
              <i class="bi bi-plus-circle me-1"></i>
              Agregar Medicamento
            </button>
          </div>

          <div v-if="medications.length === 0" class="empty-state">
            <Message
              title="No hay medicamentos"
              content="Agregue al menos un medicamento para crear la receta"
            />
          </div>

          <div v-else class="medications-list">
            <div v-for="(med, index) in medications" :key="index" class="medication-card">
              <div class="medication-header">
                <span class="medication-number">{{ index + 1 }}</span>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-danger"
                  @click="removeMedication(index)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>

              <!-- Medication Search -->
              <div class="form-field-modern">
                <label class="form-label-modern">Medicamento *</label>
                <MedicationSearch
                  :disabled="!toggles['patient.history.edit']"
                  :selected-medication="med.medication"
                  @select="medication => selectMedication(index, medication)"
                  @validate-interactions="validateInteractions"
                />
              </div>

              <!-- Dosage -->
              <div class="form-row">
                <div class="form-field-modern">
                  <label class="form-label-modern">Dosis *</label>
                  <input
                    :disabled="!toggles['patient.history.edit']"
                    type="text"
                    class="form-control-modern"
                    v-model="med.dosage"
                    placeholder="ej: 500mg"
                    @input="sendData"
                  />
                </div>
                <div class="form-field-modern">
                  <label class="form-label-modern">Frecuencia *</label>
                  <input
                    :disabled="!toggles['patient.history.edit']"
                    type="text"
                    class="form-control-modern"
                    v-model="med.frequency"
                    placeholder="ej: cada 8 horas"
                    @input="sendData"
                  />
                </div>
              </div>

              <!-- Duration and Quantity -->
              <div class="form-row">
                <div class="form-field-modern">
                  <label class="form-label-modern">Duración (días) *</label>
                  <input
                    :disabled="!toggles['patient.history.edit']"
                    type="number"
                    class="form-control-modern"
                    v-model.number="med.duration"
                    min="1"
                    @input="sendData"
                  />
                </div>
                <div class="form-field-modern">
                  <label class="form-label-modern">Cantidad Total *</label>
                  <input
                    :disabled="!toggles['patient.history.edit']"
                    type="number"
                    class="form-control-modern"
                    v-model.number="med.quantity"
                    min="1"
                    @input="sendData"
                  />
                </div>
              </div>

              <!-- Route and Refills -->
              <div class="form-row">
                <div class="form-field-modern">
                  <label class="form-label-modern">Vía de Administración *</label>
                  <select
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    v-model="med.route"
                    @change="sendData"
                  >
                    <option value="">Seleccione...</option>
                    <option value="oral">Oral</option>
                    <option value="tópica">Tópica</option>
                    <option value="inyectable">Inyectable</option>
                    <option value="intramuscular">Intramuscular</option>
                    <option value="intravenosa">Intravenosa</option>
                    <option value="subcutánea">Subcutánea</option>
                    <option value="oftálmica">Oftálmica</option>
                    <option value="ótica">Ótica</option>
                    <option value="nasal">Nasal</option>
                    <option value="inhalatoria">Inhalatoria</option>
                  </select>
                </div>
                <div class="form-field-modern">
                  <label class="form-label-modern">Refuerzos Permitidos</label>
                  <input
                    :disabled="!toggles['patient.history.edit']"
                    type="number"
                    class="form-control-modern"
                    v-model.number="med.refillsAllowed"
                    min="0"
                    @input="sendData"
                  />
                </div>
              </div>

              <!-- Instructions -->
              <div class="form-field-modern">
                <label class="form-label-modern">Indicaciones Especiales</label>
                <div class="position-relative">
                  <textarea
                    :disabled="!toggles['patient.history.edit']"
                    class="form-control-modern"
                    v-model="med.instructions"
                    rows="2"
                    placeholder="ej: Tomar con alimentos, evitar alcohol..."
                    @input="sendData"
                  ></textarea>
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm speech-recognition-btn"
                    :class="{
                      'btn-danger':
                        isListeningSpeech &&
                        currentSpeechField === 'medInstructions' &&
                        currentSpeechMedIndex === index,
                      'btn-outline-primary':
                        !isListeningSpeech ||
                        currentSpeechField !== 'medInstructions' ||
                        currentSpeechMedIndex !== index,
                    }"
                    @click="toggleSpeechRecognition('medInstructions', index)"
                    :title="
                      isListeningSpeech &&
                      currentSpeechField === 'medInstructions' &&
                      currentSpeechMedIndex === index
                        ? 'Parar gravação'
                        : 'Iniciar gravação de voz'
                    "
                  >
                    <i
                      :class="
                        isListeningSpeech &&
                        currentSpeechField === 'medInstructions' &&
                        currentSpeechMedIndex === index
                          ? 'bi bi-mic-fill'
                          : 'bi bi-mic'
                      "
                    ></i>
                    <span class="ms-1 d-inline">{{
                      isListeningSpeech &&
                      currentSpeechField === 'medInstructions' &&
                      currentSpeechMedIndex === index
                        ? 'Gravando...'
                        : 'Voz'
                    }}</span>
                  </button>
                  <div
                    v-if="
                      isListeningSpeech &&
                      currentSpeechField === 'medInstructions' &&
                      currentSpeechMedIndex === index
                    "
                    class="speech-recording-indicator"
                  >
                    <span class="recording-dot"></span>
                    <span>Gravando...</span>
                  </div>
                  <div
                    v-if="
                      speechError &&
                      currentSpeechField === 'medInstructions' &&
                      currentSpeechMedIndex === index
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

        <!-- General Instructions -->
        <div class="form-field-modern">
          <label class="form-label-modern">Instrucciones Generales</label>
          <div class="position-relative">
            <textarea
              :disabled="!toggles['patient.history.edit']"
              class="form-control-modern"
              v-model="generalInstructions"
              rows="3"
              placeholder="Instrucciones generales para el paciente..."
              @input="sendData"
            ></textarea>
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm speech-recognition-btn"
              :class="{
                'btn-danger': isListeningSpeech && currentSpeechField === 'generalInstructions',
                'btn-outline-primary':
                  !isListeningSpeech || currentSpeechField !== 'generalInstructions',
              }"
              @click="toggleSpeechRecognition('generalInstructions')"
              :title="
                isListeningSpeech && currentSpeechField === 'generalInstructions'
                  ? 'Parar gravação'
                  : 'Iniciar gravação de voz'
              "
            >
              <i
                :class="
                  isListeningSpeech && currentSpeechField === 'generalInstructions'
                    ? 'bi bi-mic-fill'
                    : 'bi bi-mic'
                "
              ></i>
              <span class="ms-1 d-inline">{{
                isListeningSpeech && currentSpeechField === 'generalInstructions'
                  ? 'Gravando...'
                  : 'Voz'
              }}</span>
            </button>
            <div
              v-if="isListeningSpeech && currentSpeechField === 'generalInstructions'"
              class="speech-recording-indicator"
            >
              <span class="recording-dot"></span>
              <span>Gravando...</span>
            </div>
            <div
              v-if="speechError && currentSpeechField === 'generalInstructions'"
              class="speech-error-message text-danger small mt-1"
            >
              {{ speechError }}
            </div>
          </div>
        </div>

        <!-- Validity -->
        <div class="form-field-modern">
          <label class="form-label-modern">Validez de la Receta (días)</label>
          <input
            :disabled="!toggles['patient.history.edit']"
            type="number"
            class="form-control-modern"
            v-model.number="validityDays"
            min="1"
            max="90"
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
import { ref, reactive, computed, watch } from 'vue';
import Warning from '../../common/Warning.vue';
import Message from '../../common/Message.vue';
import MedicationSearch from './MedicationSearch.vue';
import ClinicalAlertsBanner from '../../clinical-alerts/domain/ClinicalAlertsBanner.vue';
import { checkAllergies, checkInteractions } from '../../../application/services/clinical-alerts';
import { useSpeechRecognition } from '../../patient-history/composables/useSpeechRecognition';

export default {
  name: 'PrescriptionForm',
  components: {
    Warning,
    Message,
    MedicationSearch,
    ClinicalAlertsBanner,
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
    const medications = ref([]);
    const generalInstructions = ref('');
    const validityDays = ref(30);
    const alerts = ref([]);

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
    const currentSpeechMedIndex = ref(null);

    const handleSpeechResult = interimText => {
      // Optional: show interim results in real-time
    };

    const handleSpeechFinalResult = finalText => {
      if (!currentSpeechField.value) return;

      const field = currentSpeechField.value;
      if (field === 'generalInstructions') {
        generalInstructions.value = appendTranscriptionWithTimestamp(
          generalInstructions.value,
          finalText
        );
      } else if (field === 'medInstructions' && currentSpeechMedIndex.value !== null) {
        const med = medications.value[currentSpeechMedIndex.value];
        if (med) {
          med.instructions = appendTranscriptionWithTimestamp(med.instructions || '', finalText);
        }
      }
      sendData();
    };

    const toggleSpeechRecognition = (fieldName, medIndex = null) => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
        currentSpeechField.value = null;
        currentSpeechMedIndex.value = null;
      } else {
        currentSpeechField.value = fieldName;
        currentSpeechMedIndex.value = medIndex;
        const language =
          props.commerce?.localeInfo?.language || props.commerce?.language || 'pt-BR';
        startSpeechListening(handleSpeechResult, handleSpeechFinalResult, language);
      }
    };

    const addMedication = () => {
      medications.value.push({
        medicationId: '',
        medication: null,
        dosage: '',
        frequency: '',
        duration: 7,
        quantity: 1,
        route: '',
        instructions: '',
        refillsAllowed: 0,
      });
    };

    const removeMedication = index => {
      medications.value.splice(index, 1);
      sendData();
    };

    const selectMedication = (index, medication) => {
      medications.value[index].medicationId = medication.id;
      medications.value[index].medication = medication;
      validateInteractions();
      sendData();
    };

    const validateInteractions = async () => {
      const medicationIds = medications.value.filter(m => m.medicationId).map(m => m.medicationId);

      if (medicationIds.length < 2) {
        alerts.value = [];
        return;
      }

      try {
        const interactionAlerts = await checkInteractions(props.client?.id, medicationIds);
        alerts.value = interactionAlerts || [];
      } catch (error) {
        console.error('Error validating interactions:', error);
      }
    };

    const handleAcknowledgeAlert = async alertId => {
      // TODO: Implement acknowledge
      alerts.value = alerts.value.filter(a => a.id !== alertId);
    };

    const sendData = () => {
      const prescriptionData = {
        medications: medications.value.map(med => ({
          medicationId: med.medicationId,
          medicationName: med.medication?.name || '',
          commercialName: med.medication?.commercialName,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          quantity: med.quantity,
          route: med.route,
          instructions: med.instructions,
          refillsAllowed: med.refillsAllowed || 0,
        })),
        instructions: generalInstructions.value,
        validUntil: new Date(Date.now() + validityDays.value * 24 * 60 * 60 * 1000).toISOString(),
      };
      props.receiveData(prescriptionData);
    };

    return {
      medications,
      generalInstructions,
      validityDays,
      alerts,
      addMedication,
      removeMedication,
      selectMedication,
      validateInteractions,
      handleAcknowledgeAlert,
      sendData,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      currentSpeechField,
      currentSpeechMedIndex,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.medications-section {
  margin: 1.5rem 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.medications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.medication-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  background: white;
  box-shadow: var(--shadow-sm);
}

.medication-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.medication-number {
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.empty-state {
  padding: 2rem;
  text-align: center;
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
