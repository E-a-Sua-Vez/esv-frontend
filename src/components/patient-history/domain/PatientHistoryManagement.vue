<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import { globalStore } from '../../../stores';
import {
  savePatientHistory,
  updatePatientHistoryControl,
  getPatientHistoryDetails,
} from '../../../application/services/patient-history';
import { getPermissions } from '../../../application/services/permissions';
import { getAlertsByClient } from '../../../application/services/clinical-alerts';
import { getDateAndHour } from '../../../shared/utils/date';
import {
  uploadPatientPhoto,
  getPatientPhoto,
  getPatientPhotoUrl,
  getPatientPhotoThumbnailUrl,
  updatePatientPhoto,
  deletePatientPhoto,
} from '../../../application/services/patient-photo';
import PatientPersonalDataForm from './PatientPersonalDataForm.vue';
import ConsultationReasonForm from './ConsultationReasonForm.vue';
import CurrentIllnessForm from './CurrentIllnessForm.vue';
import PatientAnamneseForm from './PatientAnamneseForm.vue';
import FunctionalExamForm from './FunctionalExamForm.vue';
import PhysicalExamForm from './PhysicalExamForm.vue';
import DiagnosticForm from './DiagnosticForm.vue';
import MedicalOrderForm from './MedicalOrderForm.vue';
import PatientResumeForm from './PatientResumeForm.vue';
import ControlForm from './ControlForm.vue';
import DocumentsForm from './DocumentsForm.vue';
import PatientEvolutionView from './PatientEvolutionView.vue';
import AdvancedSearchModal from './AdvancedSearchModal.vue';
import ClinicalAlertsBanner from '../../clinical-alerts/domain/ClinicalAlertsBanner.vue';
import ConsultationTimeline from './ConsultationTimeline.vue';
import ConsultationDetail from './ConsultationDetail.vue';
import PatientJourneyView from './PatientJourneyView.vue';
import PatientPhotoCapture from '../common/PatientPhotoCapture.vue';
import PreprontuarioHistoryView from './PreprontuarioHistoryView.vue';

export default {
  name: 'PatientHistoryManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    Alert,
    Warning,
    PatientPersonalDataForm,
    ConsultationReasonForm,
    CurrentIllnessForm,
    PatientAnamneseForm,
    FunctionalExamForm,
    PhysicalExamForm,
    DiagnosticForm,
    MedicalOrderForm,
    PatientResumeForm,
    ControlForm,
    DocumentsForm,
    PatientEvolutionView,
    AdvancedSearchModal,
    ClinicalAlertsBanner,
    ConsultationTimeline,
    ConsultationDetail,
    PatientJourneyView,
    PatientPhotoCapture,
    PreprontuarioHistoryView,
  },
  props: {
    showPatientHistoryManagement: { type: Boolean, default: false },
    client: { type: Object, default: undefined },
    attention: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    patientHistoryIn: { type: Object, default: {} },
    patientHistoryItems: { type: Array, default: [] },
    patientForms: { type: Array, default: [] },
  },
  emits: ['getPatientHistory', 'closeModal'],
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      toggles: {},
      patientHistory: {},
      counter: 0,
      totalPages: 0,
      errorsAdd: [],
      habits: [],
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      startDate: undefined,
      endDate: undefined,
      store,
      userType: '',
      autoSaving: false,
      pendingControlNumber: 0,
      dataChanged: false,
      saveIntervalId: undefined,
      saveTimeoutId: undefined,
      saving: false,
      modalHideHandler: null,
      lastSaved: null,
      menuCollapsed: false,
      showPersonalData: true,
      showConsultationReason: false,
      showCurrentIllness: false,
      showPatientAnamnese: false,
      showPreprontuarioHistory: false,
      showFunctionalExam: false,
      showPhysicalExam: false,
      showDiagnostic: false,
      showMedicalOrder: false,
      showControl: false,
      showResume: false,
      showDocuments: false,
      showEvolution: false,
      showAdvancedSearch: false,
      newPersonalData: undefined,
      newConsultationReason: undefined,
      newCurrentIllness: undefined,
      newPatientAnamnese: undefined,
      newFunctionalExam: undefined,
      newPhysicalExam: undefined,
      newDiagnostic: undefined,
      newMedicalOrder: undefined,
      newDocument: undefined,
      newControl: undefined,
      clinicalAlerts: [],
      showConsultationTimeline: false,
      showConsultationDetail: false,
      showPatientJourney: false,
      selectedConsultation: null,
      showPhotoCapture: false,
      showPhotoMenu: false,
      showPhotoViewer: false,
      patientPhoto: null,
      patientPhotoUrl: null,
      patientPhotoFullUrl: null,
      photoLoading: false,
      photoLoadAttempted: false,
      clinicalAlertsLoaded: false,
      patientPhotoLoaded: false,
    };
  },
  async beforeMount() {
    this.toggles = await getPermissions('patient', 'history');
    this.userType = await this.store.getCurrentUserType;

    console.log('🔍 Preprontuario: Patient forms loaded:', this.patientForms);
    console.log('🔍 Preprontuario: Forms count:', this.patientForms ? this.patientForms.length : 0);

    if (this.patientForms && this.patientForms.length > 0) {
      console.log(
        '🔍 Preprontuario: All forms types:',
        this.patientForms.map(f => f.type),
      );

      const firstAttentionForms = this.patientForms.filter(form => form.type === 'FIRST_ATTENTION');
      console.log('🔍 Preprontuario: FIRST_ATTENTION forms:', firstAttentionForms);

      firstAttentionForms.forEach((form, index) => {
        console.log(`🔍 Preprontuario: Form ${index + 1}:`, {
          id: form.id,
          type: form.type,
          hasAnswers: form.answers && form.answers.length > 0,
          answersCount: form.answers ? form.answers.length : 0,
          createdAt: form.createdAt,
        });
      });
    } else {
      console.log('❌ Preprontuario: No forms found for this patient');
      console.log('🔍 Preprontuario: Client ID:', this.client?.id);
      console.log('🔍 Preprontuario: Commerce ID:', this.commerce?.id);
    }

    document.addEventListener('click', this.handleDocumentClick);
  },
  mounted() {
    this.setupModalCloseListener();
    this.setupModalEventListeners();
  },
  async beforeUnmount() {
    if (this.saveIntervalId !== undefined) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = undefined;
    }
    if (this.saveTimeoutId !== undefined) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = undefined;
    }

    this.cleanupPhotoUrls();
    document.removeEventListener('click', this.handleDocumentClick);
  },
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    getDate(date) {
      const timeZone =
        this.commerce && this.commerce.localeInfo
          ? this.commerce.localeInfo.timezone
          : 'America/Sao_Paulo';
      return getDateAndHour(date, timeZone);
    },
    async clear() {
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
      this.page = 1;
      this.startDate = undefined;
      this.endDate = undefined;
      await this.refresh();
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    resetButtons() {
      this.showPersonalData = false;
      this.showConsultationReason = false;
      this.showCurrentIllness = false;
      this.showPatientAnamnese = false;
      this.showPreprontuarioHistory = false;
      this.showFunctionalExam = false;
      this.showPhysicalExam = false;
      this.showDiagnostic = false;
      this.showMedicalOrder = false;
      this.showControl = false;
      this.showResume = false;
      this.showDocuments = false;
      this.showEvolution = false;
      this.showAdvancedSearch = false;
      this.newPersonalData = undefined;
      this.newConsultationReason = undefined;
      this.newCurrentIllness = undefined;
      this.newPatientAnamnese = undefined;
      this.newFunctionalExam = undefined;
      this.newPhysicalExam = undefined;
      this.newDiagnostic = undefined;
      this.newMedicalOrder = undefined;
      this.newDocuments = undefined;
      this.newControl = undefined;
    },
    onPersonalData() {
      this.resetButtons();
      this.showPersonalData = true;
    },
    onConsultationReason() {
      this.resetButtons();
      this.showConsultationReason = true;
    },
    onCurrentIllness() {
      this.resetButtons();
      this.showCurrentIllness = true;
    },
    onPatientAnamnese() {
      this.resetButtons();
      this.showPatientAnamnese = true;
    },
    onPreprontuarioHistory() {
      this.resetButtons();
      this.showPreprontuarioHistory = true;
    },
    onFunctionalExam() {
      this.resetButtons();
      this.showFunctionalExam = true;
    },
    onPhysicalExam() {
      this.resetButtons();
      this.showPhysicalExam = true;
    },
    onDiagnostic() {
      this.resetButtons();
      this.showDiagnostic = true;
    },
    onMedicalOrder() {
      this.resetButtons();
      this.showMedicalOrder = true;
    },
    onControl() {
      this.resetButtons();
      this.showControl = true;
    },
    onDocuments() {
      this.resetButtons();
      this.showDocuments = true;
    },
    onEvolution() {
      this.resetButtons();
      this.showEvolution = true;
    },
    onConsultationTimeline() {
      this.resetButtons();
      this.showConsultationTimeline = true;
      this.showConsultationDetail = false;
      this.showPatientJourney = false;
    },
    onPatientJourney() {
      this.resetButtons();
      this.showPatientJourney = true;
      this.showConsultationTimeline = false;
      this.showConsultationDetail = false;
    },
    onConsultationSelected(consultation) {
      this.selectedConsultation = consultation;
      this.showConsultationTimeline = false;
      this.showConsultationDetail = true;
    },
    closeConsultationDetail() {
      this.showConsultationDetail = false;
      this.selectedConsultation = null;
      this.showConsultationTimeline = true;
    },
    closePatientJourney() {
      this.showPatientJourney = false;
      this.showConsultationTimeline = true;
    },
    async onSave() {
      try {
        this.saving = true;
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            commerceId: this.commerce.id,
            clientId: this.client.id,
            type: this.patientHistory?.type || 'CONSULTATION',
            personalData: this.toPlainObject(this.newPersonalData),
            consultationReason:
              this.newConsultationReason && Object.keys(this.newConsultationReason).length > 0
                ? this.toPlainObject(this.newConsultationReason)
                : undefined,
            currentIllness:
              this.newCurrentIllness &&
              this.newCurrentIllness.illness &&
              this.newCurrentIllness.illness.trim().length > 0
                ? this.toPlainObject(this.newCurrentIllness)
                : undefined,
            patientAnamnese:
              this.newPatientAnamnese && Object.keys(this.newPatientAnamnese).length > 0
                ? this.toPlainObject(this.newPatientAnamnese)
                : undefined,
            functionalExam:
              this.newFunctionalExam &&
              this.newFunctionalExam.exam &&
              this.newFunctionalExam.exam.trim().length > 0
                ? this.toPlainObject(this.newFunctionalExam)
                : undefined,
            physicalExam:
              this.newPhysicalExam &&
              this.newPhysicalExam.exam &&
              this.newPhysicalExam.exam.trim().length > 0
                ? this.toPlainObject(this.newPhysicalExam)
                : undefined,
            diagnostic:
              this.newDiagnostic && Object.keys(this.newDiagnostic).length > 0
                ? this.toPlainObject(this.newDiagnostic)
                : undefined,
            medicalOrder:
              this.patientHistory?.medicalOrder &&
              Array.isArray(this.patientHistory.medicalOrder) &&
              this.patientHistory.medicalOrder.length > 0
                ? this.toPlainObject(this.patientHistory.medicalOrder)
                : this.newMedicalOrder && Object.keys(this.newMedicalOrder).length > 0
                ? this.toPlainObject([this.newMedicalOrder])
                : undefined,
            patientDocument:
              this.newDocument && Object.keys(this.newDocument).length > 0
                ? this.toPlainObject(this.newDocument)
                : undefined,
            control:
              this.newControl &&
              (Array.isArray(this.newControl)
                ? this.newControl.length > 0
                : Object.keys(this.newControl).length > 0)
                ? this.toPlainObject(this.newControl)
                : undefined,
            aditionalInfo: this.patientHistory?.aditionalInfo
              ? this.toPlainObject(this.patientHistory.aditionalInfo)
              : undefined,
            active: this.patientHistory?.active !== undefined ? this.patientHistory.active : true,
            available:
              this.patientHistory?.available !== undefined ? this.patientHistory.available : true,
            lastAttentionId: this.attention,
          };

          this.patientHistory = await savePatientHistory(body);

          await this.loadPatientHistoryData();

          this.dataChanged = false;
          this.lastSaved = new Date();
          this.refresh();
          if (this.showConsultationTimeline && this.$refs.consultationTimeline) {
            this.$refs.consultationTimeline.refresh();
          }
          this.$toast?.success('Paciente guardado exitosamente');
        }
        this.saving = false;
      } catch (error) {
        this.saving = false;
        this.alertError = error.message || 'Error al guardar el historial del paciente';
      }
    },
    onControlUpdate(updatedControl) {
      if (this.patientHistory && this.patientHistory.control) {
        const index = this.patientHistory.control.findIndex(c => c.id === updatedControl.id);
        if (index !== -1) {
          this.patientHistory.control[index] = updatedControl;
        }
      }
      this.dataChanged = true;
    },
    onPatientDocumentUpdate(updatedDocument) {
      if (this.patientHistory && this.patientHistory.patientDocument) {
        const index = this.patientHistory.patientDocument.findIndex(d => d.id === updatedDocument.id);
        if (index !== -1) {
          this.patientHistory.patientDocument[index] = updatedDocument;
        }
      }
      this.dataChanged = true;
    },
    async onUpdatePatientHistory() {
      try {
        this.loading = true;
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            patientDocument,
            lastAttentionId: this.attention,
          };
          const id = this.patientHistory.id;
          this.patientHistory = await updatePatientHistoryControl(id, body);
          this.refresh();
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    onResume() {
      this.resetButtons();
      this.showResume = true;
      if (!this.patientHistory || !this.patientHistory.id) {
        console.log('📋 No patient history data, loading...');
        this.loadPatientHistoryData();
      }
    },
    handleSearchResultSelected(result) {
      if (result.type === 'diagnostic') {
        this.onDiagnostic();
      } else if (result.type === 'anamnesis') {
        this.onPatientAnamnese();
      } else if (result.type === 'consultation_reason') {
        this.onConsultationReason();
      } else if (result.type === 'current_illness') {
        this.onCurrentIllness();
      } else if (result.type === 'physical_exam') {
        this.onPhysicalExam();
      } else if (result.type === 'functional_exam') {
        this.onFunctionalExam();
      } else if (result.type === 'medical_order') {
        this.onMedicalOrder();
      } else if (result.type === 'control') {
        this.onControl();
      } else if (result.type === 'exam_order') {
        this.onMedicalOrder();
      }
    },
    setupModalCloseListener() {
      // Modal close listener - no auto-save on close
    },
    setupQuickSearchShortcut() {
      // Quick search functionality removed
    },
    async setupModalEventListeners() {
      const clientId = this.client?.id;
      if (!clientId) return;

      this.$nextTick(() => {
        const patientHistoryModal = document.getElementById(`patientHistoryModal-${clientId}`);
        if (patientHistoryModal) {
          patientHistoryModal.addEventListener('shown.bs.modal', async () => {
            await this.loadPatientHistoryData();

            if (!this.clinicalAlertsLoaded) {
              this.loadClinicalAlerts();
            }
            if (!this.patientPhotoLoaded && !this.photoLoadAttempted) {
              this.photoLoadAttempted = true;
              this.loadPatientPhoto();
            }
          });
        }
      });
    },
    refresh() {
      if (
        this.patientHistory &&
        this.patientHistory.control &&
        this.patientHistory.control.length > 0
      ) {
        const pendingControl = this.patientHistory.control.filter(
          ctrol => ctrol && ctrol.status === 'PENDING'
        );
        if (pendingControl && pendingControl.length > 0) {
          this.pendingControlNumber = pendingControl.length;
        }
      }
    },
    async handleCloseModal() {
      this.$emit('closeModal');
    },
    calculateDetailedAge(birthday) {
      if (!birthday) return '';

      const birthDate = new Date(birthday);
      const today = new Date();

      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();

      if (days < 0) {
        months--;
        const daysInPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        days += daysInPreviousMonth;
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      const parts = [];
      if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`);
      if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`);
      if (days > 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);

      return parts.length > 0 ? parts.join(', ') : '0 años';
    },
    getLastConsultationDate() {
      return this.patientHistory?.lastAttentionId ? 'Hoy' : 'No disponible';
    },
    checkPreprontuarioSent() {
      return this.patientForms && this.patientForms.length > 0;
    },
    checkPreprontuarioCompleted() {
      if (!this.patientForms || this.patientForms.length === 0) return false;
      const firstAttentionForms = this.patientForms.filter(form => form.type === 'FIRST_ATTENTION');
      return firstAttentionForms.some(form => form.status === 'COMPLETED' || (form.answers && form.answers.length > 0));
    },
    async loadPatientHistoryData() {
      if (!this.client?.id || !this.commerce?.id) {
        return;
      }

      try {
        this.loading = true;
        this.alertError = '';

        const filterDto = {
          clientId: this.client.id,
          commerceId: this.commerce.id,
        };

        const historyData = await getPatientHistoryDetails(filterDto);

        if (historyData && historyData.length > 0) {
          const latestHistory = historyData[0];

          this.patientHistory = {
            id: latestHistory.id,
            commerceId: latestHistory.commerceId || this.commerce.id,
            clientId: latestHistory.clientId || this.client.id,
            type: latestHistory.type || 'STANDARD',
            lastAttentionId: latestHistory.lastAttentionId || this.attention,
            personalData: latestHistory.personalData || undefined,
            consultationReason: latestHistory.consultationReason || undefined,
            currentIllness: latestHistory.currentIllness || undefined,
            patientAnamnese: latestHistory.patientAnamnese || undefined,
            functionalExam: latestHistory.functionalExam || undefined,
            physicalExam: latestHistory.physicalExam || undefined,
            diagnostic: latestHistory.diagnostic || undefined,
            medicalOrder: latestHistory.medicalOrder || undefined,
            control: latestHistory.control || undefined,
            patientDocument: latestHistory.patientDocument || undefined,
            aditionalInfo: latestHistory.aditionalInfo || undefined,
            active: latestHistory.active !== undefined ? latestHistory.active : true,
            available: latestHistory.available !== undefined ? latestHistory.available : true,
          };
          this.refresh();

          if (this.patientHistory.personalData) {
            this.newPersonalData = { ...this.patientHistory.personalData };
          }
          if (
            this.patientHistory.consultationReason &&
            Array.isArray(this.patientHistory.consultationReason)
          ) {
            const sorted = [...this.patientHistory.consultationReason].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newConsultationReason = sorted[0] || undefined;
          } else if (this.patientHistory.consultationReason) {
            this.newConsultationReason = this.patientHistory.consultationReason;
          }
          if (
            this.patientHistory.currentIllness &&
            Array.isArray(this.patientHistory.currentIllness)
          ) {
            const sorted = [...this.patientHistory.currentIllness].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newCurrentIllness = sorted[0] || { illness: '' };
          } else if (this.patientHistory.currentIllness) {
            this.newCurrentIllness = this.patientHistory.currentIllness;
          }
          if (
            this.patientHistory.patientAnamnese &&
            Array.isArray(this.patientHistory.patientAnamnese)
          ) {
            const sorted = [...this.patientHistory.patientAnamnese].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newPatientAnamnese = sorted[0] || {};
          } else if (this.patientHistory.patientAnamnese) {
            this.newPatientAnamnese = this.patientHistory.patientAnamnese;
          }
          if (
            this.patientHistory.functionalExam &&
            Array.isArray(this.patientHistory.functionalExam)
          ) {
            const sorted = [...this.patientHistory.functionalExam].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newFunctionalExam = sorted[0] || { exam: '' };
          } else if (this.patientHistory.functionalExam) {
            this.newFunctionalExam = this.patientHistory.functionalExam;
          }
          if (
            this.patientHistory.physicalExam &&
            Array.isArray(this.patientHistory.physicalExam)
          ) {
            const sorted = [...this.patientHistory.physicalExam].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newPhysicalExam = sorted[0] || { exam: '' };
          } else if (this.patientHistory.physicalExam) {
            this.newPhysicalExam = this.patientHistory.physicalExam;
          }
          if (
            this.patientHistory.diagnostic &&
            Array.isArray(this.patientHistory.diagnostic)
          ) {
            const sorted = [...this.patientHistory.diagnostic].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newDiagnostic = sorted[0] || {};
          } else if (this.patientHistory.diagnostic) {
            this.newDiagnostic = this.patientHistory.diagnostic;
          }
          if (
            this.patientHistory.medicalOrder &&
            Array.isArray(this.patientHistory.medicalOrder)
          ) {
            const sorted = [...this.patientHistory.medicalOrder].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newMedicalOrder = sorted[0] || {};
          } else if (this.patientHistory.medicalOrder) {
            this.newMedicalOrder = this.patientHistory.medicalOrder;
          }
          if (
            this.patientHistory.control &&
            Array.isArray(this.patientHistory.control)
          ) {
            this.newControl = this.patientHistory.control;
          } else if (this.patientHistory.control) {
            this.newControl = this.patientHistory.control;
          }
          if (
            this.patientHistory.patientDocument &&
            Array.isArray(this.patientHistory.patientDocument)
          ) {
            const sorted = [...this.patientHistory.patientDocument].sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            this.newDocument = sorted[0] || undefined;
          } else if (this.patientHistory.patientDocument) {
            this.newDocument = this.patientHistory.patientDocument;
          }
        } else {
          this.patientHistory = {
            commerceId: this.commerce.id,
            clientId: this.client.id,
            type: 'STANDARD',
            lastAttentionId: this.attention,
            active: true,
            available: true,
          };
        }
      } catch (error) {
        this.alertError = error.message || 'Error al cargar el historial del paciente';
      } finally {
        this.loading = false;
      }
    },
    validate(personalData) {
      this.errorsAdd = [];
      if (!personalData) {
        this.errorsAdd.push('patientHistoryView.validate.personalData');
        return false;
      }
      if (!personalData.name || personalData.name.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.name');
      }
      if (!personalData.lastName || personalData.lastName.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.lastName');
      }
      if (!personalData.idNumber || personalData.idNumber.length < 8) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.idNumber');
      }
      if (!personalData.birthday || personalData.birthday.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.birthday');
      }
      if (!personalData.age || personalData.age.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.age');
      }
      if (!personalData.occupation || personalData.occupation.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.occupation');
      }
      if (!personalData.civilStatus || personalData.civilStatus.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.civilStatus');
      }
      if (!personalData.sex || personalData.sex.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.sex');
      }
      if (!personalData.addressCode || personalData.addressCode.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.addressCode');
      }
      if (!personalData.addressText || personalData.addressText.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.addressText');
      }
      if (!personalData.addressComplement || personalData.addressComplement.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.addressComplement');
      }
      if (!personalData.phone || personalData.phone.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.phone');
      }
      if (!personalData.email || personalData.email.length === 0) {
        this.errorsAdd.push('patientHistoryView.validate.personalData.email');
      }

      return this.errorsAdd.length === 0;
    },
    toPlainObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },
    receivePersonalData(data) {
      this.newPersonalData = data;
      this.dataChanged = true;
    },
    receiveConsultationReasonData(data) {
      this.newConsultationReason = data;
      this.dataChanged = true;
    },
    receiveCurrentIllnessData(data) {
      this.newCurrentIllness = data;
      this.dataChanged = true;
    },
    receivePatientAnamneseData(data) {
      this.newPatientAnamnese = data;
      this.dataChanged = true;
    },
    receiveFunctionalExamData(data) {
      this.newFunctionalExam = data;
      this.dataChanged = true;
    },
    receivePhysicalExamData(data) {
      this.newPhysicalExam = data;
      this.dataChanged = true;
    },
    receiveDiagnosticData(data) {
      this.newDiagnostic = data;
      this.dataChanged = true;
    },
    receiveMedicalOrderData(data) {
      this.newMedicalOrder = data;
      this.dataChanged = true;
    },
    receiveControlData(data) {
      this.newControl = data;
      this.dataChanged = true;
    },
    receiveDocumentsData(data) {
      this.newDocument = data;
      this.dataChanged = true;
    },
    formatDate(date) {
      if (!date) return 'N/A';
      const d = new Date(date);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },
    async loadPatientPhoto() {
      if (this.patientPhotoLoaded && this.patientPhoto) {
        return;
      }
      if (!this.client?.id || !this.commerce?.id) {
        return;
      }

      try {
        this.photoLoading = true;

        const photo = await getPatientPhoto(this.commerce.id, this.client.id);

        if (photo && photo.id) {
          this.patientPhoto = photo;

          const [thumbnailUrl, fullUrl] = await Promise.all([
            getPatientPhotoThumbnailUrl(this.commerce.id, this.client.id, photo.id),
            getPatientPhotoUrl(this.commerce.id, this.client.id, photo.id),
          ]);

          if (thumbnailUrl && fullUrl) {
            this.patientPhotoUrl = thumbnailUrl;
            this.patientPhotoFullUrl = fullUrl;
            this.patientPhotoLoaded = true;
          }
        }
      } catch (error) {
        console.error('Error loading patient photo:', error);
      } finally {
        this.photoLoading = false;
      }
    },
    async loadClinicalAlerts() {
      if (!this.client?.id || !this.commerce?.id) {
        return;
      }

      try {
        const alerts = await getAlertsByClient(this.client.id, this.commerce.id);
        this.clinicalAlerts = alerts || [];
        this.clinicalAlertsLoaded = true;
      } catch (error) {
        console.error('Error loading clinical alerts:', error);
      }
    },
    handleAcknowledgeAlert(alertId) {
      this.clinicalAlerts = this.clinicalAlerts.filter(alert => alert.id !== alertId);
    },
    openPhotoCapture() {
      this.showPhotoCapture = true;
      this.showPhotoMenu = false;
    },
    closePhotoCapture() {
      this.showPhotoCapture = false;
    },
    async onPhotoCaptured(photoData) {
      // Photo captured but not uploaded yet
      this.closePhotoCapture();
    },
    async onPhotoUploaded(uploadedPhoto) {
      try {
        this.photoLoading = true;
        this.patientPhoto = uploadedPhoto;

        const [thumbnailUrl, fullUrl] = await Promise.all([
          getPatientPhotoThumbnailUrl(this.commerce.id, this.client.id, uploadedPhoto.id),
          getPatientPhotoUrl(this.commerce.id, this.client.id, uploadedPhoto.id),
        ]);

        if (thumbnailUrl && fullUrl) {
          this.patientPhotoUrl = thumbnailUrl;
          this.patientPhotoFullUrl = fullUrl;
          this.patientPhotoLoaded = true;
          this.$toast?.success('Foto del paciente actualizada exitosamente');
        }
      } catch (error) {
        this.$toast?.error('Error al procesar la foto: ' + error.message);
      } finally {
        this.photoLoading = false;
      }
    },
    viewPhoto() {
      this.showPhotoViewer = true;
      this.showPhotoMenu = false;
    },
    closePhotoViewer() {
      this.showPhotoViewer = false;
    },
    togglePhotoMenu() {
      this.showPhotoMenu = !this.showPhotoMenu;
    },
    closePhotoMenu() {
      this.showPhotoMenu = false;
    },
    async deletePatientPhoto() {
      try {
        this.photoLoading = true;
        this.showPhotoMenu = false;

        await deletePatientPhoto(this.commerce.id, this.client.id, this.patientPhoto.id);

        this.cleanupPhotoUrls();

        this.patientPhoto = null;
        this.patientPhotoUrl = null;
        this.patientPhotoFullUrl = null;

        this.$toast?.success('Foto del paciente eliminada exitosamente');
      } catch (error) {
        this.$toast?.error('Error al eliminar la foto del paciente: ' + error.message);
      } finally {
        this.photoLoading = false;
      }
    },
    cleanupPhotoUrls() {
      if (this.patientPhotoUrl && this.patientPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.patientPhotoUrl);
      }
      if (this.patientPhotoFullUrl && this.patientPhotoFullUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.patientPhotoFullUrl);
      }
    },
    handleDocumentClick(event) {
      if (this.showPhotoMenu) {
        const photoContainer = event.target.closest('.patient-avatar-container');
        if (!photoContainer) {
          this.closePhotoMenu();
        }
      }
    },
    handlePhotoError(event) {
      this.$toast?.error('Error al cargar la imagen del paciente');
      this.closePhotoViewer();
    },
    handlePhotoImageError(event) {
      this.patientPhotoUrl = null;
      this.patientPhoto = null;
    },
    handlePhotoImageLoad(event) {
      // Photo loaded successfully
    },
    async onItensMedicalHistory() {
      if (this.userType && this.userType === 'business') {
        await this.handleCloseModal();
        this.$router.push({ path: '/interno/negocio/patient-history-item-admin' });
      }
    },
    async onMobileMenu() {
      const modalCloseButton = document.getElementById('menu-mobile-button');
      modalCloseButton.click();
    },
    toggleMenu() {
      this.menuCollapsed = !this.menuCollapsed;
    },
  },
  computed: {
    attentionObject() {
      return {
        patientHistory: this.patientHistory,
        patientId: this.client?.id,
        activeSection: this.showPersonalData ? 'personalData' : 'other',
      };
    },
    patientSummary() {
      const personalData = this.patientHistory?.personalData || this.newPersonalData;
      if (!personalData) return null;

      return {
        name: personalData.name || '',
        lastName: personalData.lastName || '',
        birthday: personalData.birthday || '',
        age: this.calculateDetailedAge(personalData.birthday),
        occupation: personalData.occupation || '',
        lastConsultationDate: this.getLastConsultationDate(),
        preprontuarioSent: this.checkPreprontuarioSent(),
        preprontuarioCompleted: this.checkPreprontuarioCompleted(),
      };
    },
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
    patientForms: {
      immediate: true,
      deep: true,
      handler(newForms) {
        console.log('🔍 Preprontuario: patientForms changed:', newForms);
        if (newForms && newForms.length > 0) {
          const firstAttentionForms = newForms.filter(form => form.type === 'FIRST_ATTENTION');
          console.log('🔍 Preprontuario: FIRST_ATTENTION forms found:', firstAttentionForms.length);

          firstAttentionForms.forEach((form, index) => {
            console.log(`🔍 Preprontuario: Form ${index + 1} details:`, {
              id: form.id,
              type: form.type,
              status: form.status,
              hasAnswers: form.answers && form.answers.length > 0,
              answersCount: form.answers ? form.answers.length : 0,
            });
          });
        }
      },
    },
  },
};
</script>

// ...existing code (template section remains the same)...

<template>
  <div>
    <div
      id="patientHistory-management"
      class="row modal-body patient-history-modern"
      v-if="showPatientHistoryManagement === true && toggles['patient.history.view']"
    >
      <div class="col patient-history-wrapper">
        <div id="patient-history-management-component">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
          <div class="row g-3 patient-history-layout">
            <!-- MODERN SIDEBAR MENU -->
            <div
              class="col-12 col-lg-3 d-none d-md-block sidebar-column"
              :class="{ 'menu-collapsed': menuCollapsed }"
            >
              <div
                class="patient-history-sidebar modern-card-sidebar"
                :class="{ 'sidebar-collapsed': menuCollapsed }"
              >
                <!-- Toggle Button -->
                <button
                  class="sidebar-toggle-btn"
                  @click="toggleMenu"
                  :title="
                    menuCollapsed
                      ? $t('patientHistoryView.showMenu')
                      : $t('patientHistoryView.hideMenu')
                  "
                >
                  <i :class="menuCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
                </button>

                <div class="sidebar-content" :class="{ 'sidebar-content-compact': menuCollapsed }">
                  <!-- Patient Info Section -->
                  <div
                    class="sidebar-section-header"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-person-circle" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed">{{
                      $t('patientHistoryView.patientInfo')
                    }}</span>
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showPersonalData,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onPersonalData"
                      :title="menuCollapsed ? $t('patientHistoryView.showPersonalData') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showPersonalData') : ''"
                    >
                      <i class="bi bi-person-fill sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showPersonalData')
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showPatientAnamnese,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onPatientAnamnese"
                      :title="menuCollapsed ? $t('patientHistoryView.showPatientAnamnese') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.showPatientAnamnese') : ''
                      "
                    >
                      <i class="bi bi-clipboard-heart sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showPatientAnamnese')
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showPreprontuarioHistory,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onPreprontuarioHistory"
                      :title="
                        menuCollapsed
                          ? $t('dashboard.preprontuarioHistory.title') || 'Pré-Prontuários'
                          : ''
                      "
                      :data-tooltip="
                        menuCollapsed
                          ? $t('dashboard.preprontuarioHistory.title') || 'Pré-Prontuários'
                          : ''
                      "
                    >
                      <i class="bi bi-file-earmark-medical sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('dashboard.preprontuarioHistory.title') || 'Pré-Prontuários'
                      }}</span>
                    </button>
                  </div>

                  <!-- Consultation Section -->
                  <div
                    class="sidebar-section-header mt-3"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-calendar-check" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed">{{
                      $t('patientHistoryView.consultation')
                    }}</span>
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showConsultationReason,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onConsultationReason"
                      :title="menuCollapsed ? $t('patientHistoryView.showConsultationReason') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.showConsultationReason') : ''
                      "
                    >
                      <i class="bi bi-chat-dots sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showConsultationReason')
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showCurrentIllness,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onCurrentIllness"
                      :title="menuCollapsed ? $t('patientHistoryView.showCurrentIllness') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.showCurrentIllness') : ''
                      "
                    >
                      <i class="bi bi-activity sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showCurrentIllness')
                      }}</span>
                    </button>
                  </div>

                  <!-- Examination Section -->
                  <div
                    class="sidebar-section-header mt-3"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-clipboard-pulse" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed">{{
                      $t('patientHistoryView.examination')
                    }}</span>
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showFunctionalExam,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onFunctionalExam"
                      :title="menuCollapsed ? $t('patientHistoryView.showFunctionalExam') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.showFunctionalExam') : ''
                      "
                    >
                      <i class="bi bi-heart-pulse sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showFunctionalExam')
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showPhysicalExam,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onPhysicalExam"
                      :title="menuCollapsed ? $t('patientHistoryView.showPhysicalExam') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showPhysicalExam') : ''"
                    >
                      <i class="bi bi-thermometer sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showPhysicalExam')
                      }}</span>
                    </button>
                  </div>

                  <!-- Clinical Section -->
                  <div
                    class="sidebar-section-header mt-3"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-file-medical" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed">{{
                      $t('patientHistoryView.clinical')
                    }}</span>
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showDiagnostic,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onDiagnostic"
                      :title="menuCollapsed ? $t('patientHistoryView.showDiagnostic') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showDiagnostic') : ''"
                    >
                      <i class="bi bi-file-earmark-medical sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showDiagnostic')
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showMedicalOrder,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onMedicalOrder"
                      :title="menuCollapsed ? $t('patientHistoryView.showMedicalOrder') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showMedicalOrder') : ''"
                    >
                      <i class="bi bi-prescription sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showMedicalOrder')
                      }}</span>
                    </button>
                  </div>

                  <!-- Management Section -->
                  <div
                    class="sidebar-section-header mt-3"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-folder-check" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed">{{
                      $t('patientHistoryView.management')
                    }}</span>
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item sidebar-menu-item-badge"
                      :class="{
                        'sidebar-menu-item-active': showControl,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onControl"
                      :title="menuCollapsed ? $t('patientHistoryView.showControl') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showControl') : ''"
                    >
                      <i class="bi bi-calendar-event sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showControl')
                      }}</span>
                      <span class="sidebar-badge" v-if="pendingControlNumber > 0">
                        {{ pendingControlNumber }}
                      </span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showDocuments,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onDocuments"
                      :title="menuCollapsed ? $t('patientHistoryView.showDocuments') : ''"
                      :data-tooltip="menuCollapsed ? $t('patientHistoryView.showDocuments') : ''"
                    >
                      <i class="bi bi-folder sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showDocuments')
                      }}</span>
                    </button>
                  </div>

                  <!-- Visualization Section -->
                  <div
                    class="sidebar-section-header mt-3"
                    :class="{ 'sidebar-section-header-compact': menuCollapsed }"
                  >
                    <i class="bi bi-graph-up-arrow" :class="menuCollapsed ? '' : 'me-2'"></i>
                    <span class="fw-bold sidebar-section-title" v-if="!menuCollapsed"
                      >Visualización</span
                    >
                  </div>
                  <div class="sidebar-menu-group">
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showEvolution,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onEvolution"
                      :title="menuCollapsed ? 'Evolución' : ''"
                      :data-tooltip="menuCollapsed ? 'Evolución' : ''"
                    >
                      <i class="bi bi-graph-up-arrow sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">Evolución</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active':
                          showConsultationTimeline || showConsultationDetail,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onConsultationTimeline"
                      :title="menuCollapsed ? $t('patientHistoryView.consultationTimeline') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.consultationTimeline') : ''
                      "
                    >
                      <i class="bi bi-clock-history sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.consultationTimeline') || 'Historial de Consultas'
                      }}</span>
                    </button>
                    <button
                      class="sidebar-menu-item"
                      :class="{
                        'sidebar-menu-item-active': showPatientJourney,
                        'sidebar-menu-item-compact': menuCollapsed,
                      }"
                      @click="onPatientJourney"
                      :title="
                        menuCollapsed
                          ? $t('patientHistory.patientJourney') || 'Patient Journey'
                          : ''
                      "
                      :data-tooltip="
                        menuCollapsed
                          ? $t('patientHistory.patientJourney') || 'Patient Journey'
                          : ''
                      "
                    >
                      <i class="bi bi-diagram-3 sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistory.patientJourney') || 'Patient Journey'
                      }}</span>
                    </button>
                    <button
                      v-if="userType === 'business'"
                      class="sidebar-menu-item sidebar-menu-item-settings"
                      :class="{ 'sidebar-menu-item-compact': menuCollapsed }"
                      @click="onItensMedicalHistory"
                      :title="menuCollapsed ? $t('patientHistoryView.showItensMedicalHistory') : ''"
                      :data-tooltip="
                        menuCollapsed ? $t('patientHistoryView.showItensMedicalHistory') : ''
                      "
                    >
                      <i class="bi bi-gear-fill sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showItensMedicalHistory')
                      }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Mobile Menu -->
            <div class="col-12 d-block d-md-none">
              <div class="mobile-menu-header">
                <a
                  id="menu-mobile-button"
                  class="mobile-menu-toggle"
                  data-bs-toggle="collapse"
                  href="#menu-options-mobile"
                >
                  <i class="bi bi-list me-2"></i>
                  {{ $t('patientHistoryView.menu') }}
                  <i class="bi bi-chevron-down ms-2"></i>
                </a>
              </div>
              <div id="menu-options-mobile" class="collapse">
                <div class="mobile-menu-content">
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showPersonalData }"
                    @click="onPersonalData"
                  >
                    <i class="bi bi-person-fill me-2"></i>
                    {{ $t('patientHistoryView.showPersonalData') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showPatientAnamnese }"
                    @click="onPatientAnamnese"
                  >
                    <i class="bi bi-clipboard-heart me-2"></i>
                    {{ $t('patientHistoryView.showPatientAnamnese') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showPreprontuarioHistory }"
                    @click="onPreprontuarioHistory"
                  >
                    <i class="bi bi-file-earmark-medical me-2"></i>
                    {{ $t('dashboard.preprontuarioHistory.title') || 'Pré-Prontuários' }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showConsultationReason }"
                    @click="onConsultationReason"
                  >
                    <i class="bi bi-chat-dots me-2"></i>
                    {{ $t('patientHistoryView.showConsultationReason') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showCurrentIllness }"
                    @click="onCurrentIllness"
                  >
                    <i class="bi bi-activity me-2"></i>
                    {{ $t('patientHistoryView.showCurrentIllness') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showFunctionalExam }"
                    @click="onFunctionalExam"
                  >
                    <i class="bi bi-heart-pulse me-2"></i>
                    {{ $t('patientHistoryView.showFunctionalExam') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showPhysicalExam }"
                    @click="onPhysicalExam"
                  >
                    <i class="bi bi-thermometer me-2"></i>
                    {{ $t('patientHistoryView.showPhysicalExam') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showDiagnostic }"
                    @click="onDiagnostic"
                  >
                    <i class="bi bi-file-earmark-medical me-2"></i>
                    {{ $t('patientHistoryView.showDiagnostic') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showMedicalOrder }"
                    @click="onMedicalOrder"
                  >
                    <i class="bi bi-prescription me-2"></i>
                    {{ $t('patientHistoryView.showMedicalOrder') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showControl }"
                    @click="onControl"
                  >
                    <i class="bi bi-calendar-event me-2"></i>
                    {{ $t('patientHistoryView.showControl') }}
                    <span
                      class="badge bg-warning rounded-pill ms-2"
                      v-if="pendingControlNumber > 0"
                    >
                      {{ pendingControlNumber }}
                    </span>
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showDocuments }"
                    @click="onDocuments"
                  >
                    <i class="bi bi-folder me-2"></i>
                    {{ $t('patientHistoryView.showDocuments') }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showEvolution }"
                    @click="onEvolution"
                  >
                    <i class="bi bi-graph-up-arrow me-2"></i>
                    Evolución
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{
                      'mobile-menu-item-active': showConsultationTimeline || showConsultationDetail,
                    }"
                    @click="onConsultationTimeline"
                  >
                    <i class="bi bi-clock-history me-2"></i>
                    {{ $t('patientHistoryView.consultationTimeline') || 'Historial de Consultas' }}
                  </button>
                  <button
                    class="mobile-menu-item"
                    :class="{ 'mobile-menu-item-active': showPatientJourney }"
                    @click="onPatientJourney"
                  >
                    <i class="bi bi-diagram-3 me-2"></i>
                    {{ $t('patientHistory.patientJourney') || 'Patient Journey' }}
                  </button>
                  <button
                    v-if="userType === 'business'"
                    class="mobile-menu-item"
                    @click="onItensMedicalHistory"
                  >
                    <i class="bi bi-gear-fill me-2"></i>
                    {{ $t('patientHistoryView.showItensMedicalHistory') }}
                  </button>
                </div>
              </div>
            </div>
            <!-- MAIN CONTENT AREA -->
            <div class="col-12 main-content-area" :class="menuCollapsed ? 'col-lg-12' : 'col-lg-9'">
              <!-- Patient Header Card - Fixed -->
              <div class="patient-header-card modern-card-header patient-header-fixed">
                <div class="patient-header-wrapper">
                  <div class="patient-avatar-container">
                    <div
                      class="patient-avatar"
                      @click="togglePhotoMenu"
                      :title="
                        patientPhoto
                          ? 'Click para ver foto del paciente'
                          : 'Click para agregar foto del paciente'
                      "
                    >
                      <!-- Patient Photo -->
                      <img
                        v-if="patientPhotoUrl && !photoLoading"
                        :src="patientPhotoUrl"
                        alt="Foto del paciente"
                        class="patient-photo"
                        @error="handlePhotoImageError"
                        @load="handlePhotoImageLoad"
                      />
                      <!-- Loading Spinner -->
                      <div v-else-if="photoLoading" class="photo-loading">
                        <i class="bi bi-arrow-repeat spin"></i>
                        <span class="loading-text">Guardando...</span>
                      </div>
                      <!-- Default Icon -->
                      <i v-else class="bi bi-person-fill"></i>

                      <!-- Photo Actions Overlay -->
                      <div class="photo-overlay">
                        <i class="bi bi-camera-fill"></i>
                      </div>
                    </div>

                    <!-- Photo Menu -->
                    <div v-if="showPhotoMenu" class="photo-menu">
                      <button
                        v-if="!patientPhoto"
                        class="photo-menu-item"
                        @click="openPhotoCapture"
                      >
                        <i class="bi bi-camera me-2"></i>
                        Agregar Foto
                      </button>
                      <template v-else>
                        <button class="photo-menu-item" @click="viewPhoto">
                          <i class="bi bi-eye me-2"></i>
                          Ver Foto
                        </button>
                        <button class="photo-menu-item" @click="openPhotoCapture">
                          <i class="bi bi-camera me-2"></i>
                          Cambiar Foto
                        </button>
                        <button class="photo-menu-item delete" @click="deletePatientPhoto">
                          <i class="bi bi-trash me-2"></i>
                          Eliminar Foto
                        </button>
                      </template>
                    </div>
                  </div>
                  <div class="patient-info">
                    <!-- Patient Summary -->
                    <div v-if="patientSummary" class="patient-summary-compact">
                      <!-- Patient Name - Prominente -->
                      <div class="patient-name-prominent">
                        <i class="bi bi-person-badge"></i>
                        <span class="full-name"
                          >{{ patientSummary.name }} {{ patientSummary.lastName }}</span
                        >
                      </div>

                      <!-- Separador visual -->
                      <div class="name-separator"></div>

                      <!-- Resto de información -->
                      <div class="summary-line">
                        <span class="summary-compact-item">
                          <i class="bi bi-calendar"></i> {{ formatDate(patientSummary.birthday) }}
                        </span>
                        <span class="summary-compact-item">
                          <i class="bi bi-clock"></i> {{ patientSummary.age }}
                        </span>
                        <span class="summary-compact-item">
                          <i class="bi bi-briefcase"></i>
                          {{ patientSummary.occupation || 'No especificada' }}
                        </span>
                      </div>
                      <div class="summary-line">
                        <span class="summary-compact-item">
                          <i class="bi bi-calendar-check"></i>
                          {{ patientSummary.lastConsultationDate }}
                        </span>
                        <span class="summary-compact-item">
                          <i class="bi bi-clipboard-check"></i>
                          <span
                            v-if="patientSummary.preprontuarioCompleted"
                            class="status-ok"
                            title="Preprontuario completado y datos cargados"
                            >✓</span
                          >
                          <span
                            v-else-if="patientSummary.preprontuarioSent"
                            class="status-warning"
                            title="Preprontuario enviado pero no completado"
                            >⚠</span
                          >
                          <span v-else class="status-pending" title="Preprontuario no enviado"
                            >✗</span
                          >
                          Preprontuario
                          <small v-if="patientForms && patientForms.length > 0" class="form-count"
                            >({{ patientForms.length }})</small
                          >
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="patient-meta">
                    <span
                      class="badge bg-warning patient-badge patient-badge-clickable"
                      v-if="pendingControlNumber > 0"
                      @click="onControl"
                    >
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      {{ $t('patientHistoryView.pendingControls') }}: {{ pendingControlNumber }}
                    </span>
                    <span class="badge bg-success patient-badge" v-if="lastSaved && !dataChanged">
                      <i class="bi bi-check-circle me-1"></i>
                      {{ $t('patientHistoryView.saved') }}
                    </span>
                  </div>
                  <div class="patient-actions">
                    <!-- Botones de acción -->
                    <div class="patient-actions-row">
                      <button
                        class="btn-action btn-action-secondary"
                        :class="{ 'btn-action-active': showResume }"
                        @click="onResume()"
                        :title="$t('patientHistoryView.resume')"
                      >
                        <i class="bi bi-file-text"></i>
                        <span class="d-none d-md-inline ms-1">{{
                          $t('patientHistoryView.resume')
                        }}</span>
                      </button>
                      <button
                        class="btn-action btn-action-primary"
                        @click.prevent="onSave"
                        :disabled="saving"
                        :title="$t('patientHistoryView.save')"
                      >
                        <i class="bi" :class="saving ? 'bi-arrow-repeat spin' : 'bi-save'"></i>
                        <span class="d-none d-md-inline ms-1">{{
                          $t('patientHistoryView.save')
                        }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Form Container - Scrollable -->
              <div class="form-container-wrapper">
                <div class="form-container modern-card-form">
                  <!-- Clinical Alerts Banner -->
                  <ClinicalAlertsBanner
                    v-if="clinicalAlerts && clinicalAlerts.length > 0"
                    :alerts="clinicalAlerts"
                    @acknowledge="handleAcknowledgeAlert"
                    class="mb-3"
                  />
                  <div v-if="showResume">
                    <PatientResumeForm
                      :patient-history-data="patientHistory"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                    >
                    </PatientResumeForm>
                  </div>
                  <div v-if="showPersonalData">
                    <PatientPersonalDataForm
                      :patient-history-data="patientHistory"
                      :cache-data="newPersonalData"
                      :client-data="client"
                      :patient-forms="patientForms"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receivePersonalData"
                    >
                    </PatientPersonalDataForm>
                  </div>
                  <div v-if="showConsultationReason">
                    <ConsultationReasonForm
                      :patient-history-data="patientHistory"
                      :cache-data="newConsultationReason"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveConsultationReasonData"
                    >
                    </ConsultationReasonForm>
                  </div>
                  <div v-if="showCurrentIllness">
                    <CurrentIllnessForm
                      :patient-history-data="patientHistory"
                      :cache-data="newCurrentIllness"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveCurrentIllnessData"
                    >
                    </CurrentIllnessForm>
                  </div>
                  <div v-if="showPatientAnamnese">
                    <PatientAnamneseForm
                      :patient-history-data="patientHistory"
                      :cache-data="newPatientAnamnese"
                      :patient-forms="patientForms"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :patient-history-items="patientHistoryItems"
                      :receive-data="receivePatientAnamneseData"
                    >
                    </PatientAnamneseForm>
                  </div>
                  <div v-if="showPreprontuarioHistory">
                    <PreprontuarioHistoryView
                      :patient-forms="patientForms"
                      :commerce="commerce"
                      :client="client"
                      :toggles="toggles"
                      :on-load-to-personal-data="handleLoadToPersonalData"
                      :on-load-to-anamnese="handleLoadToAnamnese"
                      @form-loaded="handleFormLoaded"
                    >
                    </PreprontuarioHistoryView>
                  </div>
                  <div v-if="showFunctionalExam">
                    <FunctionalExamForm
                      :patient-history-data="patientHistory"
                      :cache-data="newFunctionalExam"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveFunctionalExamData"
                    >
                    </FunctionalExamForm>
                  </div>
                  <div v-if="showPhysicalExam">
                    <PhysicalExamForm
                      :patient-history-data="patientHistory"
                      :cache-data="newPhysicalExam"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :patient-history-items="patientHistoryItems"
                      :receive-data="receivePhysicalExamData"
                    >
                    </PhysicalExamForm>
                  </div>
                  <div v-if="showDiagnostic">
                    <DiagnosticForm
                      :patient-history-data="patientHistory"
                      :cache-data="newDiagnostic"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveDiagnosticData"
                    >
                    </DiagnosticForm>
                  </div>
                  <div v-if="showMedicalOrder">
                    <MedicalOrderForm
                      :patient-history-data="patientHistory"
                      :cache-data="newMedicalOrder"
                      :commerce="commerce"
                      :client="client"
                      :attention="attentionObject"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveMedicalOrderData"
                      :on-save="onSave"
                    >
                    </MedicalOrderForm>
                  </div>
                  <div v-if="showControl">
                    <ControlForm
                      :patient-history-data="patientHistory"
                      :cache-data="newControl"
                      :commerce="commerce"
                      :toggles="toggles"
                      :errors-add="errorsAdd"
                      :receive-data="receiveControlData"
                      :on-save="onSave"
                      :on-update="onControlUpdate"
                    >
                    </ControlForm>
                  </div>
                  <div v-if="showDocuments">
                    <DocumentsForm
                      :patient-history-data="patientHistory"
                      :cache-data="newDocument"
                      :commerce="commerce"
                      :toggles="toggles"
                      :client-data="client"
                      :errors-add="errorsAdd"
                      :patient-history-items="patientHistoryItems"
                      :receive-data="receiveDocumentsData"
                      :on-update="onPatientDocumentUpdate"
                    >
                    </DocumentsForm>
                  </div>
                  <div v-if="showEvolution && client && commerce">
                    <PatientEvolutionView :client-id="client.id" :commerce-id="commerce.id" />
                  </div>
                  <div v-if="showConsultationTimeline && client && commerce">
                    <ConsultationTimeline
                      :key="`consultation-timeline-${patientHistory?.id}-${
                        lastSaved?.getTime() || 0
                      }`"
                      :client-id="client.id"
                      :commerce-id="commerce.id"
                      :patient-history-id="patientHistory?.id"
                      @consultation-selected="onConsultationSelected"
                      ref="consultationTimeline"
                    />
                  </div>
                  <div v-if="showConsultationDetail && selectedConsultation">
                    <ConsultationDetail
                      :consultation="selectedConsultation"
                      :commerce="commerce"
                      :client-id="client?.id"
                      @close="closeConsultationDetail"
                    />
                  </div>
                  <div v-if="showPatientJourney && client && commerce">
                    <PatientJourneyView
                      :client-id="client.id"
                      :commerce-id="commerce.id"
                      @close="closePatientJourney"
                      @view-item="onViewItem"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Search Modal -->
      <AdvancedSearchModal
        v-if="client && commerce && client.id && commerce.id"
        :show="showAdvancedSearch"
        :client-id="client.id"
        :commerce-id="commerce.id"
        @close="showAdvancedSearch = false"
        @result-selected="handleSearchResultSelected"
      />

      <!-- Footer Status Bar - Fixed at Bottom -->
      <div class="patient-history-footer">
        <div class="form-footer">
          <div class="form-footer-left"></div>
          <div class="form-footer-right">
            <span
              class="form-footer-text"
              v-if="patientHistory.updatedDate || patientHistory.modifiedAt"
            >
              <i class="bi bi-clock-history me-1"></i>
              {{ $t('patientHistoryView.updated') }}:
              {{ getDate(patientHistory.modifiedAt || patientHistory.updatedDate) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showPatientHistoryManagement === true && !toggles['patient.history.view']">
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>

    <!-- Patient Photo Capture Modal -->
    <PatientPhotoCapture
      :show="showPhotoCapture"
      :client-id="client?.id"
      :commerce-id="commerce?.id"
      :existing-photo="patientPhoto"
      @close="closePhotoCapture"
      @photo-captured="onPhotoCaptured"
      @photo-uploaded="onPhotoUploaded"
    />

    <!-- Photo Viewer Modal -->
    <div
      v-if="showPhotoViewer && patientPhotoFullUrl"
      class="photo-viewer-modal"
      @click="closePhotoViewer"
    >
      <div class="photo-viewer-container" @click.stop>
        <button class="btn-close-viewer" @click="closePhotoViewer">
          <i class="bi bi-x"></i>
        </button>
        <img
          :src="patientPhotoFullUrl"
          alt="Foto del paciente"
          class="photo-viewer-image"
          @error="handlePhotoError"
        />
        <div class="photo-viewer-actions">
          <button class="btn-viewer-action primary" @click="openPhotoCapture">
            <i class="bi bi-camera me-1"></i>
            Cambiar Foto
          </button>
          <button class="btn-viewer-action delete" @click="deletePatientPhoto">
            <i class="bi bi-trash me-1"></i>
            Eliminar
          </button>
          <button class="btn-viewer-action" @click="closePhotoViewer">
            <i class="bi bi-x me-1"></i>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Patient History Container - Optimizado */
.patient-history-modern {
  padding: 0.5rem;
  display: flex;
  height: 100%;
  min-height: 600px;
  position: relative;
  overflow: hidden;
}

.patient-history-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

#patient-history-management-component {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
}

.patient-history-layout {
  flex: 1;
  display: flex;
  min-height: 0;
  height: 100%;
  position: relative;
  width: 100%;
}

.patient-history-layout > .col-12,
.patient-history-layout > .col-lg-3,
.patient-history-layout > .col-lg-9 {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* Modern Sidebar Styles */
.patient-history-sidebar {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.modern-card-sidebar {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.75rem 0.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  height: 100%;
  overflow: visible;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-toggle-btn {
  position: absolute;
  right: -12px;
  top: 1rem;
  z-index: 100;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 0.8rem;
  pointer-events: auto;
}

.sidebar-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  min-height: 0;
}

.sidebar-content-compact {
  padding: 0.5rem 0.25rem;
}

.sidebar-collapsed {
  width: 60px;
  padding: 0.5rem 0.25rem;
  min-width: 60px;
}

.menu-collapsed {
  flex: 0 0 60px !important;
  max-width: 60px !important;
  min-width: 60px !important;
  transition: all 0.3s ease;
}

.sidebar-menu-item-badge.sidebar-menu-item-compact {
  position: relative;
}

.sidebar-menu-item-compact .sidebar-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: visible;
  position: relative;
}

.col-lg-3.menu-collapsed {
  flex: 0 0 60px !important;
  max-width: 60px !important;
  min-width: 60px !important;
}

.col-lg-9,
.col-lg-12.main-content-area {
  transition: all 0.3s ease;
}

.modern-card-sidebar:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.sidebar-section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.35rem 0.4rem;
  color: var(--azul-turno);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 0.2rem;
  margin-top: 0.35rem;
  transition: all 0.3s ease;
}

.sidebar-section-header:first-child {
  margin-top: 0;
}

.sidebar-section-header-compact {
  justify-content: center;
  padding: 0.5rem 0.25rem;
  margin-bottom: 0.5rem;
}

.sidebar-section-title {
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.sidebar-menu-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sidebar-menu-item {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  border-radius: 0.35rem;
  color: var(--color-text);
  font-size: 0.8rem;
  font-weight: 500;
  text-align: left;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  width: 100%;
  justify-content: flex-start;
}

.sidebar-menu-item-compact {
  justify-content: center;
  padding: 0.4rem;
  width: 100%;
}

.sidebar-menu-text {
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.3s ease;
}

.sidebar-menu-item:hover {
  background: rgba(0, 0, 0, 0.03);
  transform: translateX(4px);
}

.sidebar-menu-item-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.sidebar-menu-item-active:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.sidebar-menu-icon {
  width: 16px;
  margin-right: 0.4rem;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.sidebar-menu-item-compact .sidebar-menu-icon {
  margin-right: 0;
  width: 18px;
  font-size: 1rem;
}

.sidebar-menu-item-badge {
  justify-content: flex-start;
}

.sidebar-badge {
  background: rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
  margin-left: auto;
}

.sidebar-menu-item-active .sidebar-badge {
  background: rgba(255, 255, 255, 0.25);
}

.sidebar-menu-item-settings {
  margin-top: 0.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding-top: 0.5rem;
}

/* Mobile Menu Styles */
.mobile-menu-header {
  margin-bottom: 0.75rem;
}

.mobile-menu-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.4rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.mobile-menu-toggle:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.mobile-menu-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  background: rgba(248, 249, 250, 0.5);
  border-radius: 0.4rem;
  margin-top: 0.5rem;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: white;
  border-radius: 0.4rem;
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  transition: all 0.2s ease;
  cursor: pointer;
  width: 100%;
}

.mobile-menu-item:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--azul-turno);
}

.mobile-menu-item-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: transparent;
}

/* Main Content Area */
.main-content-area {
  display: flex !important;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  flex: 1;
  width: 100%;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Patient Header Card */
.patient-header-fixed {
  position: sticky;
  top: 0;
  z-index: 5;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}

.modern-card-header {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  min-height: 70px;
}

.modern-card-header:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.patient-header-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  flex-wrap: nowrap;
  justify-content: space-between;
}

.patient-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.patient-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.8);
}

.patient-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.photo-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 1rem;
  color: var(--color-primary);
  gap: 0.25rem;
}

.loading-text {
  font-size: 0.6rem;
  font-weight: 500;
  text-align: center;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 50%;
  font-size: var(--font-sm);
}

.patient-avatar:hover .photo-overlay {
  opacity: 1;
}

/* Patient Avatar Container */
.patient-avatar-container {
  position: relative;
}

/* Photo Menu */
.photo-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border-radius: 0.5rem;
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--border-color);
  z-index: 10;
  min-width: 140px;
  overflow: hidden;
  margin-top: var(--spacing-xs);
  padding: 0.3rem 1.2rem;
}

.photo-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid var(--border-color);
  line-height: 1;
}

.photo-menu-item:last-child {
  border-bottom: none;
}

.photo-menu-item:hover {
  background: #eff6ff;
}

.photo-menu-item.delete {
  color: #dc2626;
}

.photo-menu-item.delete:hover {
  background: rgba(220, 38, 38, 0.1);
}

/* Photo Viewer Modal */
.photo-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1060;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: pointer;
  backdrop-filter: blur(5px);
}

.photo-viewer-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  padding: 1rem;
  backdrop-filter: blur(10px);
}

.btn-close-viewer {
  position: absolute;
  top: -3rem;
  right: 0;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.2s ease;
  z-index: 1;
}

.btn-close-viewer:hover {
  background: rgba(255, 255, 255, 0.3);
}

.photo-viewer-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 0.75rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: white;
}

.photo-viewer-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-viewer-action {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-viewer-action:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.btn-viewer-action.delete {
  background: rgba(220, 53, 69, 0.3);
  border-color: rgba(220, 53, 69, 0.5);
}

.btn-viewer-action.delete:hover {
  background: rgba(220, 53, 69, 0.5);
}

.btn-viewer-action.primary {
  background: rgba(0, 123, 255, 0.3);
  border-color: rgba(0, 123, 255, 0.5);
}

.btn-viewer-action.primary:hover {
  background: rgba(0, 123, 255, 0.5);
}

.patient-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.patient-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
}

.patient-name-placeholder {
  margin: 0;
}

.patient-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  flex: 0 0 auto;
  min-width: 0;
}

.patient-badge {
  font-size: 0.8rem;
  padding: 0.3rem 0.5rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  white-space: nowrap;
}

.patient-badge i {
  font-size: 0.9rem;
}

.patient-badge-clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.patient-badge-clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  opacity: 0.9;
}

.patient-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  justify-content: flex-end;
  align-items: flex-end;
  flex-shrink: 0;
  margin-left: auto;
}

.patient-actions-row {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  justify-content: flex-end;
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

.btn-action-secondary:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--azul-turno);
}

.btn-action-outline {
  background: transparent;
  color: var(--azul-turno);
  border: 1px solid var(--azul-turno);
}

.btn-action-outline:hover:not(:disabled) {
  background: var(--azul-turno);
  color: white;
}

.btn-action-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-color: transparent;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Form Container */
.form-container-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  height: 100%;
}

.modern-card-form {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  transition: all 0.3s ease;
  min-height: 0;
  height: 100%;
  max-height: calc(100vh - 180px);
}

.modern-card-form:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Patient History Footer - Fixed at Bottom */
.patient-history-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 5;
  padding: 0.25rem 0.5rem;
  margin-top: auto;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: 100%;
}

.form-footer-left,
.form-footer-right {
  display: flex;
  align-items: center;
}

.form-footer-text {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.7;
  display: flex;
  align-items: center;
}

.form-check-input {
  cursor: pointer;
  width: 1.1rem;
  height: 1.1rem;
}

.form-check-label {
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  margin: 0;
}

/* Legacy Support */
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}

.text-label {
  font-size: 0.9rem;
  line-height: 0.9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

.alert-pending {
  color: var(--color-text);
}

/* Responsive Design */
@media (max-width: 991px) {
  .patient-history-layout {
    flex-direction: column;
  }

  .patient-header-wrapper {
    gap: 0.5rem;
  }

  .patient-meta {
    order: 3;
    width: 100%;
    margin-top: 0.25rem;
  }

  .patient-actions {
    width: 100%;
    align-items: stretch;
    order: 4;
  }

  .patient-actions-row {
    justify-content: stretch;
  }

  .btn-action {
    flex: 1;
    justify-content: center;
  }

  .modern-card-form {
    padding: 1.5rem;
  }

  .form-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .patient-history-footer {
    position: relative;
  }
}

@media (max-width: 768px) {
  .patient-history-modern {
    padding: 0.5rem;
  }

  .modern-card-sidebar {
    position: relative;
    top: 0;
    max-height: none;
  }

  .patient-name {
    font-size: 1.25rem;
  }

  .modern-card-form {
    padding: 1rem;
    max-height: calc(100vh - 200px);
  }
}

/* Scrollbar Styling */
.modern-card-sidebar::-webkit-scrollbar,
.modern-card-form::-webkit-scrollbar {
  width: 6px;
}

.modern-card-sidebar::-webkit-scrollbar-track,
.modern-card-form::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.modern-card-sidebar::-webkit-scrollbar-thumb,
.modern-card-form::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.modern-card-sidebar::-webkit-scrollbar-thumb:hover,
.modern-card-form::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Custom Tooltips for Collapsed Menu - Debug Version */
.sidebar-menu-item-compact {
  position: relative;
  overflow: visible !important;
}

/* Test tooltip - very visible */
.sidebar-menu-item-compact:hover::after {
  content: attr(title);
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 8px;
  background: #ff0000 !important; /* Red background for testing */
  color: white !important;
  padding: 8px 12px !important;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  z-index: 99999 !important;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  display: block !important;
  min-width: 100px;
  border: 2px solid yellow; /* Yellow border for visibility */
}

/* Arrow pointer */
.sidebar-menu-item-compact:hover::before {
  content: '';
  position: absolute;
  left: 100%;
  top: 8px;
  margin-left: 2px;
  border: 6px solid transparent;
  border-right-color: #ff0000;
  z-index: 99998 !important;
  pointer-events: none;
  display: block !important;
}

/* Only hide when there's no title */
.sidebar-menu-item-compact[title='']:hover::after,
.sidebar-menu-item-compact[title='']:hover::before {
  display: none !important;
}

/* Patient Summary Compact Styles */
.patient-summary-compact {
  margin-top: 0.25rem;
  font-size: 0.72rem;
  color: var(--color-text);
  opacity: 0.75;
  line-height: 1.3;
}

/* Patient Name Prominent */
.patient-name-prominent {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.patient-name-prominent i {
  font-size: 1.2rem;
  color: var(--color-primary);
  opacity: 0.8;
  flex-shrink: 0;
}

.full-name {
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.name-separator {
  height: 1px;
  background: linear-gradient(90deg, var(--color-primary) 0%, transparent 100%);
  margin: 0.2rem 0 0.3rem 0;
  opacity: 0.3;
}

.summary-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.1rem;
  align-items: center;
}

.summary-line:last-child {
  margin-bottom: 0;
}

.summary-compact-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  background: rgba(0, 123, 255, 0.05);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(0, 123, 255, 0.1);
}

.summary-compact-item i {
  color: var(--azul-turno);
  font-size: 0.9rem;
  opacity: 0.9;
}

.status-ok {
  color: #28a745;
  font-weight: bold;
  font-size: 0.75rem;
}

.status-warning {
  color: #ffc107;
  font-weight: bold;
  font-size: 0.75rem;
}

.status-pending {
  color: #dc3545;
  font-weight: bold;
  font-size: 0.75rem;
}

.form-count {
  opacity: 0.7;
  font-size: 0.65rem;
  margin-left: 0.2rem;
}

/* Responsive adjustments for compact summary */
@media (max-width: 992px) {
  .patient-header-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }

  .patient-info {
    width: 100%;
  }

  .patient-meta {
    width: 100%;
    justify-content: flex-start;
  }

  .patient-actions {
    width: 100%;
    align-items: flex-end;
  }

  .patient-actions-row {
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .summary-line {
    gap: 0.4rem;
  }

  .summary-compact-item {
    font-size: 0.65rem;
    padding: 0.08rem 0.25rem;
  }
}

@media (max-width: 480px) {
  .summary-line {
    flex-direction: column;
    gap: 0.2rem;
    align-items: flex-start;
  }

  .summary-compact-item {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
