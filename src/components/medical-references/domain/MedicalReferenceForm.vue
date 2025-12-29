<script>
import { ref, reactive, onMounted, toRefs, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Warning from '../../common/Warning.vue';
import Message from '../../common/Message.vue';
import DigitalSignatureICP from '../../common/DigitalSignatureICP.vue';
import {
  createReference,
  downloadReferencePdf,
  getReferencePdfUrl,
  sendReferenceByEmail,
  getReferenceById,
} from '../../../application/services/medical-reference';
import { searchTemplates as searchMedicalTemplates } from '../../../application/services/medical-template';
import { useSpeechRecognition } from '../../../components/patient-history/composables/useSpeechRecognition';

export default {
  name: 'MedicalReferenceForm',
  components: {
    Spinner,
    Warning,
    Message,
    DigitalSignatureICP,
  },
  props: {
    commerce: { type: Object, default: () => ({}) },
    client: { type: Object, default: () => ({}) },
    attention: { type: Object, default: () => ({}) },
    toggles: { type: Object, default: () => ({}) },
    errorsAdd: { type: Array, default: () => [] },
    receiveData: { type: Function, default: () => {} },
  },
  emits: ['reference-created'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const { commerce, client, attention, toggles, errorsAdd, receiveData } = toRefs(props);

    const state = reactive({
      reference: {
        commerceId: '',
        clientId: '',
        attentionId: '',
        referringDoctorId: '',
        referredToSpecialty: '',
        referredToDoctor: '',
        referredToInstitution: '',
        clinicalSummary: '',
        reasonForReferral: '',
        urgency: 'ROUTINE',
        preferredDate: '',
        diagnosis: '',
        relevantHistory: '',
        currentMedications: '',
        allergies: '',
        vitalSigns: '',
        additionalInstructions: '',
        followUpRequired: true,
        expectedOutcome: '',
        notes: '',
      },
      templates: {
        available: [],
        selected: null,
        loading: false,
      },
      specialties: [
        { value: 'CARDIOLOGY', label: 'Cardiología' },
        { value: 'DERMATOLOGY', label: 'Dermatología' },
        { value: 'ENDOCRINOLOGY', label: 'Endocrinología' },
        { value: 'GASTROENTEROLOGY', label: 'Gastroenterología' },
        { value: 'GYNECOLOGY', label: 'Ginecología' },
        { value: 'NEUROLOGY', label: 'Neurología' },
        { value: 'ONCOLOGY', label: 'Oncología' },
        { value: 'OPHTHALMOLOGY', label: 'Oftalmología' },
        { value: 'ORTHOPEDICS', label: 'Ortopedia' },
        { value: 'OTOLARYNGOLOGY', label: 'Otorrinolaringología' },
        { value: 'PEDIATRICS', label: 'Pediatría' },
        { value: 'PSYCHIATRY', label: 'Psiquiatría' },
        { value: 'PULMONOLOGY', label: 'Neumología' },
        { value: 'RHEUMATOLOGY', label: 'Reumatología' },
        { value: 'UROLOGY', label: 'Urología' },
        { value: 'GENERAL_SURGERY', label: 'Cirugía General' },
        { value: 'PLASTIC_SURGERY', label: 'Cirugía Plástica' },
        { value: 'EMERGENCY', label: 'Emergencias' },
        { value: 'INTERNAL_MEDICINE', label: 'Medicina Interna' },
        { value: 'FAMILY_MEDICINE', label: 'Medicina Familiar' },
        { value: 'OTHER', label: 'Otra Especialidad' },
      ],
      urgencyLevels: [
        { value: 'ROUTINE', label: 'Rutina' },
        { value: 'URGENT', label: 'Urgente' },
        { value: 'STAT', label: 'STAT (Inmediato)' },
        { value: 'ASAP', label: 'Lo antes posible' },
      ],
      errors: [],
      showTemplates: false,
      createdReference: null,
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

    // Initialize reference data
    onMounted(async () => {
      if (commerce.value?.id) state.reference.commerceId = commerce.value.id;
      if (client.value?.id) state.reference.clientId = client.value.id;
      if (attention.value?.id) state.reference.attentionId = attention.value.id;
      if (attention.value?.collaboratorId)
        state.reference.referringDoctorId = attention.value.collaboratorId;

      // Set default preferred date (1 week from now)
      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + 7);
      state.reference.preferredDate = preferredDate.toISOString().split('T')[0];

      await loadTemplates();
    });

    // Load reference templates
    const loadTemplates = async () => {
      if (!commerce.value?.id || !state.reference.referringDoctorId) return;

      try {
        state.templates.loading = true;
        const templates = await searchMedicalTemplates(
          commerce.value.id,
          state.reference.referringDoctorId,
          {
            type: 'REFERENCE',
            limit: 20,
          },
        );

        state.templates.available = templates?.data || [];
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        state.templates.loading = false;
      }
    };

    // Apply template
    const applyTemplate = async template => {
      try {
        loading.value = true;

        // Apply template data to reference
        if (template.clinicalSummary) {
          state.reference.clinicalSummary = template.clinicalSummary;
        }
        if (template.reasonForReferral) {
          state.reference.reasonForReferral = template.reasonForReferral;
        }
        if (template.additionalInstructions) {
          state.reference.additionalInstructions = template.additionalInstructions;
        }
        if (template.referredToSpecialty) {
          state.reference.referredToSpecialty = template.referredToSpecialty;
        }
        if (template.urgency) {
          state.reference.urgency = template.urgency;
        }

        state.templates.selected = template;
        state.showTemplates = false;
        sendData();
      } catch (error) {
        console.error('Error applying template:', error);
        state.errors.push('Error al aplicar plantilla');
      } finally {
        loading.value = false;
      }
    };

    // Create reference
    const createReferenceHandler = async () => {
      state.errors = [];

      // Validate reference
      if (!state.reference.referredToSpecialty) {
        state.errors.push('Seleccione la especialidad de referencia');
        return;
      }
      if (!state.reference.reasonForReferral) {
        state.errors.push('Ingrese el motivo de la referencia');
        return;
      }
      if (!state.reference.clinicalSummary) {
        state.errors.push('Ingrese el resumen clínico');
        return;
      }

      try {
        loading.value = true;
        const reference = await createReference(state.reference);
        state.createdReference = reference;
        state.showPdfActions = true;
        // Check if reference is already signed
        if (reference.isSigned) {
          state.signatureInfo = {
            signedAt: reference.signedAt,
            signedBy: reference.signedBy,
            certificateInfo: reference.certificateInfo,
          };
        }
        emit('reference-created', reference);
        sendData();
        // Don't reset form yet - show PDF actions
      } catch (error) {
        console.error('Error creating reference:', error);
        state.errors.push('Error al crear la referencia');
      } finally {
        loading.value = false;
      }
    };

    // Reset form
    const resetForm = () => {
      state.reference.referredToSpecialty = '';
      state.reference.referredToDoctor = '';
      state.reference.referredToInstitution = '';
      state.reference.clinicalSummary = '';
      state.reference.reasonForReferral = '';
      state.reference.diagnosis = '';
      state.reference.relevantHistory = '';
      state.reference.currentMedications = '';
      state.reference.allergies = '';
      state.reference.vitalSigns = '';
      state.reference.additionalInstructions = '';
      state.reference.expectedOutcome = '';
      state.reference.notes = '';
      state.reference.urgency = 'ROUTINE';
      state.reference.followUpRequired = true;

      // Reset preferred date to 1 week from now
      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + 7);
      state.reference.preferredDate = preferredDate.toISOString().split('T')[0];
      state.createdReference = null;
      state.showPdfActions = false;
    };

    // PDF Actions
    const handleDownloadPdf = async () => {
      if (!state.createdReference?.id) return;
      try {
        state.pdfLoading = true;
        const pdfBlob = await downloadReferencePdf(state.createdReference.id);
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `referencia-${state.createdReference.id}-${
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
      if (!state.createdReference?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getReferencePdfUrl(state.createdReference.id, 3600);
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
      if (!state.createdReference?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getReferencePdfUrl(state.createdReference.id, 3600);
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
      // Refresh reference to get updated signature info
      if (state.createdReference?.id) {
        try {
          const updated = await getReferenceById(state.createdReference.id);
          state.createdReference = updated;
          state.signatureInfo = {
            signedAt: updated.signedAt,
            signedBy: updated.signedBy,
            certificateInfo: updated.certificateInfo,
          };
        } catch (error) {
          console.error('Error refreshing reference:', error);
        }
      }
    };

    const handleSignatureVerified = result => {
      // Verification result is already shown in the component
      console.log('Signature verification:', result);
    };

    const handleSignatureCancel = () => {
      state.showDigitalSignature = false;
    };

    // Send data to parent
    const sendData = () => {
      receiveData.value(state.reference);
    };

    // Get urgency badge class
    const getUrgencyBadgeClass = urgency => {
      const urgencyClasses = {
        ROUTINE: 'urgency-routine',
        URGENT: 'urgency-urgent',
        STAT: 'urgency-stat',
        ASAP: 'urgency-asap',
      };
      return urgencyClasses[urgency] || 'urgency-routine';
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

      const currentText = state.reference[targetField] || '';
      state.reference[targetField] =
        currentText && currentText.trim() !== ''
          ? `${currentText}\n\n${timestampedText}`
          : timestampedText;
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
      state.reference[targetField] = '';
      sendData();
    };

    // Watch for changes
    watch(() => state.reference, sendData, { deep: true });

    return {
      state,
      loading,
      toggles,
      errorsAdd,
      t,
      applyTemplate,
      createReferenceHandler,
      resetForm,
      getUrgencyBadgeClass,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      clearField,
      handleDownloadPdf,
      handlePrintPdf,
      handleViewPdf,
      continueAfterPdf,
      handleSignatureSigned,
      handleSignatureVerified,
      handleSignatureCancel,
      pdfLoading: state.pdfLoading,
    };
  },
};
</script>

<template>
  <div class="reference-form-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-clipboard-data"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ t('patientHistoryView.reference.create') }}</h3>
        <p class="form-header-subtitle">{{ t('patientHistoryView.reference.subtitle') }}</p>
      </div>
      <div v-if="state.templates.available.length > 0" class="ms-auto">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="state.showTemplates = !state.showTemplates"
        >
          <i class="bi bi-lightning-fill me-1"></i>
          {{ t('patientHistoryView.reference.templates') }}
        </button>
      </div>
    </div>

    <!-- Templates Button -->
    <div v-if="state.templates.available.length > 0" class="mb-3">
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        @click="state.showTemplates = !state.showTemplates"
      >
        <i class="bi bi-lightning-fill me-1"></i>
        {{ t('patientHistoryView.reference.templates') }}
      </button>
    </div>

    <!-- Quick Templates -->
    <div v-if="state.showTemplates" class="templates-section">
      <div class="templates-header">
        <h5>{{ t('patientHistoryView.reference.referenceTemplates') }}</h5>
        <button class="btn-close-templates" @click="state.showTemplates = false">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="templates-grid">
        <button
          v-for="template in state.templates.available"
          :key="template.id"
          class="template-card"
          @click="applyTemplate(template)"
        >
          <i class="bi bi-file-medical template-icon"></i>
          <span class="template-name">{{ template.name }}</span>
          <span class="template-description">{{ template.description }}</span>
        </button>
      </div>
    </div>

    <!-- Reference Form -->
    <div class="reference-content">
      <!-- Basic Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-info-circle me-2"></i>
          {{ t('patientHistoryView.reference.referenceInformation') }}
        </h5>

        <div class="row g-3">
          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-hospital me-1"></i>
                {{ t('patientHistoryView.reference.destinationSpecialty') }} *
              </label>
              <select
                v-model="state.reference.referredToSpecialty"
                class="form-control-modern"
                :disabled="!toggles['patient.history.edit']"
              >
                <option value="">{{ t('patientHistoryView.reference.selectSpecialty') }}</option>
                <option
                  v-for="specialty in state.specialties"
                  :key="specialty.value"
                  :value="specialty.value"
                >
                  {{ specialty.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-person-badge me-1"></i>
                {{ t('patientHistoryView.reference.specialistDoctor') }}
              </label>
              <input
                v-model="state.reference.referredToDoctor"
                type="text"
                class="form-control-modern"
                placeholder="Nombre del médico especialista (opcional)"
                :disabled="!toggles['patient.history.edit']"
              />
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-building me-1"></i>
                {{ t('patientHistoryView.reference.destinationInstitution') }}
              </label>
              <input
                v-model="state.reference.referredToInstitution"
                type="text"
                class="form-control-modern"
                placeholder="Hospital, clínica o centro médico"
                :disabled="!toggles['patient.history.edit']"
              />
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-exclamation-circle me-1"></i>
                {{ t('patientHistoryView.reference.urgency') }}
              </label>
              <select
                v-model="state.reference.urgency"
                class="form-control-modern"
                :disabled="!toggles['patient.history.edit']"
              >
                <option
                  v-for="urgency in state.urgencyLevels"
                  :key="urgency.value"
                  :value="urgency.value"
                >
                  {{ urgency.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-calendar-event me-1"></i>
                {{ t('patientHistoryView.reference.preferredDate') }}
              </label>
              <input
                v-model="state.reference.preferredDate"
                type="date"
                class="form-control-modern"
                :disabled="!toggles['patient.history.edit']"
              />
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern d-flex align-items-center gap-2">
                <input
                  v-model="state.reference.followUpRequired"
                  type="checkbox"
                  :disabled="!toggles['patient.history.edit']"
                  style="width: 16px; height: 16px; accent-color: var(--azul-turno); cursor: pointer;"
                />
                <i class="bi bi-arrow-repeat me-1"></i>
                {{ t('patientHistoryView.reference.requiresFollowUp') }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Clinical Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-clipboard-heart me-2"></i>
          {{ t('patientHistoryView.reference.clinicalInformation') }}
        </h5>

        <div class="form-field-modern">
          <label class="form-label-modern">
            <i class="bi bi-card-text me-1"></i>
            {{ t('patientHistoryView.reference.reasonForReferral') }} *
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-1 btn-outline-secondary"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition('reasonForReferral')"
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
              @click="clearField('reasonForReferral')"
              :title="$t('patientHistoryView.clearField')"
            >
              <i class="bi bi-eraser"></i>
            </button>
          </label>
          <textarea
            v-model="state.reference.reasonForReferral"
            class="form-control-modern"
            rows="3"
            placeholder="Explique por qué está refiriendo al paciente"
            :disabled="!toggles['patient.history.edit']"
          ></textarea>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern">
            <i class="bi bi-file-medical me-1"></i>
            {{ t('patientHistoryView.reference.clinicalSummary') }} *
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-1 btn-outline-secondary"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition('clinicalSummary')"
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
              @click="clearField('clinicalSummary')"
              :title="$t('patientHistoryView.clearField')"
            >
              <i class="bi bi-eraser"></i>
            </button>
          </label>
          <textarea
            v-model="state.reference.clinicalSummary"
            class="form-control-modern"
            rows="3"
            placeholder="Resumen del estado actual del paciente y hallazgos relevantes"
            :disabled="!toggles['patient.history.edit']"
          ></textarea>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-clipboard-pulse me-1"></i>
                {{ t('patientHistoryView.reference.principalDiagnosis') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
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
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  @click="clearField('diagnosis')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.diagnosis"
                class="form-control-modern"
                rows="3"
                placeholder="Diagnóstico principal o presuntivo"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-bullseye me-1"></i>
                {{ t('patientHistoryView.reference.expectedResult') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('expectedOutcome')"
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
                  @click="clearField('expectedOutcome')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.expectedOutcome"
                class="form-control-modern"
                rows="3"
                placeholder="Qué espera obtener de esta referencia"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Patient History -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-journal-medical me-2"></i>
          {{ t('patientHistoryView.reference.patientHistory') }}
        </h5>

        <div class="form-field-modern">
          <label class="form-label-modern">
            <i class="bi bi-clock-history me-1"></i>
            {{ t('patientHistoryView.reference.relevantHistory') }}
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-1 btn-outline-secondary"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition('relevantHistory')"
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
              @click="clearField('relevantHistory')"
              :title="$t('patientHistoryView.clearField')"
            >
              <i class="bi bi-eraser"></i>
            </button>
          </label>
          <textarea
            v-model="state.reference.relevantHistory"
            class="form-control-modern"
            rows="3"
            placeholder="Antecedentes médicos, quirúrgicos y familiares relevantes"
            :disabled="!toggles['patient.history.edit']"
          ></textarea>
        </div>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-capsule me-1"></i>
                {{ t('patientHistoryView.reference.currentMedications') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('currentMedications')"
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
                  @click="clearField('currentMedications')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.currentMedications"
                class="form-control-modern"
                rows="3"
                placeholder="Lista de medicamentos que está tomando actualmente"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-exclamation-triangle me-1"></i>
                {{ t('patientHistoryView.reference.allergies') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('allergies')"
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
                  @click="clearField('allergies')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.allergies"
                class="form-control-modern"
                rows="3"
                placeholder="Alergias conocidas a medicamentos, alimentos, etc."
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern">
            <i class="bi bi-heart-pulse me-1"></i>
            {{ t('patientHistoryView.reference.recentVitalSigns') }}
            <button
              v-if="isSpeechSupported && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm ms-1 btn-outline-secondary"
              :class="{ 'btn-danger': isListeningSpeech }"
              @click="toggleSpeechRecognition('vitalSigns')"
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
              @click="clearField('vitalSigns')"
              :title="$t('patientHistoryView.clearField')"
            >
              <i class="bi bi-eraser"></i>
            </button>
          </label>
          <textarea
            v-model="state.reference.vitalSigns"
            class="form-control-modern"
            rows="3"
            placeholder="PA, FC, FR, Temperatura, Peso, Talla, etc."
            :disabled="!toggles['patient.history.edit']"
          ></textarea>
        </div>
      </div>

      <!-- Additional Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-file-text me-2"></i>
          {{ t('patientHistoryView.reference.additionalInformation') }}
        </h5>

        <div class="row g-3">
          <div class="col-md-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-info-circle me-1"></i>
                {{ t('patientHistoryView.reference.specialInstructions') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('additionalInstructions')"
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
                  @click="clearField('additionalInstructions')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.additionalInstructions"
                class="form-control-modern"
                rows="3"
                placeholder="Instrucciones específicas para el especialista o el paciente"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-md-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-sticky me-1"></i>
                {{ t('patientHistoryView.reference.internalNotes') }}
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm ms-1 btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('notes')"
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
                  @click="clearField('notes')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.reference.notes"
                class="form-control-modern"
                rows="3"
                placeholder="Notas para uso interno (no aparecen en la referencia)"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Preview -->
      <div
        v-if="state.reference.referredToSpecialty || state.reference.reasonForReferral"
        class="form-section-modern"
      >
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-eye me-2"></i>
          {{ t('patientHistoryView.reference.preview') }}
        </h5>

        <div class="reference-preview">
          <div class="preview-header">
            <div class="preview-title">
              {{ t('patientHistoryView.reference.medicalReference') }}
            </div>
            <span
              v-if="state.reference.urgency"
              :class="['urgency-badge', getUrgencyBadgeClass(state.reference.urgency)]"
            >
              {{ state.urgencyLevels.find(u => u.value === state.reference.urgency)?.label }}
            </span>
          </div>

          <div class="preview-content">
            <div v-if="state.reference.referredToSpecialty" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.specialty') }}:</strong>
              {{
                state.specialties.find(s => s.value === state.reference.referredToSpecialty)?.label
              }}
            </div>

            <div v-if="state.reference.referredToDoctor" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.doctor') }}:</strong>
              {{ state.reference.referredToDoctor }}
            </div>

            <div v-if="state.reference.referredToInstitution" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.institution') }}:</strong>
              {{ state.reference.referredToInstitution }}
            </div>

            <div v-if="state.reference.reasonForReferral" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.reason') }}:</strong>
              {{ state.reference.reasonForReferral }}
            </div>

            <div v-if="state.reference.clinicalSummary" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.clinicalSummary') }}:</strong>
              {{ state.reference.clinicalSummary }}
            </div>

            <div v-if="state.reference.preferredDate" class="preview-item">
              <strong>{{ t('patientHistoryView.reference.preferredDate') }}:</strong>
              {{ new Date(state.reference.preferredDate).toLocaleDateString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- PDF Actions (shown after reference creation) -->
      <div
        v-if="state.showPdfActions && state.createdReference"
        class="form-section pdf-actions-section"
      >
        <div class="success-message">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong>{{ t('patientHistoryView.reference.createdSuccessfully') }}</strong>
        </div>
        <div class="pdf-actions">
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleViewPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-eye me-2"></i>
            {{ t('patientHistoryView.reference.viewPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleDownloadPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-download me-2"></i>
            {{ t('patientHistoryView.reference.downloadPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handlePrintPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-printer me-2"></i>
            {{ t('patientHistoryView.reference.printPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="openEmailModal"
            :disabled="pdfLoading"
          >
            <i class="bi bi-envelope me-2"></i>
            {{ t('patientHistoryView.reference.sendEmail') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="state.showDigitalSignature = true"
            :disabled="state.createdReference?.isSigned || pdfLoading"
          >
            <i class="bi bi-shield-check me-2"></i>
            {{ t('digitalSignature.icp.sign') }}
          </button>
          <button type="button" class="btn-action btn-action-secondary" @click="continueAfterPdf">
            <i class="bi bi-arrow-right me-2"></i>
            {{ t('patientHistoryView.reference.continue') }}
          </button>
        </div>
      </div>

      <!-- Digital Signature Section -->
      <div v-if="state.showDigitalSignature && state.createdReference" class="form-section">
        <DigitalSignatureICP
          :document-type="'reference'"
          :document-id="state.createdReference.id"
          :is-signed="state.createdReference.isSigned || false"
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
              {{ t('patientHistoryView.reference.sendEmailTitle') }}
            </h5>
            <button type="button" class="btn-close" @click="closeEmailModal">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-envelope me-1"></i>
                {{ t('patientHistoryView.reference.recipientEmail') }} *
              </label>
              <input
                type="email"
                class="form-control"
                v-model="state.emailForm.recipientEmail"
                :placeholder="t('patientHistoryView.reference.recipientEmailPlaceholder')"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-tag me-1"></i>
                {{ t('patientHistoryView.reference.emailSubject') }}
              </label>
              <input
                type="text"
                class="form-control"
                v-model="state.emailForm.subject"
                :placeholder="t('patientHistoryView.reference.emailSubjectPlaceholder')"
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <i class="bi bi-chat-left-text me-1"></i>
                {{ t('patientHistoryView.reference.emailMessage') }}
              </label>
              <textarea
                class="form-control"
                v-model="state.emailForm.message"
                rows="4"
                :placeholder="t('patientHistoryView.reference.emailMessagePlaceholder')"
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
              {{ t('patientHistoryView.reference.sendEmail') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-else class="form-actions">
        <button
          type="button"
          class="btn-action btn-action-primary"
          @click="createReferenceHandler"
          :disabled="
            !toggles['patient.history.edit'] ||
            !state.reference.referredToSpecialty ||
            !state.reference.reasonForReferral
          "
        >
          <i class="bi bi-check-circle me-2"></i>
          {{ t('patientHistoryView.reference.createReference') }}
        </button>

        <button
          type="button"
          class="btn-action btn-action-secondary"
          @click="resetForm"
          :disabled="!toggles['patient.history.edit']"
        >
          <i class="bi bi-arrow-clockwise me-2"></i>
          {{ t('patientHistoryView.reference.clear') }}
        </button>
      </div>
    </div>
    <!-- End reference-content -->

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

.reference-form-modern {
  width: 100%;
  margin: 0 auto;
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

.form-header-icon {
  font-size: 2rem;
  color: var(--azul-turno);
}

.form-header-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.form-header-subtitle {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

.form-header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-template-quick {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-template-quick:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Templates */
.templates-section {
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.templates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.templates-header h5 {
  margin: 0;
  color: var(--azul-turno);
  font-weight: 600;
}

.btn-close-templates {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.btn-close-templates:hover {
  background: rgba(0, 0, 0, 0.1);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 2px solid rgba(0, 123, 255, 0.2);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.template-card:hover {
  border-color: var(--azul-turno);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
}

.template-icon {
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.template-name {
  font-weight: 600;
  text-align: center;
  color: var(--color-text);
}

.template-description {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.6;
  text-align: center;
}

/* Form Sections */
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
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
  resize: vertical;
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

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.form-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--azul-turno);
}

/* Preview */
.reference-preview {
  background: white;
  border: 2px solid rgba(0, 123, 255, 0.2);
  border-radius: 0.75rem;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(40, 167, 69, 0.1) 100%);
  border-bottom: 1px solid rgba(0, 123, 255, 0.2);
}

.preview-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--azul-turno);
}

.urgency-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-routine {
  background: rgba(40, 167, 69, 0.2);
  color: #155724;
}

.urgency-urgent {
  background: rgba(255, 193, 7, 0.2);
  color: #856404;
}

.urgency-stat {
  background: rgba(220, 53, 69, 0.2);
  color: #721c24;
}

.urgency-asap {
  background: rgba(255, 107, 0, 0.2);
  color: #cc4400;
}

.preview-content {
  padding: 1rem;
}

.preview-item {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
}

.preview-item strong {
  color: var(--azul-turno);
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

/* Form Errors */
.form-errors {
  margin-top: 1rem;
}

/* PDF Actions */
.pdf-actions-section {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(40, 167, 69, 0.05) 100%);
  border: 2px solid rgba(40, 167, 69, 0.3);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-top: 2rem;
}

.success-message {
  display: flex;
  align-items: center;
  color: #155724;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.success-message i {
  font-size: 1.25rem;
  color: #28a745;
}

.pdf-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Modern Compact Styles */
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

.metric-card-subtitle {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
}

/* Responsive */
@media (max-width: 768px) {
  .form-header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
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
