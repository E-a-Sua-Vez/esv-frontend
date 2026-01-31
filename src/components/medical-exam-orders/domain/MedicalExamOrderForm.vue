<script>
import { ref, reactive, onMounted, toRefs, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../../common/Spinner.vue';
import Warning from '../../common/Warning.vue';
import Message from '../../common/Message.vue';
import DigitalSignatureICP from '../../common/DigitalSignatureICP.vue';
import {
  searchExams,
  createExamOrder,
  getExamResultTemplate,
  listExamResultTemplates,
  downloadExamOrderPdf,
  getExamOrderPdfUrl,
  sendExamOrderByEmail,
  getExamOrderById,
} from '../../../application/services/medical-exam-order';
import { searchTemplates as searchMedicalTemplates } from '../../../application/services/medical-template';
import { useSpeechRecognition } from '../../../components/patient-history/composables/useSpeechRecognition';
import PdfTemplateSelector from '../../pdf-templates/PdfTemplateSelector.vue';
import { globalStore } from '../../../stores';
import { getAttentionDetails } from '../../../application/services/attention';

export default {
  name: 'MedicalExamOrderForm',
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
  emits: ['exam-order-created'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const store = globalStore();
    const { commerce, client, attention, toggles, errorsAdd, receiveData } = toRefs(props);

    const state = reactive({
      examOrder: {
        commerceId: '',
        clientId: '',
        attentionId: '',
        doctorId: '',
        collaboratorId: '', // DEPRECATED: mantener por compatibilidad
        professionalId: '', // PREFERRED: usar este para nuevos documentos
        exams: [],
        clinicalIndication: '',
        diagnosis: '',
        urgency: 'ROUTINE',
        scheduledDate: '',
        notes: '',
        fasting: false,
        specialInstructions: '',
      },
      currentExam: {
        examId: '',
        examName: '',
        examCode: '',
        type: '',
        category: '',
        instructions: '',
        preparationInstructions: '',
        estimatedDuration: '',
        cost: 0,
      },
      examSearch: {
        searchTerm: '',
        results: [],
        loading: false,
        showResults: false,
        filters: {
          type: '',
          category: '',
        },
      },
      templates: {
        available: [],
        examTemplates: [],
        selected: null,
        loading: false,
      },
      pdfTemplate: {
        selected: null,
        showSelector: false,
      },
      errors: [],
      showTemplates: false,
      showExamForm: false,
      createdExamOrder: null,
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
      examTypes: [
        { value: 'laboratory', label: 'Laboratorio' },
        { value: 'imaging', label: 'Imagenología' },
        { value: 'procedure', label: 'Procedimiento' },
        { value: 'other', label: 'Otros' },
      ],
      urgencyLevels: [],
    });

    // Initialize exam order data
    onMounted(async () => {
      // Extract attention ID first (could be string, object with id, or object with full details)
      let attentionId = null;
      if (typeof attention.value === 'string') {
        attentionId = attention.value;
      } else if (attention.value?.id) {
        attentionId = attention.value.id;
      }

      // Set attention ID immediately if we have it
      if (attentionId) {
        state.examOrder.attentionId = attentionId;
      }

      if (commerce.value?.id) state.examOrder.commerceId = commerce.value.id;
      if (client.value?.id) state.examOrder.clientId = client.value.id;

      // Load full attention details if we need collaborator info
      let attentionDetails = attention.value;
      if (attentionId && !attention.value?.collaboratorId) {
        try {
          attentionDetails = await getAttentionDetails(attentionId);
          // Ensure attentionId is set (in case getAttentionDetails succeeds but ID was missing)
          if (attentionDetails?.id) {
            state.examOrder.attentionId = attentionDetails.id;
          }
        } catch (error) {
          console.error('❌ Error loading attention details:', error);
          // Keep the ID we already set from the prop
        }
      } else if (!attentionId) {
        console.warn('⚠️ No attention ID found in prop');
      }

      // Priorizar professionalId sobre collaboratorId (nuevo patrón)
      if (attentionDetails?.professionalId) {
        state.examOrder.professionalId = attentionDetails.professionalId;
        state.examOrder.doctorId = attentionDetails.professionalId;
      }
      if (attentionDetails?.collaboratorId) {
        state.examOrder.collaboratorId = attentionDetails.collaboratorId;
        // Solo usar collaboratorId como doctorId si no hay professionalId
        if (!attentionDetails.professionalId) {
          state.examOrder.doctorId = attentionDetails.collaboratorId;
        }
      }

      // Fallback final: usar usuario actual del store
      if (!state.examOrder.doctorId) {
        console.warn(
          '⚠️ No professional/collaborator ID found in attention, using current user from store',
        );
        try {
          const currentUser = await store.getCurrentUser;
          if (currentUser && currentUser.id) {
            state.examOrder.doctorId = currentUser.id;
            state.examOrder.collaboratorId = currentUser.id; // Asumir que es collaborator
          } else {
            console.error('❌ No current user found in store');
          }
        } catch (error) {
          console.error('❌ Error getting current user from store:', error);
        }
      }

      await loadTemplates();
    });

    // Load exam order templates
    const loadTemplates = async () => {
      if (!commerce.value?.id || !state.examOrder.doctorId) return;

      try {
        state.templates.loading = true;
        const [orderTemplates, examTemplates] = await Promise.all([
          searchMedicalTemplates(commerce.value.id, state.examOrder.doctorId, {
            type: 'exam_order',
            limit: 20,
          }),
          listExamResultTemplates(commerce.value.id),
        ]);

        state.templates.available = orderTemplates?.data || [];
        state.templates.examTemplates = examTemplates || [];
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        state.templates.loading = false;
      }
    };

    // Search exams
    const searchExamsHandler = async () => {
      if (!state.examSearch.searchTerm || state.examSearch.searchTerm.length < 2) {
        state.examSearch.results = [];
        state.examSearch.showResults = false;
        return;
      }

      try {
        state.examSearch.loading = true;
        const results = await searchExams({
          q: state.examSearch.searchTerm,
          type: state.examSearch.filters.type,
          limit: 15,
          commerceId: commerce.value?.id,
        });
        state.examSearch.results = results?.exams || [];
        state.examSearch.showResults = true;
      } catch (error) {
        console.error('Error searching exams:', error);
        state.examSearch.results = [];
      } finally {
        state.examSearch.loading = false;
      }
    };

    // Select exam from search results
    const selectExam = async exam => {
      state.currentExam.examId = exam.id;
      state.currentExam.examName = exam.name;
      state.currentExam.examCode = exam.code;
      state.currentExam.type = exam.type;
      state.currentExam.category = exam.category;
      state.currentExam.instructions = exam.instructions || '';
      state.currentExam.preparationInstructions = exam.preparation || '';
      state.currentExam.estimatedDuration = exam.estimatedDuration || '';
      state.currentExam.cost = exam.cost || 0;

      state.examSearch.searchTerm = exam.name;
      state.examSearch.showResults = false;
      state.showExamForm = true;

      // Load exam-specific template if available
      try {
        const template = await getExamResultTemplate(exam.code, commerce.value.id);
        if (template) {
          state.currentExam.instructions = template.instructions || state.currentExam.instructions;
          state.currentExam.preparationInstructions =
            template.preparationInstructions || state.currentExam.preparationInstructions;
        }
      } catch (error) {}
    };

    // Add exam to order
    const addExam = async () => {
      state.errors = [];

      // Validate exam form
      if (!state.currentExam.examId) {
        state.errors.push('Seleccione un examen');
        return;
      }
      if (!state.currentExam.examName) {
        state.errors.push('El examen debe tener un nombre');
        return;
      }

      try {
        loading.value = true;

        // Add exam to list
        const exam = { ...state.currentExam };
        state.examOrder.exams.push(exam);

        // Clear current exam form
        resetExamForm();

        // Send updated data
        sendData();
      } catch (error) {
        console.error('Error adding exam:', error);
        state.errors.push('Error al agregar examen');
      } finally {
        loading.value = false;
      }
    };

    // Remove exam from order
    const removeExam = index => {
      state.examOrder.exams.splice(index, 1);
      sendData();
    };

    // Apply template
    const applyTemplate = async template => {
      try {
        loading.value = true;

        // Apply template data to exam order
        if (template.clinicalIndication) {
          state.examOrder.clinicalIndication = template.clinicalIndication;
        }
        if (template.exams && Array.isArray(template.exams)) {
          state.examOrder.exams = [...state.examOrder.exams, ...template.exams];
        }
        if (template.instructions) {
          state.examOrder.specialInstructions = template.instructions;
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

    // Create exam order
    const createExamOrderHandler = async () => {
      state.errors = [];

      // Validate exam order
      if (state.examOrder.exams.length === 0) {
        state.errors.push('Agregue al menos un examen');
        return;
      }
      if (!state.examOrder.clinicalIndication) {
        state.errors.push('Ingrese la indicación clínica');
        return;
      }

      try {
        loading.value = true;
        const examOrderData = {
          ...state.examOrder,
          pdfTemplateId: state.pdfTemplate.selected,
        };
        const examOrder = await createExamOrder(examOrderData);
        state.createdExamOrder = examOrder;
        state.showPdfActions = true;
        // Check if exam order is already signed
        if (examOrder.isSigned) {
          state.signatureInfo = {
            signedAt: examOrder.signedAt,
            signedBy: examOrder.signedBy,
            certificateInfo: examOrder.certificateInfo,
          };
        }
        emit('exam-order-created', examOrder);
        sendData();
        // Don't reset form yet - show PDF actions
      } catch (error) {
        console.error('Error creating exam order:', error);
        state.errors.push('Error al crear la orden de examen');
      } finally {
        loading.value = false;
      }
    };

    // Reset forms
    const resetExamForm = () => {
      state.currentExam = {
        examId: '',
        examName: '',
        examCode: '',
        type: '',
        category: '',
        instructions: '',
        preparationInstructions: '',
        estimatedDuration: '',
        cost: 0,
      };
      state.examSearch.searchTerm = '';
      state.showExamForm = false;
    };

    const resetForm = () => {
      state.examOrder.exams = [];
      state.examOrder.clinicalIndication = '';
      state.examOrder.diagnosis = '';
      state.examOrder.notes = '';
      state.examOrder.specialInstructions = '';
      state.examOrder.scheduledDate = '';
      state.examOrder.fasting = false;
      state.createdExamOrder = null;
      state.showPdfActions = false;
      state.showEmailModal = false;
      state.emailForm = {
        recipientEmail: '',
        subject: '',
        message: '',
      };
      resetExamForm();
    };

    // Send data to parent
    const sendData = () => {
      try {
        // Ensure examOrder has a unique identifier
        if (!state.examOrder.examOrderId && !state.examOrder.id) {
          // Generate a temporary ID if none exists
          state.examOrder.examOrderId = `temp_exam_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        }

        if (typeof receiveData.value === 'function') {
          receiveData.value(state.examOrder);
        } else {
          console.warn('⚠️ receiveData is not a function in MedicalExamOrderForm');
        }
      } catch (error) {
        console.error('❌ Error sending exam order data:', error);
      }
    };

    // PDF Actions
    const handleDownloadPdf = async () => {
      if (!state.createdExamOrder?.id) return;
      try {
        state.pdfLoading = true;
        const pdfBlob = await downloadExamOrderPdf(state.createdExamOrder.id);
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orden-examen-${state.createdExamOrder.id}-${
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
      if (!state.createdExamOrder?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getExamOrderPdfUrl(state.createdExamOrder.id, 3600);
        const printWindow = window.open(pdfUrl.url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      } catch (error) {
        console.error('Error printing PDF:', error);
        state.errors.push('Error al imprimir el PDF');
      } finally {
        state.pdfLoading = false;
      }
    };

    const handleViewPdf = async () => {
      if (!state.createdExamOrder?.id) return;
      try {
        state.pdfLoading = true;
        const pdfUrl = await getExamOrderPdfUrl(state.createdExamOrder.id, 3600);
        window.open(pdfUrl.url, '_blank');
      } catch (error) {
        console.error('Error viewing PDF:', error);
        state.errors.push('Error al ver el PDF');
      } finally {
        state.pdfLoading = false;
      }
    };

    const continueAfterPdf = () => {
      resetForm();
    };

    // Digital Signature handlers
    const handleSignatureSigned = async result => {
      // Refresh exam order to get updated signature info
      if (state.createdExamOrder?.id) {
        try {
          const updated = await getExamOrderById(state.createdExamOrder.id);
          state.createdExamOrder = updated;
          state.signatureInfo = {
            signedAt: updated.signedAt,
            signedBy: updated.signedBy,
            certificateInfo: updated.certificateInfo,
          };
        } catch (error) {
          console.error('Error refreshing exam order:', error);
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
      state.emailForm.recipientEmail = client.value.email; // Pre-fill with client email
      state.emailForm.subject = t('patientHistoryView.examOrder.emailSubjectPlaceholder');
      state.emailForm.message = t('patientHistoryView.examOrder.emailMessagePlaceholder');
      state.showEmailModal = true;
    };

    const closeEmailModal = () => {
      state.showEmailModal = false;
      state.emailForm = { recipientEmail: '', subject: '', message: '' };
    };

    const handleSendEmail = async () => {
      state.errors = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!state.emailForm.recipientEmail || !emailRegex.test(state.emailForm.recipientEmail)) {
        state.errors.push(t('patientHistoryView.examOrder.validate.recipientEmail'));
        return;
      }

      try {
        state.emailLoading = true;
        await sendExamOrderByEmail(state.createdExamOrder.id, {
          recipientEmail: state.emailForm.recipientEmail,
          subject: state.emailForm.subject,
          message: state.emailForm.message,
        });
        state.errors = [];
        closeEmailModal();
        alert(
          t('patientHistoryView.examOrder.emailSentSuccessfully') || 'Email enviado exitosamente',
        );
      } catch (error) {
        console.error('Error sending email:', error);
        state.errors.push('Error al enviar el email');
      } finally {
        state.emailLoading = false;
      }
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

      if (targetField === 'clinicalIndication') {
        const currentText = state.examOrder.clinicalIndication || '';
        state.examOrder.clinicalIndication =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
      } else if (targetField === 'diagnosis') {
        const currentText = state.examOrder.diagnosis || '';
        state.examOrder.diagnosis =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
      } else if (targetField === 'specialInstructions') {
        const currentText = state.examOrder.specialInstructions || '';
        state.examOrder.specialInstructions =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
      } else if (targetField === 'notes') {
        const currentText = state.examOrder.notes || '';
        state.examOrder.notes =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
      } else if (targetField === 'examInstructions') {
        const currentText = state.currentExam.instructions || '';
        state.currentExam.instructions =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
      } else if (targetField === 'preparationInstructions') {
        const currentText = state.currentExam.preparationInstructions || '';
        state.currentExam.preparationInstructions =
          currentText && currentText.trim() !== ''
            ? `${currentText}\n\n${timestampedText}`
            : timestampedText;
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
      if (targetField === 'clinicalIndication') {
        state.examOrder.clinicalIndication = '';
      } else if (targetField === 'diagnosis') {
        state.examOrder.diagnosis = '';
      } else if (targetField === 'specialInstructions') {
        state.examOrder.specialInstructions = '';
      } else if (targetField === 'notes') {
        state.examOrder.notes = '';
      } else if (targetField === 'examInstructions') {
        state.currentExam.instructions = '';
      } else if (targetField === 'preparationInstructions') {
        state.currentExam.preparationInstructions = '';
      }
      sendData();
    };

    // Watch for changes
    watch(() => state.examOrder, sendData, { deep: true });

    // Computed urgency levels with translations
    const urgencyLevels = computed(() => [
      { value: 'ROUTINE', label: t('patientHistoryView.examOrder.urgencyRoutine') },
      { value: 'URGENT', label: t('patientHistoryView.examOrder.urgencyUrgent') },
      { value: 'STAT', label: t('patientHistoryView.examOrder.urgencyStat') },
      { value: 'ASAP', label: t('patientHistoryView.examOrder.urgencyAsap') },
    ]);

    // Initialize urgency levels
    state.urgencyLevels = urgencyLevels.value;

    // Watch for language changes and update urgency levels
    watch(urgencyLevels, newLevels => {
      state.urgencyLevels = newLevels;
    });

    return {
      state,
      loading,
      toggles,
      errorsAdd,
      t,
      urgencyLevels,
      urgencyLevels,
      searchExamsHandler,
      selectExam,
      addExam,
      removeExam,
      applyTemplate,
      createExamOrderHandler,
      resetExamForm,
      resetForm,
      getUrgencyBadgeClass,
      handleDownloadPdf,
      handlePrintPdf,
      handleViewPdf,
      continueAfterPdf,
      openEmailModal,
      closeEmailModal,
      handleSendEmail,
      isListeningSpeech,
      isSpeechSupported,
      speechError,
      toggleSpeechRecognition,
      clearField,
    };
  },
};
</script>

<template>
  <div class="exam-order-form-modern">
    <Spinner :show="loading" />

    <!-- Header -->
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-clipboard-data"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ t('patientHistoryView.examOrder.create') }}</h3>
        <p class="form-header-subtitle">{{ t('patientHistoryView.examOrder.subtitle') }}</p>
      </div>
      <div v-if="state.templates.available.length > 0" class="ms-auto">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          @click="state.showTemplates = !state.showTemplates"
        >
          <i class="bi bi-lightning-fill me-1"></i>
          {{ t('patientHistoryView.examOrder.templates') }}
        </button>
      </div>
    </div>

    <!-- Quick Templates -->
    <div v-if="state.showTemplates" class="templates-section">
      <div class="templates-header">
        <h5>{{ t('patientHistoryView.examOrder.orderTemplates') }}</h5>
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

    <!-- Exam Order Form -->
    <div class="exam-order-content">
      <!-- Basic Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-info-circle me-2"></i>
          {{ t('patientHistoryView.examOrder.generalInformation') }}
        </h5>

        <div class="row g-3">
          <div class="col-md-6">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-clipboard-pulse me-1"></i>
                {{ t('patientHistoryView.examOrder.clinicalIndication') }} *
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('clinicalIndication')"
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
                  @click="clearField('clinicalIndication')"
                  :title="$t('patientHistoryView.clearField')"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.examOrder.clinicalIndication"
                class="form-control-modern"
                rows="3"
                placeholder="Motivo de la solicitud del examen"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-md-6">
            <div class="row g-3">
              <div class="col-12">
                <div class="form-field-modern">
                  <label class="form-label-modern">
                    <i class="bi bi-clipboard2-pulse me-1"></i>
                    {{ t('patientHistoryView.examOrder.diagnosis') }}
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
                    v-model="state.examOrder.diagnosis"
                    class="form-control-modern"
                    rows="3"
                    placeholder="Diagnóstico presuntivo o confirmado"
                    :disabled="!toggles['patient.history.edit']"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-flag me-1"></i>
                {{ t('patientHistoryView.examOrder.urgency') }}
              </label>
              <select v-model="state.examOrder.urgency" class="form-control-modern">
                <option
                  v-for="urgency in urgencyLevels"
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
                {{ t('patientHistoryView.examOrder.scheduledDate') }}
              </label>
              <input
                v-model="state.examOrder.scheduledDate"
                type="datetime-local"
                class="form-control-modern"
                :disabled="!toggles['patient.history.edit']"
              />
            </div>
          </div>

          <div class="col-md-4">
            <div class="form-field-modern">
              <label class="form-label-modern d-flex align-items-center gap-2">
                <input
                  v-model="state.examOrder.fasting"
                  type="checkbox"
                  :disabled="!toggles['patient.history.edit']"
                />
                <i class="bi bi-droplet me-1"></i>
                {{ t('patientHistoryView.examOrder.requiresFasting') }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Exam Search -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-plus-circle me-2"></i>
          {{ t('patientHistoryView.examOrder.addExams') }}
        </h5>

        <!-- Search Filters -->
        <div class="search-filters mb-3">
          <select
            v-model="state.examSearch.filters.type"
            class="form-control-modern filter-select"
            @change="searchExamsHandler"
          >
            <option value="">{{ t('patientHistoryView.examOrder.allTypes') }}</option>
            <option v-for="type in state.examTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <div class="exam-search">
          <div class="search-input-container">
            <input
              v-model="state.examSearch.searchTerm"
              type="text"
              class="form-control-modern"
              :placeholder="t('patientHistoryView.examOrder.searchExam')"
              @input="searchExamsHandler"
              :disabled="!toggles['patient.history.edit']"
            />
            <i class="bi bi-search search-icon"></i>
            <Spinner v-if="state.examSearch.loading" :show="true" size="sm" />
          </div>

          <!-- Search Results -->
          <div v-if="state.examSearch.showResults" class="search-results">
            <div
              v-for="exam in state.examSearch.results"
              :key="exam.id"
              class="search-result-item"
              @click="selectExam(exam)"
            >
              <div class="exam-info">
                <strong>{{ exam.name }}</strong>
                <span class="exam-details">
                  {{
                    exam.type === 'laboratory'
                      ? 'Laboratorio'
                      : exam.type === 'imaging'
                      ? 'Imagenología'
                      : exam.type === 'procedure'
                      ? 'Procedimiento'
                      : 'Otro'
                  }}
                  <span v-if="exam.code"> · {{ exam.code }}</span>
                </span>
              </div>
              <span v-if="exam.preparation" class="exam-preparation-indicator">
                <i class="bi bi-info-circle"></i>
              </span>
            </div>
            <div v-if="state.examSearch.results.length === 0" class="no-results">
              No se encontraron exámenes
            </div>
          </div>
        </div>

        <!-- Exam Form -->
        <div v-if="state.showExamForm" class="exam-form">
          <div class="exam-form-header">
            <div>
              <h6>{{ state.currentExam.examName }}</h6>
              <span class="exam-code-display">Código: {{ state.currentExam.examCode }}</span>
            </div>
            <button class="btn-close-form" @click="resetExamForm">
              <i class="bi bi-x"></i>
            </button>
          </div>

          <div class="form-grid">
            <div class="form-field-modern">
              <label class="form-label-modern">Tipo</label>
              <input
                v-model="state.currentExam.type"
                type="text"
                class="form-control-modern"
                readonly
              />
            </div>

            <div class="form-field-modern">
              <label class="form-label-modern">Duración Estimada</label>
              <input
                v-model="state.currentExam.estimatedDuration"
                type="text"
                class="form-control-modern"
                placeholder="ej: 30 minutos"
              />
            </div>
          </div>

          <div class="form-field-modern">
            <label class="form-label-modern">
              <i class="bi bi-file-text me-1"></i>
              {{ t('patientHistoryView.examOrder.specialInstructions') }}
              <button
                v-if="isSpeechSupported && toggles['patient.history.edit']"
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :class="{ 'btn-danger': isListeningSpeech }"
                @click="toggleSpeechRecognition('examInstructions')"
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
                @click="clearField('examInstructions')"
                :title="$t('patientHistoryView.clearField')"
              >
                <i class="bi bi-eraser"></i>
              </button>
            </label>
            <textarea
              v-model="state.currentExam.instructions"
              class="form-control-modern"
              rows="3"
              placeholder="Instrucciones específicas para este examen"
            ></textarea>
          </div>

          <div class="form-field-modern">
            <label class="form-label-modern">
              <i class="bi bi-clipboard-check me-1"></i>
              {{ t('patientHistoryView.examOrder.patientPreparation') }}
              <button
                v-if="isSpeechSupported && toggles['patient.history.edit']"
                type="button"
                class="btn btn-sm btn-outline-secondary"
                :class="{ 'btn-danger': isListeningSpeech }"
                @click="toggleSpeechRecognition('preparationInstructions')"
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
                @click="clearField('preparationInstructions')"
                :title="$t('patientHistoryView.clearField')"
              >
                <i class="bi bi-eraser"></i>
              </button>
            </label>
            <textarea
              v-model="state.currentExam.preparationInstructions"
              class="form-control-modern"
              rows="3"
              placeholder="Instrucciones de preparación para el paciente"
            ></textarea>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 mt-3"
            @click="addExam"
            :disabled="!state.currentExam.examId"
          >
            <i class="bi bi-plus-circle me-2"></i>
            {{ t('patientHistoryView.examOrder.addExam') }}
          </button>
        </div>
      </div>

      <!-- Exams List -->
      <div v-if="state.examOrder.exams.length > 0" class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-list-ul me-2"></i>
          {{ t('patientHistoryView.examOrder.requestedExams') }} ({{
            state.examOrder.exams.length
          }})
        </h5>

        <div class="exams-list">
          <div v-for="(exam, index) in state.examOrder.exams" :key="index" class="exam-item">
            <div class="exam-content">
              <div class="exam-header">
                <div>
                  <strong>{{ exam.examName }}</strong>
                  <span class="exam-code">{{ exam.examCode }}</span>
                </div>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="removeExam(index)"
                  :disabled="!toggles['patient.history.edit']"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>

              <div class="exam-details">
                <span class="detail-item">
                  <i class="bi bi-tag me-1"></i>
                  {{ exam.type }}
                </span>
                <span v-if="exam.category" class="detail-item">
                  <i class="bi bi-folder me-1"></i>
                  {{ exam.category }}
                </span>
                <span v-if="exam.estimatedDuration" class="detail-item">
                  <i class="bi bi-clock me-1"></i>
                  {{ exam.estimatedDuration }}
                </span>
                <span v-if="exam.cost" class="detail-item">
                  <i class="bi bi-currency-dollar me-1"></i>
                  ${{ exam.cost.toLocaleString() }}
                </span>
              </div>

              <div v-if="exam.instructions" class="exam-instructions">
                <strong>Instrucciones:</strong> {{ exam.instructions }}
              </div>

              <div v-if="exam.preparationInstructions" class="exam-preparation">
                <strong>Preparación:</strong> {{ exam.preparationInstructions }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Information -->
      <div class="form-section-modern">
        <h5 class="metric-card-subtitle mb-3">
          <i class="bi bi-file-text me-2"></i>
          {{ t('patientHistoryView.examOrder.additionalInformation') }}
        </h5>

        <div class="row g-3">
          <div class="col-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-card-list me-1"></i>
                Instrucciones Especiales
                <button
                  v-if="isSpeechSupported && toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  :class="{ 'btn-danger': isListeningSpeech }"
                  @click="toggleSpeechRecognition('specialInstructions')"
                  :title="isListeningSpeech ? 'Parar gravação' : 'Iniciar gravação de voz'"
                >
                  <i :class="isListeningSpeech ? 'bi bi-mic-fill' : 'bi bi-mic'"></i>
                </button>
                <button
                  v-if="toggles['patient.history.edit']"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="clearField('specialInstructions')"
                  title="Limpar campo"
                >
                  <i class="bi bi-eraser"></i>
                </button>
              </label>
              <textarea
                v-model="state.examOrder.specialInstructions"
                class="form-control-modern"
                rows="3"
                placeholder="Instrucciones adicionales para el laboratorio o centro de diagnóstico"
                :disabled="!toggles['patient.history.edit']"
              ></textarea>
            </div>
          </div>

          <div class="col-12">
            <div class="form-field-modern">
              <label class="form-label-modern">
                <i class="bi bi-journal-text me-1"></i>
                Notas Internas
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
                v-model="state.examOrder.notes"
                class="form-control-modern"
                rows="2"
                placeholder="Notas para uso interno (no aparecen en la orden)"
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
            document-type="exam_order"
            :commerce-id="state.examOrder.commerceId"
            :show-preview-button="false"
          />
        </div>
      </div>

      <!-- PDF Actions (shown after exam order creation) -->
      <div
        v-if="state.showPdfActions && state.createdExamOrder"
        class="form-section pdf-actions-section"
      >
        <div class="success-message">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong>{{ t('patientHistoryView.examOrder.createdSuccessfully') }}</strong>
        </div>
        <div class="pdf-actions">
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleViewPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-eye me-2"></i>
            {{ t('patientHistoryView.examOrder.viewPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handleDownloadPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-download me-2"></i>
            {{ t('patientHistoryView.examOrder.downloadPdf') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="handlePrintPdf"
            :disabled="pdfLoading"
          >
            <i class="bi bi-printer me-2"></i>
            {{ t('patientHistoryView.examOrder.printPdf') }}
          </button>
          <button
            v-if="toggles['client.notify.email']"
            type="button"
            class="btn-action btn-action-primary"
            @click="openEmailModal"
            :disabled="pdfLoading || emailLoading"
          >
            <i class="bi bi-envelope me-2"></i>
            {{ t('patientHistoryView.examOrder.sendEmail') }}
          </button>
          <button
            type="button"
            class="btn-action btn-action-primary"
            @click="state.showDigitalSignature = true"
            :disabled="state.createdExamOrder?.isSigned || pdfLoading"
          >
            <i class="bi bi-shield-check me-2"></i>
            {{ t('digitalSignature.icp.sign') }}
          </button>
          <button type="button" class="btn-action btn-action-secondary" @click="continueAfterPdf">
            <i class="bi bi-arrow-right me-2"></i>
            {{ t('patientHistoryView.examOrder.continue') }}
          </button>
        </div>
      </div>

      <!-- Digital Signature Section -->
      <div v-if="state.showDigitalSignature && state.createdExamOrder" class="form-section">
        <DigitalSignatureICP
          :document-type="'exam_order'"
          :document-id="state.createdExamOrder.id"
          :is-signed="state.createdExamOrder.isSigned || false"
          :signature-info="state.signatureInfo"
          @signed="handleSignatureSigned"
          @verified="handleSignatureVerified"
          @cancel="handleSignatureCancel"
        />
      </div>

      <!-- Actions -->
      <div v-else class="form-actions">
        <button
          type="button"
          class="btn-action btn-action-primary"
          @click="createExamOrderHandler"
          :disabled="
            !toggles['patient.history.edit'] || state.examOrder.exams.length === 0 || loading
          "
        >
          <i class="bi bi-check-circle me-2"></i>
          {{ t('patientHistoryView.examOrder.createOrder') }}
        </button>

        <button
          type="button"
          class="btn-action btn-action-secondary"
          @click="resetForm"
          :disabled="!toggles['patient.history.edit']"
        >
          <i class="bi bi-arrow-clockwise me-2"></i>
          {{ t('patientHistoryView.examOrder.clear') }}
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

    <!-- Email Modal -->
    <div v-if="state.showEmailModal" class="modal-overlay" @click.self="closeEmailModal">
      <div class="modal-content email-modal">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-envelope me-2"></i>
            {{ t('patientHistoryView.examOrder.sendEmailTitle') }}
          </h5>
          <button type="button" class="btn-close" @click="closeEmailModal">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-envelope me-1"></i>
              {{ t('patientHistoryView.examOrder.recipientEmail') }} *
            </label>
            <input
              type="email"
              class="form-control"
              v-model="state.emailForm.recipientEmail"
              :placeholder="t('patientHistoryView.examOrder.recipientEmailPlaceholder')"
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-tag me-1"></i>
              {{ t('patientHistoryView.examOrder.emailSubject') }}
            </label>
            <input
              type="text"
              class="form-control"
              v-model="state.emailForm.subject"
              :placeholder="t('patientHistoryView.examOrder.emailSubjectPlaceholder')"
            />
          </div>
          <div class="form-group">
            <label class="form-label">
              <i class="bi bi-chat-left-text me-1"></i>
              {{ t('patientHistoryView.examOrder.emailMessage') }}
            </label>
            <textarea
              class="form-control"
              v-model="state.emailForm.message"
              rows="4"
              :placeholder="t('patientHistoryView.examOrder.emailMessagePlaceholder')"
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
            :disabled="state.emailLoading"
          >
            <span v-if="state.emailLoading" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-send me-2"></i>
            {{ t('patientHistoryView.examOrder.sendEmail') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exam-order-form-modern {
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

.template-description {
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.6;
  text-align: center;
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

/* Legacy form classes */
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

/* Search */
.search-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-select {
  max-width: 200px;
}

.exam-search {
  position: relative;
  margin-bottom: 1rem;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding-right: 3rem;
}

.search-icon {
  position: absolute;
  right: 1rem;
  color: var(--color-text);
  opacity: 0.5;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.search-result-item:hover {
  background: rgba(0, 123, 255, 0.05);
}

.exam-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.exam-info strong {
  font-size: 0.95rem;
  color: var(--color-text);
}

.exam-details {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
}

.exam-preparation-indicator {
  color: var(--azul-turno);
  font-size: 1rem;
  opacity: 0.7;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-text);
  opacity: 0.6;
}

/* Exam Form */
.exam-form {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-top: 1rem;
}

.exam-form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.exam-form-header h6 {
  margin: 0;
  color: var(--azul-turno);
  font-weight: 600;
}

.exam-code-display {
  font-size: 0.8rem;
  color: var(--color-text);
  opacity: 0.7;
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

/* Exams List */
.exams-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.exam-item {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.exam-item:hover {
  border-color: rgba(0, 123, 255, 0.2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.btn-remove-exam {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border: none;
  border-radius: 0.375rem;
  padding: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-remove-exam:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.2);
}

.btn-remove-exam:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exam-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
}

.exam-instructions,
.exam-preparation {
  font-size: 0.85rem;
  color: var(--color-text);
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.375rem;
}

.exam-instructions strong,
.exam-preparation strong {
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

  .exam-details {
    flex-direction: column;
    gap: 0.5rem;
  }

  .search-filters {
    flex-direction: column;
  }

  .filter-select {
    max-width: none;
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
