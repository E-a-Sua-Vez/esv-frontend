<script>
import { ref, reactive, onMounted, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Warning from '../../common/Warning.vue';
import Message from '../../common/Message.vue';
import DigitalSignatureICP from '../../common/DigitalSignatureICP.vue';
import PdfTemplateSelector from '../../pdf-templates/PdfTemplateSelector.vue';
import {
  searchMedications,
  getMedicationById,
  validateMedicationInteractions,
  createPrescription,
  downloadPrescriptionPdf,
  getPrescriptionPdfUrl,
  getPrescriptionById,
} from '../../../application/services/prescription';
import {
  searchTemplates as searchMedicalTemplates,
  processTemplate,
  getMostUsedTemplates,
} from '../../../application/services/medical-template';
import { getAttentionDetails } from '../../../application/services/attention';
import { useSpeechRecognition } from '../../../components/patient-history/composables/useSpeechRecognition';
import { globalStore } from '../../../stores';

export default {
  name: 'PrescriptionForm',
  components: {
    Spinner,
    Warning,
    Message,
    DigitalSignatureICP,
    PdfTemplateSelector,
  },
  props: {
    commerce: { type: Object, default: () => ({}) },
    client: { type: Object, default: () => ({}) },
    attention: { type: Object, default: () => ({}) },
    toggles: { type: Object, default: () => ({}) },
    errorsAdd: { type: Array, default: () => [] },
    receiveData: { type: Function, default: () => {} },
  },
  emits: ['prescription-created'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const store = globalStore();
    const { commerce, client, attention, toggles, errorsAdd, receiveData } = toRefs(props);

    const state = reactive({
      prescription: {
        commerceId: '',
        clientId: '',
        attentionId: '',
        doctorId: '',
        doctorName: '',
        medications: [],
        instructions: '',
        diagnosis: '',
        date: new Date().toISOString(),
        validUntil: '',
        refillsAllowed: 0,
        priority: 'NORMAL',
        notes: '',
      },
      currentMedication: {
        medicationId: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        route: 'Oral',
        instructions: '',
        quantity: 1,
        refillsAllowed: 0,
      },
      medicationSearch: {
        searchTerm: '',
        results: [],
        loading: false,
        showResults: false,
      },
      templates: {
        available: [],
        mostUsed: [],
        selected: null,
        loading: false,
      },
      pdfTemplate: {
        selected: null,
        showSelector: false,
      },
      interactions: {
        warnings: [],
        loading: false,
      },
      errors: [],
      showTemplates: false,
      showMedicationForm: false,
      createdPrescription: null,
      showPdfActions: false,
      pdfLoading: false,
      showEmailModal: false,
      emailLoading: false,
      emailForm: {
        recipientEmail: '',
        subject: '',
        message: '',
      },
      showDigitalSignature: false,
      signatureInfo: null,
    });

    // Load prescription templates
    const loadTemplates = async () => {
      if (!commerce.value?.id || !state.prescription.doctorId) return;

      try {
        state.templates.loading = true;
        const [mostUsed, available] = await Promise.all([
          getMostUsedTemplates(commerce.value.id, state.prescription.doctorId, 5),
          searchMedicalTemplates(commerce.value.id, state.prescription.doctorId, {
            type: 'prescription',
            limit: 20,
          }),
        ]);

        state.templates.mostUsed = mostUsed || [];
        state.templates.available = available?.data || [];
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        state.templates.loading = false;
      }
    };

    // Initialize prescription data from attention prop
    const initializeFromAttention = async attentionValue => {
      // Always set commerce and client IDs first (these are always available from props)
      if (commerce.value?.id) state.prescription.commerceId = commerce.value.id;
      if (client.value?.id) state.prescription.clientId = client.value.id;

      // Extract attention ID if available
      let attentionId = null;
      if (attentionValue) {
        if (typeof attentionValue === 'string') {
          attentionId = attentionValue;
        } else if (attentionValue?.id) {
          attentionId = attentionValue.id;
        }
      }

      // Set attention ID immediately if we have it
      if (attentionId) {
        state.prescription.attentionId = attentionId;
      }

      // Try to get doctor info from attention details
      let attentionDetails = attentionValue;
      if (
        attentionId &&
        attentionValue &&
        typeof attentionValue === 'object' &&
        (!attentionValue?.collaboratorId || !attentionValue?.collaborator)
      ) {
        try {
          attentionDetails = await getAttentionDetails(attentionId);
          // Ensure attentionId is set (in case getAttentionDetails succeeds but ID was missing)
          if (attentionDetails?.id) {
            state.prescription.attentionId = attentionDetails.id;
          }
        } catch (error) {
          console.error('❌ Error loading attention details:', error);
          // Keep the ID we already set from the prop
        }
      }

      // Set doctor info from attention if available
      if (attentionDetails?.collaboratorId) {
        state.prescription.doctorId = attentionDetails.collaboratorId;
        state.prescription.doctorName =
          attentionDetails?.collaborator?.name || attentionDetails?.collaborator?.alias || '';
      } else {
        // Fallback: Get current user from store (should be the collaborator creating the prescription)
        try {
          const currentUser = await store.getCurrentUser;
          if (currentUser && currentUser.id) {
            state.prescription.doctorId = currentUser.id;
            state.prescription.doctorName = currentUser.name || currentUser.alias || '';
          } else {
            console.error('❌ No current user found in store');
          }
        } catch (error) {
          console.error('❌ Error getting current user from store:', error);
        }
      }

      // Set default valid until date (30 days from now)
      if (!state.prescription.validUntil) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        state.prescription.validUntil = validUntil.toISOString().split('T')[0];
      }

      await loadTemplates();
    };

    // Watch for changes in attention prop (with immediate to catch initial value)
    watch(
      () => attention.value,
      async newAttention => {
        // Always initialize (even if attention is null/undefined, we still need to set commerce, client, and doctor)
        await initializeFromAttention(newAttention);
      },
      { immediate: true, deep: true }
    );

    // Also initialize on mount as fallback
    onMounted(async () => {
      await initializeFromAttention(attention.value);
    });

    // Search medications
    const searchMedicationsHandler = async () => {
      if (!state.medicationSearch.searchTerm || state.medicationSearch.searchTerm.length < 2) {
        state.medicationSearch.results = [];
        state.medicationSearch.showResults = false;
        return;
      }

      try {
        state.medicationSearch.loading = true;
        const results = await searchMedications({
          searchTerm: state.medicationSearch.searchTerm,
          commerceId: commerce.value?.id,
          limit: 10,
        });
        state.medicationSearch.results = results?.medications || [];
        state.medicationSearch.showResults = true;
      } catch (error) {
        console.error('Error searching medications:', error);
        state.medicationSearch.results = [];
      } finally {
        state.medicationSearch.loading = false;
      }
    };

    // Select medication from search results
    const selectMedication = async medication => {
      state.currentMedication.medicationId = medication.id;
      state.currentMedication.medicationName = medication.name;
      state.medicationSearch.searchTerm = medication.name;
      state.medicationSearch.showResults = false;
      state.showMedicationForm = true;
    };

    // Add medication to prescription
    const addMedication = async () => {
      state.errors = [];

      // Validate medication form
      if (!state.currentMedication.medicationId) {
        state.errors.push('Seleccione un medicamento');
        return;
      }
      if (!state.currentMedication.dosage) {
        state.errors.push('Ingrese la dosis');
        return;
      }
      if (!state.currentMedication.frequency) {
        state.errors.push('Ingrese la frecuencia');
        return;
      }
      if (!state.currentMedication.duration) {
        state.errors.push('Ingrese la duración');
        return;
      }

      try {
        loading.value = true;

        // Add medication to list
        const medication = { ...state.currentMedication };
        state.prescription.medications.push(medication);

        // Check for interactions
        await checkInteractions();

        // Clear current medication form
        resetMedicationForm();

        // Send updated data
        sendData();
      } catch (error) {
        console.error('Error adding medication:', error);
        state.errors.push('Error al agregar medicamento');
      } finally {
        loading.value = false;
      }
    };

    // Remove medication from prescription
    const removeMedication = index => {
      state.prescription.medications.splice(index, 1);
      checkInteractions();
      sendData();
    };

    // Check medication interactions
    const checkInteractions = async () => {
      if (state.prescription.medications.length < 2) {
        state.interactions.warnings = [];
        return;
      }

      try {
        state.interactions.loading = true;
        const medicationIds = state.prescription.medications.map(med => med.medicationId);
        const result = await validateMedicationInteractions(medicationIds);
        state.interactions.warnings = result?.warnings || [];
      } catch (error) {
        console.error('Error checking interactions:', error);
      } finally {
        state.interactions.loading = false;
      }
    };

    // Apply template
    const applyTemplate = async template => {
      try {
        loading.value = true;
        const variables = {
          patientName: client.value?.userName || '',
          patientAge: client.value?.age || '',
          diagnosis: state.prescription.diagnosis || '',
        };

        const processed = await processTemplate(template.id, variables);

        if (processed.medications) {
          state.prescription.medications = [
            ...state.prescription.medications,
            ...processed.medications,
          ];
        }
        if (processed.instructions) {
          state.prescription.instructions = processed.instructions;
        }

        state.templates.selected = template;
        state.showTemplates = false;
        await checkInteractions();
        sendData();
      } catch (error) {
        console.error('Error applying template:', error);
        state.errors.push('Error al aplicar plantilla');
      } finally {
        loading.value = false;
      }
    };

    // Create prescription
    const createPrescriptionHandler = async () => {
      state.errors = [];

      // Validate required fields
      if (!state.prescription.attentionId) {
        // Try to extract ID one more time before failing
        let attentionId = null;
        if (typeof attention.value === 'string') {
          attentionId = attention.value;
        } else if (attention.value?.id) {
          attentionId = attention.value.id;
        }
        if (attentionId) {
          state.prescription.attentionId = attentionId;
        } else {
          state.errors.push('ID de atención no disponible');
        }
      }
      if (!state.prescription.doctorId) {
        state.errors.push('ID de doctor no disponible');
      }
      if (!state.prescription.doctorName) {
        state.errors.push('Nombre de doctor no disponible');
      }
      if (state.prescription.medications.length === 0) {
        state.errors.push('Agregue al menos un medicamento');
      }
      if (!state.prescription.diagnosis) {
        state.errors.push('Ingrese el diagnóstico');
      }

      if (state.errors.length > 0) {
        console.error('❌ Validation errors:', state.errors);
        return;
      }

      try {
        loading.value = true;
        const prescriptionData = {
          ...state.prescription,
          date: new Date().toISOString(),
          pdfTemplateId: state.pdfTemplate.selected,
        };
        const prescription = await createPrescription(prescriptionData);
        state.createdPrescription = prescription;
        state.showPdfActions = true;
        // Check if prescription is already signed
        if (prescription.isSigned) {
          state.signatureInfo = {
            signedAt: prescription.signedAt,
            signedBy: prescription.signedBy,
            certificateInfo: prescription.certificateInfo,
          };
        }
        emit('prescription-created', prescription);
        sendData();
        // Don't reset form yet - show PDF actions
      } catch (error) {
        console.error('Error creating prescription:', error);
        state.errors.push('Error al crear la receta');
      } finally {
        loading.value = false;
      }
    };

    // Reset forms
    const resetMedicationForm = () => {
      state.currentMedication = {
        medicationId: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: 1,
      };
      state.medicationSearch.searchTerm = '';
      state.showMedicationForm = false;
    };

    const resetForm = () => {
      state.prescription.medications = [];
      state.prescription.instructions = '';
      state.prescription.diagnosis = '';
      state.prescription.notes = '';
      state.interactions.warnings = [];
      state.createdPrescription = null;
      state.showPdfActions = false;
      resetMedicationForm();
    };

    // PDF Actions
    const handleDownloadPdf = async () => {
      if (!state.createdPrescription?.id) return;
      try {
        state.pdfLoading = true;
        const pdfBlob = await downloadPrescriptionPdf(state.createdPrescription.id);
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receta-${state.createdPrescription.id}-${
          new Date().toISOString().split('T')[0]
        }.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        state.errors.push('Error al descargar el PDF');
      } finally {
        state.pdfLoading = false;
      }
    };

    const handlePrintPdf = async () => {
      if (!state.createdPrescription?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getPrescriptionPdfUrl(state.createdPrescription.id, 3600);
        const printWindow = window.open(pdfUrl.url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } catch (error) {
        console.error('Error printing PDF:', error);
        await handleDownloadPdf();
      } finally {
        state.pdfLoading = false;
      }
    };

    const handleViewPdf = async () => {
      if (!state.createdPrescription?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getPrescriptionPdfUrl(state.createdPrescription.id, 3600);
        window.open(pdfUrl.url, '_blank');
      } catch (error) {
        console.error('Error viewing PDF:', error);
        state.errors.push('Error al abrir el PDF');
      } finally {
        state.pdfLoading = false;
      }
    };

    const continueAfterPdf = () => {
      resetForm();
    };

    // Digital Signature handlers
    const handleSignatureSigned = async result => {
      // Refresh prescription to get updated signature info
      if (state.createdPrescription?.id) {
        try {
          const updated = await getPrescriptionById(state.createdPrescription.id);
          state.createdPrescription = updated;
          state.signatureInfo = {
            signedAt: updated.signedAt,
            signedBy: updated.signedBy,
            certificateInfo: updated.certificateInfo,
          };
        } catch (error) {
          console.error('Error refreshing prescription:', error);
        }
      }
    };

    const handleSignatureVerified = result => {
      // Verification result is already shown in the component
    };

    const handleSignatureCancel = () => {
      state.showDigitalSignature = false;
    };

    // Email Actions
    const openEmailModal = () => {
      // Pre-fill with client email if available
      if (client.value?.email) {
        state.emailForm.recipientEmail = client.value.email;
      }
      state.showEmailModal = true;
    };

    const closeEmailModal = () => {
      state.showEmailModal = false;
      state.emailForm = {
        recipientEmail: '',
        subject: '',
        message: '',
      };
    };

    const handleSendEmail = async () => {
      if (!state.createdPrescription?.id) return;

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!state.emailForm.recipientEmail || !emailRegex.test(state.emailForm.recipientEmail)) {
        state.errors.push('Ingrese un email válido');
        return;
      }

      try {
        state.emailLoading = true;
        await sendPrescriptionByEmail(state.createdPrescription.id, {
          recipientEmail: state.emailForm.recipientEmail,
          subject: state.emailForm.subject,
          message: state.emailForm.message,
        });

        // Show success message
        state.errors = [];
        closeEmailModal();
        // You could show a toast notification here
        alert(
          t('patientHistoryView.prescription.emailSentSuccessfully') || 'Email enviado exitosamente',
        );
      } catch (error) {
        console.error('Error sending email:', error);
        state.errors.push('Error al enviar el email');
      } finally {
        state.emailLoading = false;
      }
    };

    // Send data to parent
    const sendData = () => {
      try {
        // Ensure attentionId is set from attention prop if not already set
        if (!state.prescription.attentionId && attention.value) {
          let attentionId = null;
          if (typeof attention.value === 'string') {
            attentionId = attention.value;
          } else if (attention.value?.id) {
            attentionId = attention.value.id;
          }
          if (attentionId) {
            state.prescription.attentionId = attentionId;
          }
        }

        // Ensure prescription has a unique identifier
        if (!state.prescription.prescriptionId && !state.prescription.id) {
          // Generate a temporary ID if none exists
          state.prescription.prescriptionId = `temp_presc_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        }

        if (typeof receiveData.value === 'function') {
          receiveData.value(state.prescription);
        } else {
          console.warn('⚠️ receiveData is not a function in PrescriptionForm');
        }
      } catch (error) {
        console.error('❌ Error sending prescription data:', error);
      }
    };

    // Speech recognition
    const {
      isListening: isListeningSpeech,
      isSupported: isSpeechSupported,
      error: speechError,
      startListening: startSpeechListening,
      stopListening: stopSpeechListening,
    } = useSpeechRecognition();

    const handleSpeechFinalResult = (finalText, targetField) => {
      if (targetField === 'diagnosis') {
        const currentText = state.prescription.diagnosis || '';
        state.prescription.diagnosis =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;
      } else if (targetField === 'instructions') {
        const currentText = state.prescription.instructions || '';
        state.prescription.instructions =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;
      } else if (targetField === 'notes') {
        const currentText = state.prescription.notes || '';
        state.prescription.notes =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;
      } else if (targetField === 'medicationInstructions') {
        const currentText = state.currentMedication.instructions || '';
        state.currentMedication.instructions =
          currentText && currentText.trim() !== '' ? `${currentText}\n\n${finalText}` : finalText;
      }
      sendData();
    };

    const toggleSpeechRecognition = targetField => {
      if (isListeningSpeech.value) {
        stopSpeechListening();
      } else {
        const language = commerce.value?.localeInfo?.language || 'pt-BR';
        startSpeechListening(
          () => {},
          finalText => handleSpeechFinalResult(finalText, targetField),
          language
        );
      }
    };

    const clearField = targetField => {
      if (targetField === 'diagnosis') {
        state.prescription.diagnosis = '';
      } else if (targetField === 'instructions') {
        state.prescription.instructions = '';
      } else if (targetField === 'notes') {
        state.prescription.notes = '';
      } else if (targetField === 'medicationInstructions') {
        state.currentMedication.instructions = '';
      }
      sendData();
    };

    // Watch for changes
    watch(() => state.prescription, sendData, { deep: true });

    return {
      state,
      loading,
      toggles,
      errorsAdd,
      t,
      searchMedicationsHandler,
      selectMedication,
      addMedication,
      removeMedication,
      applyTemplate,
      createPrescriptionHandler,
      resetMedicationForm,
      resetForm,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      clearField,
      handleDownloadPdf,
      handlePrintPdf,
      handleViewPdf,
      continueAfterPdf,
      openEmailModal,
      closeEmailModal,
      handleSendEmail,
    };
  },
};
</script>

<template>
  <div class="prescription-form-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-prescription"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ t('patientHistoryView.prescription.create') }}</h3>
        <p class="form-header-subtitle">{{ t('patientHistoryView.prescription.subtitle') }}</p>
      </div>
      <div v-if="state.templates.mostUsed.length > 0" class="ms-auto">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="state.showTemplates = !state.showTemplates"
        >
          <i class="bi bi-lightning-fill me-1"></i>
          {{ t('patientHistoryView.prescription.templates') }}
        </button>
      </div>
    </div>

    <!-- Quick Templates -->
    <div v-if="state.showTemplates" class="templates-section">
      <div class="templates-header">
        <h5>{{ t('patientHistoryView.prescription.mostUsedTemplates') }}</h5>
        <button class="btn-close-templates" @click="state.showTemplates = false">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="templates-grid">
        <button
          v-for="template in state.templates.mostUsed"
          :key="template.id"
          class="template-card"
          @click="applyTemplate(template)"
        >
          <i class="bi bi-file-medical template-icon"></i>
          <span class="template-name">{{ template.name }}</span>
          <span class="template-usage">{{ template.usageCount }} usos</span>
        </button>
      </div>
    </div>

    <!-- Prescription Form -->
    <div class="prescription-content">
      <!-- Basic Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-info-circle me-2"></i>
          {{ t('patientHistoryView.prescription.generalInformation') }}
        </h5>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-clipboard2-pulse me-1"></i>
                {{ t('patientHistoryView.prescription.diagnosis') }} *
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('diagnosis')"
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
                  class="btn btn-sm btn-outline-secondary"
                  @click="clearField('diagnosis')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.prescription.diagnosis"
                class="form-control-modern"
                rows="3"
                placeholder="Ingrese el diagnóstico principal"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-md-6">
            <div class="row g-3">
              <div class="col-12">
                <div class="form-field-modern">
                  <label class="form-label-modern">
                    <i class="bi bi-calendar-event me-1"></i>
                    {{ t('patientHistoryView.prescription.validUntil') }}
                  </label>
                  <input
                    v-model="state.prescription.validUntil"
                    type="date"
                    class="form-control-modern"
                    :disabled="!toggles['patient.history.edit']"
                  />
                </div>
              </div>

              <div class="col-12">
                <div class="form-field-modern">
                  <label class="form-label-modern">
                    <i class="bi bi-flag me-1"></i>
                    {{ t('patientHistoryView.prescription.priority') }}
                  </label>
                  <select v-model="state.prescription.priority" class="form-control-modern">
                    <option value="LOW">
                      {{ t('patientHistoryView.prescription.priorityLow') }}
                    </option>
                    <option value="NORMAL">
                      {{ t('patientHistoryView.prescription.priorityNormal') }}
                    </option>
                    <option value="HIGH">
                      {{ t('patientHistoryView.prescription.priorityHigh') }}
                    </option>
                    <option value="URGENT">
                      {{ t('patientHistoryView.prescription.priorityUrgent') }}
                    </option>
                  </select>
                </div>
              </div>

              <div class="col-12">
                <div class="form-field-modern">
                  <label class="form-label-modern">
                    <i class="bi bi-arrow-repeat me-1"></i>
                    {{ t('patientHistoryView.prescription.refillsAllowed') }}
                  </label>
                  <input
                    v-model.number="state.prescription.refillsAllowed"
                    type="number"
                    min="0"
                    max="10"
                    class="form-control-modern"
                    :disabled="!toggles['patient.history.edit']"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Medication Search -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-plus-circle me-2"></i>
          {{ t('patientHistoryView.prescription.addMedications') }}
        </h5>

        <div class="medication-search">
          <div class="search-input-container">
            <input
              v-model="state.medicationSearch.searchTerm"
              type="text"
              class="form-control-modern"
              :placeholder="t('patientHistoryView.prescription.searchMedication')"
              @input="searchMedicationsHandler"
              :disabled="!toggles['patient.history.edit']"
            />
            <i class="bi bi-search search-icon"></i>
            <Spinner v-if="state.medicationSearch.loading" :show="true" size="sm" />
          </div>

          <!-- Search Results -->
          <div v-if="state.medicationSearch.showResults" class="search-results">
            <div
              v-for="medication in state.medicationSearch.results"
              :key="medication.id"
              class="search-result-item"
              @click="selectMedication(medication)"
            >
              <div class="medication-info">
                <strong>{{ medication.name }}</strong>
                <span class="medication-details">{{ medication.activePrinciple }}</span>
              </div>
              <span class="medication-concentration">{{ medication.concentration }}</span>
            </div>
            <div v-if="state.medicationSearch.results.length === 0" class="no-results">
              No se encontraron medicamentos
            </div>
          </div>
        </div>

        <!-- Medication Form -->
        <div v-if="state.showMedicationForm" class="medication-form">
          <div class="medication-form-header">
            <h6>{{ state.currentMedication.medicationName }}</h6>
            <button class="btn-close-form" @click="resetMedicationForm">
              <i class="bi bi-x"></i>
            </button>
          </div>

          <div class="row g-3">
            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-capsule me-1"></i>
                  {{ t('patientHistoryView.prescription.dosage') }} *
                </label>
                <input
                  v-model="state.currentMedication.dosage"
                  type="text"
                  class="form-control-modern"
                  placeholder="ej: 500mg"
                />
              </div>
            </div>

            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-clock me-1"></i>
                  {{ t('patientHistoryView.prescription.frequency') }} *
                </label>
                <select v-model="state.currentMedication.frequency" class="form-control-modern">
                  <option value="">
                    {{ t('patientHistoryView.prescription.selectFrequency') }}
                  </option>
                  <option value="1/day">{{ t('patientHistoryView.prescription.onceDay') }}</option>
                  <option value="2/day">{{ t('patientHistoryView.prescription.twiceDay') }}</option>
                  <option value="3/day">
                    {{ t('patientHistoryView.prescription.threeTimesDay') }}
                  </option>
                  <option value="4/day">
                    {{ t('patientHistoryView.prescription.fourTimesDay') }}
                  </option>
                  <option value="every_4h">
                    {{ t('patientHistoryView.prescription.every4h') }}
                  </option>
                  <option value="every_6h">
                    {{ t('patientHistoryView.prescription.every6h') }}
                  </option>
                  <option value="every_8h">
                    {{ t('patientHistoryView.prescription.every8h') }}
                  </option>
                  <option value="every_12h">
                    {{ t('patientHistoryView.prescription.every12h') }}
                  </option>
                  <option value="as_needed">
                    {{ t('patientHistoryView.prescription.asNeeded') }}
                  </option>
                </select>
              </div>
            </div>

            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-calendar-range me-1"></i>
                  {{ t('patientHistoryView.prescription.duration') }} *
                </label>
                <input
                  v-model="state.currentMedication.duration"
                  type="text"
                  class="form-control-modern"
                  placeholder="ej: 7 días"
                />
              </div>
            </div>

            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-arrow-down-circle me-1"></i>
                  {{ t('patientHistoryView.prescription.route') }}
                </label>
                <select v-model="state.currentMedication.route" class="form-control-modern">
                  <option value="Oral">Oral</option>
                  <option value="Intravenosa">Intravenosa</option>
                  <option value="Intramuscular">Intramuscular</option>
                  <option value="Subcutánea">Subcutánea</option>
                  <option value="Tópica">Tópica</option>
                  <option value="Inhalatoria">Inhalatoria</option>
                  <option value="Oftálmica">Oftálmica</option>
                  <option value="Ótica">Ótica</option>
                  <option value="Nasal">Nasal</option>
                  <option value="Rectal">Rectal</option>
                  <option value="Vaginal">Vaginal</option>
                </select>
              </div>
            </div>

            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-box me-1"></i>
                  {{ t('patientHistoryView.prescription.quantity') }}
                </label>
                <input
                  v-model.number="state.currentMedication.quantity"
                  type="number"
                  min="1"
                  class="form-control-modern"
                />
              </div>
            </div>

            <div class="col-md-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-arrow-repeat me-1"></i>
                  {{ t('patientHistoryView.prescription.refills') }}
                </label>
                <input
                  v-model.number="state.currentMedication.refillsAllowed"
                  type="number"
                  min="0"
                  max="12"
                  class="form-control-modern"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-12">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-file-text me-1"></i>
                  {{ t('patientHistoryView.prescription.specialInstructions') }}
                  <button
                    v-if="isSpeechSupported && toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    :class="{ 'btn-danger': isListeningSpeech }"
                    @click="toggleSpeechRecognition('medicationInstructions')"
                    :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
                  >
                    <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                  </button>
                  <button
                    v-if="toggles['patient.history.edit']"
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    @click="clearField('medicationInstructions')"
                    title="Limpar campo"
                  >
                    <i class="bi bi-eraser"></i>
                  </button>
                </label>
                <textarea
                  v-model="state.currentMedication.instructions"
                  class="form-control-modern"
                  rows="3"
                  placeholder="Instrucciones adicionales para este medicamento"
                ></textarea>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 mt-3"
            @click="addMedication"
            :disabled="!state.currentMedication.medicationId"
          >
            <i class="bi bi-plus-circle me-2"></i>
            {{ t('patientHistoryView.prescription.addMedication') }}
          </button>
        </div>
      </div>

      <!-- Medications List -->
      <div v-if="state.prescription.medications.length > 0" class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-list-ul me-2"></i>
          {{ t('patientHistoryView.prescription.prescribedMedications') }} ({{
            state.prescription.medications.length
          }})
        </h5>

        <div class="medications-list">
          <div
            v-for="(medication, index) in state.prescription.medications"
            :key="index"
            class="medication-item"
          >
            <div class="medication-content">
              <div class="medication-header">
                <strong>{{ medication.medicationName }}</strong>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="removeMedication(index)"
                  :disabled="!toggles['patient.history.edit']"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
              <div class="medication-details">
                <span class="detail-item">
                  <i class="bi bi-capsule me-1"></i>
                  {{ medication.dosage }}
                </span>
                <span class="detail-item">
                  <i class="bi bi-clock me-1"></i>
                  {{ medication.frequency }}
                </span>
                <span class="detail-item">
                  <i class="bi bi-calendar me-1"></i>
                  {{ medication.duration }}
                </span>
                <span class="detail-item">
                  <i class="bi bi-box me-1"></i>
                  Cantidad: {{ medication.quantity }}
                </span>
              </div>
              <div v-if="medication.instructions" class="medication-instructions">
                <i class="bi bi-info-circle me-1"></i>
                {{ medication.instructions }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interaction Warnings -->
      <div v-if="state.interactions.warnings.length > 0" class="form-section-modern">
        <div class="interaction-warnings">
          <h6 class="warning-title">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {{ t('patientHistoryView.prescription.interactionWarnings') }}
          </h6>
          <div
            v-for="warning in state.interactions.warnings"
            :key="warning.id"
            class="warning-item"
          >
            <div class="warning-severity" :class="`severity-${warning.severity.toLowerCase()}`">
              {{ warning.severity }}
            </div>
            <div class="warning-content">
              <strong>{{ warning.medications.join(' + ') }}</strong>
              <p>{{ warning.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Instructions -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-file-text me-2"></i>
          {{ t('patientHistoryView.prescription.generalInstructions') }}
        </h5>

        <div class="row g-3">
          <div class="col-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-clipboard-check me-1"></i>
                {{ t('patientHistoryView.prescription.generalInstructions') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('instructions')"
                  :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
                >
                  <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                </button>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="clearField('instructions')"
                  title="Limpar campo"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.prescription.instructions"
                class="form-control-modern"
                rows="3"
                placeholder="Instrucciones generales para el paciente"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-journal-text me-1"></i>
                {{ t('patientHistoryView.prescription.internalNotes') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('notes')"
                  :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
                >
                  <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                </button>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="clearField('notes')"
                  title="Limpar campo"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.prescription.notes"
                class="form-control-modern"
                rows="2"
                placeholder="Notas para uso interno (no aparecen en la receta)"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- PDF Template Selector -->
      <div class="form-section-modern" v-if="!state.showPdfActions">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="metric-card-subtitle mb-0">
            <i class="bi bi-file-earmark-pdf me-2"></i>
            {{ t('pdfTemplates.selector.title') }}
          </h5>
          <button
            type="button"
            class="btn btn-sm btn-link"
            @click="state.pdfTemplate.showSelector = !state.pdfTemplate.showSelector"
          >
            <i
              :class="state.pdfTemplate.showSelector ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
            ></i>
          </button>
        </div>

        <div v-show="state.pdfTemplate.showSelector">
          <p class="text-muted small mb-3">
            {{ t('pdfTemplates.selector.selectTemplate') }}
          </p>

          <PdfTemplateSelector
            v-model="state.pdfTemplate.selected"
            document-type="prescription"
            :commerce-id="state.prescription.commerceId"
            :show-preview-button="false"
          />
        </div>
      </div>

      <!-- PDF Actions (shown after prescription creation) -->
      <div
        v-if="state.showPdfActions && state.createdPrescription"
        class="form-section pdf-actions-section"
      >
        <div class="success-message">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong>{{ t('patientHistoryView.prescription.createdSuccessfully') }}</strong>
        </div>
        <div class="pdf-actions">
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleViewPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-eye me-2"></i>
            {{ t('patientHistoryView.prescription.viewPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleDownloadPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-download me-2"></i>
            {{ t('patientHistoryView.prescription.downloadPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handlePrintPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-printer me-2"></i>
            {{ t('patientHistoryView.prescription.printPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="openEmailModal"
            :disabled="pdfLoading"
          >
            <i class="bi bi-envelope me-2"></i>
            {{ t('patientHistoryView.prescription.sendEmail') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="state.showDigitalSignature = true"
            :disabled="state.createdPrescription?.isSigned || pdfLoading"
          >
            <i class="bi bi-shield-check me-2"></i>
            {{ t('digitalSignature.icp.sign') }}
          </button>
          <button type="button" class="btn-action btn-action-secondary" @click="continueAfterPdf">
            <i class="bi bi-arrow-right me-2"></i>
            {{ t('patientHistoryView.prescription.continue') }}
          </button>
        </div>
      </div>

      <!-- Digital Signature Section -->
      <div v-if="state.showDigitalSignature && state.createdPrescription" class="form-section">
        <DigitalSignatureICP
          :document-type="'prescription'"
          :document-id="state.createdPrescription.id"
          :is-signed="state.createdPrescription.isSigned || false"
          :signature-info="state.signatureInfo"
          @signed="handleSignatureSigned"
          @verified="handleSignatureVerified"
          @cancel="handleSignatureCancel"
        />
      </div>

      <!-- Email Modal -->
      <div v-if="state.showEmailModal" class="modal-overlay" @click.self="closeEmailModal">
        <div class="modal-content email-modal">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-envelope me-2"></i>
              {{ t('patientHistoryView.prescription.sendEmailTitle') }}
            </h5>
            <button type="button" class="btn-close" @click="closeEmailModal">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-envelope me-1"></i>
                {{ t('patientHistoryView.prescription.recipientEmail') }} *
              </label>
              <input
                type="email"
                class="form-control"
                v-model="state.emailForm.recipientEmail"
                :placeholder="t('patientHistoryView.prescription.recipientEmailPlaceholder')"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-tag me-1"></i>
                {{ t('patientHistoryView.prescription.emailSubject') }}
              </label>
              <input
                type="text"
                class="form-control"
                v-model="state.emailForm.subject"
                :placeholder="t('patientHistoryView.prescription.emailSubjectPlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-chat-left-text me-1"></i>
                {{ t('patientHistoryView.prescription.emailMessage') }}
              </label>
              <textarea
                class="form-control"
                v-model="state.emailForm.message"
                rows="4"
                :placeholder="t('patientHistoryView.prescription.emailMessagePlaceholder')"
              ></textarea>
            </div>
            <div v-if="state.errors.length > 0" class="form-errors">
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in state.errors" :key="index">{{ error }}</li>
                </template>
              </Warning>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeEmailModal"
              :disabled="state.emailLoading"
            >
              <i class="bi bi-x me-1"></i>
              {{ t('patientHistoryView.cancel') }}
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="handleSendEmail"
              :disabled="state.emailLoading || !state.emailForm.recipientEmail"
            >
              <span v-if="state.emailLoading" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-send me-2"></i>
              {{ t('patientHistoryView.prescription.sendEmail') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-else class="form-actions">
        <button
          type="button"
          class="btn-action btn-action-primary"
          @click="createPrescriptionHandler"
          :disabled="
            !toggles['patient.history.edit'] ||
            state.prescription.medications.length === 0 ||
            loading
          "
        >
          <i class="bi bi-check-circle me-2"></i>
          {{ t('patientHistoryView.prescription.createPrescription') }}
          <span
            v-if="state.prescription.medications.length > 0"
            class="badge bg-light text-dark ms-2"
          >
            {{ state.prescription.medications.length }}
          </span>
        </button>

        <button
          type="button"
          class="btn-action btn-action-secondary"
          @click="resetForm"
          :disabled="!toggles['patient.history.edit']"
        >
          <i class="bi bi-arrow-clockwise me-2"></i>
          {{ t('patientHistoryView.prescription.clear') }}
        </button>
      </div>
    </div>

    <!-- Errors -->
    <div v-if="state.errors.length > 0 || errorsAdd.length > 0" class="form-errors">
      <Warning>
        <template v-slot:message>
          <li v-for="(error, index) in [...state.errors, ...errorsAdd]" :key="index">
            {{ error }}
          </li>
        </template>
      </Warning>
    </div>
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.prescription-form-modern {
  width: 100%;
  margin: 0 auto;
}

/* Header */
.form-header-modern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.form-header-icon {
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.form-header-content {
  flex: 1;
}

.form-header-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.form-header-subtitle {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

/* Templates */
.templates-section {
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.templates-header h5 {
  margin: 0;
  color: var(--azul-turno);
  font-weight: 600;
  font-size: 0.85rem;
}

.btn-close-templates {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.btn-close-templates:hover {
  background: rgba(0, 0, 0, 0.1);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid rgba(0, 123, 255, 0.2);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
}

.template-card:hover {
  border-color: var(--azul-turno);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.template-icon {
  font-size: 1.2rem;
  color: var(--azul-turno);
}

.template-name {
  font-weight: 600;
  text-align: center;
  color: var(--color-text);
}

.template-usage {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.6;
}

/* Form Sections */
.form-section-modern {
  margin-bottom: 1.5rem;
}

.metric-card-subtitle {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

/* Form Fields */
.form-field-modern {
  display: flex;
  flex-direction: column;
}

.form-label-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.3rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.25rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  background: white;
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.form-control-modern:disabled {
  background: rgba(0, 0, 0, 0.05);
  cursor: not-allowed;
}

/* Medication Search */
.medication-search {
  position: relative;
  margin-bottom: 1rem;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  color: var(--color-text);
  opacity: 0.5;
  font-size: 0.9rem;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-top: none;
  border-radius: 0 0 0.25rem 0.25rem;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 0.8rem;
}

.search-result-item:hover {
  background: rgba(0, 123, 255, 0.05);
}

.medication-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.medication-details {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.7;
}

.medication-concentration {
  font-size: 0.7rem;
  color: var(--azul-turno);
  font-weight: 600;
}

.no-results {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.6;
  font-size: 0.8rem;
}

/* Medication Form */
.medication-form {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.75rem;
}

.medication-form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.medication-form-header h6 {
  margin: 0;
  color: var(--azul-turno);
  font-weight: 600;
  font-size: 0.85rem;
}

.btn-close-form {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.btn-close-form:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Medications List */
.medications-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.medication-item {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.medication-item:hover {
  border-color: rgba(0, 123, 255, 0.2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.medication-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.medication-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.8;
}

.medication-instructions {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  padding: 0.4rem;
  border-radius: 0.25rem;
  margin-top: 0.4rem;
}

/* Interaction Warnings */
.interaction-warnings {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.warning-title {
  display: flex;
  align-items: center;
  color: #856404;
  margin-bottom: 0.75rem;
  font-weight: 600;
  font-size: 0.85rem;
}

.warning-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.6rem;
  padding: 0.6rem;
  background: white;
  border-radius: 0.375rem;
  font-size: 0.75rem;
}

.warning-severity {
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.severity-low {
  background: rgba(40, 167, 69, 0.2);
  color: #155724;
}

.severity-moderate {
  background: rgba(255, 193, 7, 0.2);
  color: #856404;
}

.severity-high {
  background: rgba(220, 53, 69, 0.2);
  color: #721c24;
}

.warning-content {
  flex: 1;
}

.warning-content strong {
  color: var(--color-text);
  font-size: 0.75rem;
}

.warning-content p {
  margin: 0.2rem 0 0 0;
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
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

/* Form Errors */
.form-errors {
  margin-top: 0.75rem;
}

/* PDF Actions */
.pdf-actions-section {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: 0.5rem;
  padding: 1rem;
}

.success-message {
  display: flex;
  align-items: center;
  color: #155724;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.success-message i {
  font-size: 1rem;
  color: #28a745;
}

.pdf-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

/* Responsive */
@media (max-width: 768px) {
  .form-header-modern {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .medication-details {
    flex-direction: column;
    gap: 0.4rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
