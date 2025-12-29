<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import PrescriptionForm from '../../prescriptions/domain/PrescriptionForm.vue';
import PrescriptionList from '../../prescriptions/domain/PrescriptionList.vue';
import MedicalExamOrderForm from '../../medical-exam-orders/domain/MedicalExamOrderForm.vue';
import MedicalExamOrderList from '../../medical-exam-orders/domain/MedicalExamOrderList.vue';
import MedicalReferenceForm from '../../medical-references/domain/MedicalReferenceForm.vue';
import MedicalReferenceList from '../../medical-references/domain/MedicalReferenceList.vue';
import { useSpeechRecognition } from '../composables/useSpeechRecognition';
import { dateYYYYMMDD } from '../../../shared/utils/date';
import {
  getPrescriptionsByClient,
  refillPrescription,
  recordDispensation,
} from '../../../application/services/prescription';
import {
  getExamOrdersByClient,
  updateExamOrderStatus,
} from '../../../application/services/medical-exam-order';
import {
  getReferencesByClient,
  acceptReference,
  markReferenceAsAttended,
} from '../../../application/services/medical-reference';

export default {
  name: 'MedicalOrderForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    Message,
    HistoryDetailsCard,
    PrescriptionForm,
    PrescriptionList,
    MedicalExamOrderForm,
    MedicalExamOrderList,
    MedicalReferenceForm,
    MedicalReferenceList,
  },
  props: {
    commerce: { type: Object, default: {} },
    client: { type: Object, default: {} },
    attention: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    onSave: { type: Function, default: null },
  },
  emits: [
    'create-prescription',
    'create-exam-order',
    'create-reference',
    'prescription-created',
    'exam-order-created',
    'reference-created',
  ],
  async setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);

    const { commerce, cacheData, patientHistoryData, toggles, errorsAdd } = toRefs(props);

    const { receiveData, onSave } = props;

    const state = reactive({
      newMedicalOrder: {},
      oldMedicalOrder: [],
      captcha: false,
      medicalOrderError: false,
      asc: true,
      showHistory: false,
      orderType: 'prescription', // 'prescription', 'exam', 'reference', 'text'
      prescriptionData: null,
      examOrderData: null,
      referenceData: null,
      // Lists data
      prescriptions: [],
      examOrders: [],
      references: [],
      loadingPrescriptions: false,
      loadingExamOrders: false,
      loadingReferences: false,
      showList: false, // Toggle between form and list view
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
      // You could show this in a temporary indicator
    };

    const handleSpeechFinalResult = finalText => {
      // Append transcribed text with timestamp as new paragraph
      const currentText = state.newMedicalOrder.medicalOrder || '';
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

      state.newMedicalOrder.medicalOrder = newText;
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
      state.newMedicalOrder.medicalOrder = '';
      sendData();
    };

    const loadPrescriptions = async () => {
      if (!commerce.value?.id || !client.value?.id) return;
      try {
        state.loadingPrescriptions = true;
        const prescriptions = await getPrescriptionsByClient(commerce.value.id, client.value.id);
        state.prescriptions = prescriptions || [];
      } catch (error) {
        console.error('Error loading prescriptions:', error);
        state.prescriptions = [];
      } finally {
        state.loadingPrescriptions = false;
      }
    };

    const loadExamOrders = async () => {
      if (!commerce.value?.id || !client.value?.id) return;
      try {
        state.loadingExamOrders = true;
        const examOrders = await getExamOrdersByClient(commerce.value.id, client.value.id);
        state.examOrders = examOrders || [];
      } catch (error) {
        console.error('Error loading exam orders:', error);
        state.examOrders = [];
      } finally {
        state.loadingExamOrders = false;
      }
    };

    const loadReferences = async () => {
      if (!commerce.value?.id || !client.value?.id) return;
      try {
        state.loadingReferences = true;
        const references = await getReferencesByClient(commerce.value.id, client.value.id);
        state.references = references || [];
      } catch (error) {
        console.error('Error loading references:', error);
        state.references = [];
      } finally {
        state.loadingReferences = false;
      }
    };

    // Action handlers
    const handlePrescriptionRefill = async prescriptionId => {
      if (!prescriptionId) return;
      try {
        loading.value = true;
        await refillPrescription(prescriptionId);
        // Reload prescriptions
        await loadPrescriptions();
        // Show success message (you can add a toast notification here)
        alert(t('patientHistoryView.prescriptionRefilledSuccess'));
      } catch (error) {
        console.error('Error refilling prescription:', error);
        alert(t('patientHistoryView.prescriptionRefilledError'));
      } finally {
        loading.value = false;
      }
    };

    const handlePrescriptionDispense = async prescriptionId => {
      if (!prescriptionId) return;
      try {
        loading.value = true;
        const dispensationData = {
          dispensedAt: new Date().toISOString(),
          dispensedBy: 'current-user-id', // TODO: Get from store
        };
        await recordDispensation(prescriptionId, dispensationData);
        // Reload prescriptions
        await loadPrescriptions();
        alert(t('patientHistoryView.dispensationRecordedSuccess'));
      } catch (error) {
        console.error('Error recording dispensation:', error);
        alert(t('patientHistoryView.dispensationRecordedError'));
      } finally {
        loading.value = false;
      }
    };

    const handleExamOrderComplete = async examOrderId => {
      if (!examOrderId) return;
      try {
        loading.value = true;
        await updateExamOrderStatus(examOrderId, 'COMPLETED', new Date().toISOString());
        // Reload exam orders
        await loadExamOrders();
        alert(t('patientHistoryView.examOrderCompletedSuccess'));
      } catch (error) {
        console.error('Error completing exam order:', error);
        alert(t('patientHistoryView.examOrderCompletedError'));
      } finally {
        loading.value = false;
      }
    };

    const handleReferenceAccept = async referenceId => {
      if (!referenceId) return;
      try {
        loading.value = true;
        await acceptReference(referenceId, {});
        // Reload references
        await loadReferences();
        alert(t('patientHistoryView.referenceAcceptedSuccess'));
      } catch (error) {
        console.error('Error accepting reference:', error);
        alert(t('patientHistoryView.referenceAcceptedError'));
      } finally {
        loading.value = false;
      }
    };

    const handleReferenceAttend = async referenceId => {
      if (!referenceId) return;
      try {
        loading.value = true;
        const returnReport = prompt(t('patientHistoryView.returnReportPrompt')) || '';
        await markReferenceAsAttended(referenceId, returnReport);
        // Reload references
        await loadReferences();
        alert(t('patientHistoryView.referenceAttendedSuccess'));
      } catch (error) {
        console.error('Error marking reference as attended:', error);
        alert(t('patientHistoryView.referenceAttendedError'));
      } finally {
        loading.value = false;
      }
    };

    // New creation handlers - Add to medicalOrder in patient history
    const handlePrescriptionCreated = async prescription => {
      await loadPrescriptions();

      // Add prescription reference to medicalOrder
      if (prescription && prescription.id && attention.value?.id) {
        const medicalOrderEntry = {
          type: 'prescription',
          prescriptionId: prescription.id,
          attentionId: attention.value.id,
          createdAt: new Date(),
          createdBy: 'current-user', // TODO: Get from store
          metadata: {
            prescription: {
              id: prescription.id,
              date: prescription.date,
              validUntil: prescription.validUntil,
              status: prescription.status,
              medicationsCount: prescription.medications?.length || 0,
            },
          },
        };

        // Add to newMedicalOrder or create array
        if (!state.newMedicalOrder) {
          state.newMedicalOrder = {};
        }
        if (!Array.isArray(patientHistoryData.value?.medicalOrder)) {
          // Initialize as array if needed
        }

        // Send data to parent to save in patient history
        const data = {
          type: 'prescription',
          prescription: medicalOrderEntry,
          examOrder: null,
          reference: null,
          text: null,
        };
        receiveData(data);

        // Trigger save if onSave is available
        if (onSave && typeof onSave === 'function') {
          try {
            await onSave();
          } catch (error) {
            console.error('Error saving prescription to patient history:', error);
          }
        }
      }

      // Emit to parent component
      emit('prescription-created', prescription);
    };

    const handleExamOrderCreated = async examOrder => {
      await loadExamOrders();

      // Add exam order reference to medicalOrder
      if (examOrder && examOrder.id && attention.value?.id) {
        const medicalOrderEntry = {
          type: 'exam',
          examOrderId: examOrder.id,
          attentionId: attention.value.id,
          createdAt: new Date(),
          createdBy: 'current-user', // TODO: Get from store
          metadata: {
            examOrder: {
              id: examOrder.id,
              type: examOrder.type,
              status: examOrder.status,
              examsCount: examOrder.exams?.length || 0,
            },
          },
        };

        // Send data to parent to save in patient history
        const data = {
          type: 'exam',
          prescription: null,
          examOrder: medicalOrderEntry,
          reference: null,
          text: null,
        };
        receiveData(data);

        // Trigger save if onSave is available
        if (onSave && typeof onSave === 'function') {
          try {
            await onSave();
          } catch (error) {
            console.error('Error saving exam order to patient history:', error);
          }
        }
      }

      // Emit to parent component
      emit('exam-order-created', examOrder);
    };

    const handleReferenceCreated = async reference => {
      await loadReferences();

      // Add reference to medicalOrder
      if (reference && reference.id && attention.value?.id) {
        const medicalOrderEntry = {
          type: 'reference',
          referenceId: reference.id,
          attentionId: attention.value.id,
          createdAt: new Date(),
          createdBy: 'current-user', // TODO: Get from store
          metadata: {
            reference: {
              id: reference.id,
              referredToSpecialty: reference.referredToSpecialty,
              urgency: reference.urgency,
              status: reference.status,
            },
          },
        };

        // Send data to parent to save in patient history
        const data = {
          type: 'reference',
          prescription: null,
          examOrder: null,
          reference: medicalOrderEntry,
          text: null,
        };
        receiveData(data);

        // Trigger save if onSave is available
        if (onSave && typeof onSave === 'function') {
          try {
            await onSave();
          } catch (error) {
            console.error('Error saving reference to patient history:', error);
          }
        }
      }

      // Emit to parent component
      emit('reference-created', reference);
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (patientHistoryData.value && patientHistoryData.value.id) {
          state.oldMedicalOrder = patientHistoryData.value.medicalOrder || [];
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          if (state.oldMedicalOrder && state.oldMedicalOrder.length > 0) {
            const sortedOrders = [...state.oldMedicalOrder].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            // Buscar registro del día de hoy
            const todayOrder = sortedOrders.find(
              order => dateYYYYMMDD(order.createdAt) === dateYYYYMMDD(new Date())
            );
            // Si existe registro de hoy, usarlo, sino usar el más reciente
            state.newMedicalOrder = todayOrder || sortedOrders[0] || {};
          }
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if ((!state.newMedicalOrder || !state.newMedicalOrder.medicalOrder) && cacheData.value) {
          state.newMedicalOrder = cacheData.value;
        }
        // Load lists
        await Promise.all([loadPrescriptions(), loadExamOrders(), loadReferences()]);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      const data = {
        type: state.orderType,
        prescription: state.prescriptionData,
        examOrder: state.examOrderData,
        reference: state.referenceData,
        text: state.newMedicalOrder.medicalOrder,
      };
      receiveData(data);
    };

    const handleSaveTextOrder = async () => {
      if (!state.newMedicalOrder.medicalOrder || state.newMedicalOrder.medicalOrder.trim() === '') {
        return;
      }
      // First send data to parent to update newMedicalOrder
      sendData();
      // Then trigger save if onSave is available
      if (onSave && typeof onSave === 'function') {
        try {
          await onSave();
        } catch (error) {
          console.error('Error saving text order:', error);
        }
      }
    };

    const receivePrescriptionData = data => {
      state.prescriptionData = data;
      sendData();
    };

    const receiveExamOrderData = data => {
      state.examOrderData = data;
      sendData();
    };

    const receiveReferenceData = data => {
      state.referenceData = data;
      sendData();
    };

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldMedicalOrder && state.oldMedicalOrder.length > 0) {
        let elementsSorted = [];
        const elements = state.oldMedicalOrder;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldMedicalOrder = elementsSorted;
      }
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.medicalOrder &&
          patientHistoryData.value.medicalOrder.length > 0 &&
          patientHistoryData.value.medicalOrder[0]
        ) {
          state.oldMedicalOrder = patientHistoryData.value.medicalOrder;
          // Cargar el registro más reciente del día de hoy, o el más reciente en general
          const sortedOrders = [...state.oldMedicalOrder].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          // Buscar registro del día de hoy
          const todayOrder = sortedOrders.find(
            order => dateYYYYMMDD(order.createdAt) === dateYYYYMMDD(new Date())
          );
          // Si existe registro de hoy, usarlo, sino usar el más reciente
          if (todayOrder || sortedOrders[0]) {
            state.newMedicalOrder = todayOrder || sortedOrders[0];
          }
        }
      }
      loading.value = false;
    });

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
      handleSaveTextOrder,
      receivePrescriptionData,
      receiveExamOrderData,
      receiveReferenceData,
      loadPrescriptions,
      loadExamOrders,
      loadReferences,
      handlePrescriptionRefill,
      handlePrescriptionDispense,
      handleExamOrderComplete,
      handleReferenceAccept,
      handleReferenceAttend,
      handlePrescriptionCreated,
      handleExamOrderCreated,
      handleReferenceCreated,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-prescription"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.medicalOrder') }}</h3>
        <p class="form-header-subtitle">{{ $t('patientHistoryView.medicalOrderSubtitle') }}</p>
      </div>
    </div>
    <div class="form-layout-modern">
      <!-- Form Input Section -->
      <div class="form-input-section">
        <!-- Order Type Selector -->
        <div class="form-field-modern">
          <div class="order-type-selector">
            <button
              type="button"
              class="order-type-btn"
              :class="{ active: state.orderType === 'prescription' }"
              @click="state.orderType = 'prescription'"
            >
              <i class="bi bi-prescription me-2"></i>
              {{ $t('patientHistoryView.orderType.prescription') }}
            </button>
            <button
              type="button"
              class="order-type-btn"
              :class="{ active: state.orderType === 'exam' }"
              @click="state.orderType = 'exam'"
            >
              <i class="bi bi-clipboard-data me-2"></i>
              {{ $t('patientHistoryView.orderType.exam') }}
            </button>
            <button
              type="button"
              class="order-type-btn"
              :class="{ active: state.orderType === 'reference' }"
              @click="state.orderType = 'reference'"
            >
              <i class="bi bi-arrow-left-right me-2"></i>
              {{ $t('patientHistoryView.orderType.reference') }}
            </button>
            <button
              type="button"
              class="order-type-btn"
              :class="{ active: state.orderType === 'text' }"
              @click="state.orderType = 'text'"
            >
              <i class="bi bi-file-text me-2"></i>
              {{ $t('patientHistoryView.orderType.text') }}
            </button>
          </div>
        </div>

        <!-- Prescription Form -->
        <PrescriptionForm
          v-if="state.orderType === 'prescription'"
          :commerce="commerce"
          :client="client"
          :attention="attention"
          :toggles="toggles"
          :errors-add="errorsAdd"
          :receive-data="receivePrescriptionData"
          @prescription-created="handlePrescriptionCreated"
        />

        <!-- Exam Order Form -->
        <MedicalExamOrderForm
          v-if="state.orderType === 'exam'"
          :commerce="commerce"
          :client="client"
          :attention="attention"
          :toggles="toggles"
          :errors-add="errorsAdd"
          :receive-data="receiveExamOrderData"
          @exam-order-created="handleExamOrderCreated"
        />

        <!-- Reference Form -->
        <MedicalReferenceForm
          v-if="state.orderType === 'reference'"
          :commerce="commerce"
          :client="client"
          :attention="attention"
          :toggles="toggles"
          :errors-add="errorsAdd"
          :receive-data="receiveReferenceData"
          @reference-created="handleReferenceCreated"
        />

        <!-- Text Order (Legacy) -->
        <div v-if="state.orderType === 'text'" class="prescription-form-modern">
          <div class="form-section-modern">
            <div class="form-field-modern">
              <label class="form-label-modern" for="medical-order-textarea">
                <i class="bi bi-file-text me-1"></i>
                {{ $t('patientHistoryView.medicalOrder') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition"
                  :title="
                    isListeningSpeech
                      ? $t('patientHistoryView.stopRecording')
                      : $t('patientHistoryView.startRecording')
                  "
                >
                  <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                </button>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  @click="clearField"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <div class="position-relative">
                <textarea
                  :disabled="!toggles['patient.history.edit']"
                  class="form-control-modern"
                  id="medical-order-textarea"
                  rows="8"
                  :max="500"
                  @keyup="sendData"
                  @input="sendData"
                  v-bind:class="{
                    'form-control-invalid':
                      state.medicalOrderError || (errorsAdd && errorsAdd.length > 0),
                  }"
                  v-model="state.newMedicalOrder.medicalOrder"
                ></textarea>
                <div v-if="isListeningSpeech" class="speech-recording-indicator">
                  <span class="recording-dot"></span>
                  <span class="ms-2">{{ $t('patientHistoryView.recordingMessage') }}</span>
                </div>
                <div v-if="speechError" class="speech-error-message text-danger small mt-1">
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  {{ speechError }}
                </div>
              </div>
              <div class="form-field-hint" v-if="state.newMedicalOrder.medicalOrder">
                <span class="character-count"
                  >{{ (state.newMedicalOrder.medicalOrder || '').length }}/500</span
                >
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button
              type="button"
              class="btn-action btn-action-primary"
              @click="handleSaveTextOrder"
              :disabled="
                !toggles['patient.history.edit'] ||
                !state.newMedicalOrder.medicalOrder ||
                !state.newMedicalOrder.medicalOrder.trim()
              "
            >
              <i class="bi bi-check-circle me-2"></i>
              {{ $t('patientHistoryView.save') }}
            </button>

            <button
              type="button"
              class="btn-action btn-action-secondary"
              @click="clearField"
              :disabled="!toggles['patient.history.edit']"
            >
              <i class="bi bi-arrow-clockwise me-2"></i>
              {{ $t('patientHistoryView.prescription.clear') }}
            </button>
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
              <label class="sort-toggle-label" for="asc-medical-order">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-medical-order"
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
            <!-- Tabs for different order types -->
            <div class="history-tabs">
              <button
                class="history-tab"
                :class="{ active: state.orderType === 'prescription' }"
                @click="state.orderType = 'prescription'"
                :title="
                  $t('patientHistoryView.historyTab.prescription') +
                  (state.prescriptions.length > 0 ? ` (${state.prescriptions.length})` : '')
                "
              >
                <i class="bi bi-prescription"></i>
                <span v-if="state.prescriptions.length > 0" class="history-tab-badge">
                  {{ state.prescriptions.length }}
                </span>
              </button>
              <button
                class="history-tab"
                :class="{ active: state.orderType === 'exam' }"
                @click="state.orderType = 'exam'"
                :title="
                  $t('patientHistoryView.historyTab.exam') +
                  (state.examOrders.length > 0 ? ` (${state.examOrders.length})` : '')
                "
              >
                <i class="bi bi-clipboard-data"></i>
                <span v-if="state.examOrders.length > 0" class="history-tab-badge">
                  {{ state.examOrders.length }}
                </span>
              </button>
              <button
                class="history-tab"
                :class="{ active: state.orderType === 'reference' }"
                @click="state.orderType = 'reference'"
                :title="
                  $t('patientHistoryView.historyTab.reference') +
                  (state.references.length > 0 ? ` (${state.references.length})` : '')
                "
              >
                <i class="bi bi-arrow-left-right"></i>
                <span v-if="state.references.length > 0" class="history-tab-badge">
                  {{ state.references.length }}
                </span>
              </button>
              <button
                class="history-tab"
                :class="{ active: state.orderType === 'text' }"
                @click="state.orderType = 'text'"
                :title="$t('patientHistoryView.historyTab.text')"
              >
                <i class="bi bi-file-text"></i>
              </button>
            </div>

            <!-- Prescriptions List -->
            <div v-if="state.orderType === 'prescription'">
              <PrescriptionList
                :prescriptions="state.prescriptions"
                :loading="state.loadingPrescriptions"
                :toggles="toggles"
                :sort-asc="state.asc"
                @create-new="
                  state.showList = false;
                  state.orderType = 'prescription';
                "
                @refill="handlePrescriptionRefill"
                @dispense="handlePrescriptionDispense"
              />
            </div>

            <!-- Exam Orders List -->
            <div v-if="state.orderType === 'exam'">
              <MedicalExamOrderList
                :exam-orders="state.examOrders"
                :loading="state.loadingExamOrders"
                :toggles="toggles"
                :sort-asc="state.asc"
                @create-new="
                  state.showList = false;
                  state.orderType = 'exam';
                "
                @complete="handleExamOrderComplete"
                @refresh="loadExamOrders"
              />
            </div>

            <!-- References List -->
            <div v-if="state.orderType === 'reference'">
              <MedicalReferenceList
                :references="state.references"
                :loading="state.loadingReferences"
                :toggles="toggles"
                :sort-asc="state.asc"
                @create-new="
                  state.showList = false;
                  state.orderType = 'reference';
                "
                @accept="handleReferenceAccept"
                @attend="handleReferenceAttend"
                @refresh="loadReferences"
              />
            </div>

            <!-- Text Orders (Legacy) -->
            <div v-if="state.orderType === 'text'">
              <div
                v-if="
                  state.oldMedicalOrder &&
                  state.oldMedicalOrder.length > 0 &&
                  state.oldMedicalOrder[0]
                "
                class="history-timeline-content"
              >
                <div
                  v-for="(element, index) in state.oldMedicalOrder"
                  :key="`order-${index}`"
                  class="history-timeline-item"
                >
                  <HistoryDetailsCard
                    :show="toggles['patient.history.view']"
                    :date="element.createdAt"
                    :content="element.medicalOrder"
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
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

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

/* Form Fields - using prontuario-common.css */

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

/* Order Type Selector */
.order-type-selector {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.order-type-btn {
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 80px;
  padding: 0.3rem;
  background: white;
  color: var(--color-text);
  border: none;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  justify-content: center;
}

.order-type-btn:hover:not(.active) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: rgba(68, 111, 252, 0.05);
  color: var(--azul-turno);
}

.order-type-btn.active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.order-type-btn.active:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.order-type-btn i {
  font-size: 0.9rem;
}

/* History Tabs */
.history-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
  flex-wrap: nowrap;
}

.history-tab {
  flex: 0 0 auto;
  min-width: 36px;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  background: white;
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.history-tab:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
}

.history-tab.active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.history-tab i {
  font-size: 1.1rem;
}

.history-tab-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #dc3545;
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.history-tab.active .history-tab-badge {
  border-color: white;
}

/* Text Order Form Styles - Normalized with other forms */
.prescription-form-modern {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Header */
.form-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

/* Header styles are in prontuario-common.css - no need to override */

.form-section {
  margin-bottom: 2rem;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.4rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  background: white;
}

.form-control:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-control:disabled {
  background: rgba(0, 0, 0, 0.05);
  cursor: not-allowed;
}

.form-control-invalid {
  border-color: #dc3545;
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
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px solid rgba(0, 0, 0, 0.05);
}

.btn-action {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 0.3rem;
  font-weight: 600;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
  height: 32px;
}

.btn-action i {
  font-size: 0.85rem;
}

.btn-action-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-action-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-action-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-action-secondary {
  background: white;
  color: var(--color-text);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.btn-action-secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--azul-turno);
}

.btn-action-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modern Form Styles */
.form-section-modern {
  margin-bottom: 1.2rem;
  background: white;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.form-field-modern {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.6rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.3rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.4rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  background: white;
  resize: vertical;
  box-sizing: border-box;
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.form-control-modern:disabled {
  background: rgba(0, 0, 0, 0.03);
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
