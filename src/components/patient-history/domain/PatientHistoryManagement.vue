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
} from '../../../application/services/patient-history';
import { getPermissions } from '../../../application/services/permissions';
import { getAlertsByClient } from '../../../application/services/clinical-alerts';
import { getDateAndHour } from '../../../shared/utils/date';
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
      showFunctionalExam: false,
      showPhysicalExam: false,
      showDiagnostic: false,
      showMedicalOrder: false,
      showControl: false,
      showResume: false,
      showDocuments: false,
      showEvolution: false,
      showAdvancedSearch: false,
      quickSearchTerm: '',
      showQuickSearchSuggestions: false,
      searchHistory: [],
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
      quickSearchKeyDownHandler: null,
      showConsultationTimeline: false,
      showConsultationDetail: false,
      showPatientJourney: false,
      selectedConsultation: null,
    };
  },
  async beforeMount() {
    await this.loadClinicalAlerts();
    this.toggles = await getPermissions('patient', 'history');
    this.userType = await this.store.getCurrentUserType;
    this.loadSearchHistory();
    this.setupQuickSearchShortcut();
    this.setupModalCloseListener();
  },
  mounted() {
    this.setupModalCloseListener();
  },
  async beforeUnmount() {
    // Clear any existing timers
    if (this.saveIntervalId !== undefined) {
      clearInterval(this.saveIntervalId);
      this.saveIntervalId = undefined;
    }
    if (this.saveTimeoutId !== undefined) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = undefined;
    }
    // Save before closing if there are changes
    if (this.dataChanged && this.newPersonalData && !this.saving) {
      try {
        await this.onSave();
      } catch (error) {
        console.error('Error saving before unmount:', error);
      }
    }
    // Limpiar listener de atajo de teclado
    if (this.quickSearchKeyDownHandler) {
      window.removeEventListener('keydown', this.quickSearchKeyDownHandler);
    }
    // Limpiar listener del modal
    const modalElement = this.$el?.closest('.modal');
    if (modalElement && this.modalHideHandler) {
      modalElement.removeEventListener('hide.bs.modal', this.modalHideHandler);
    }
  },
  computed: {
    filteredSearchHistory() {
      if (!this.quickSearchTerm) {
        return this.searchHistory.slice(0, 5);
      }
      return this.searchHistory
        .filter(h => h.toLowerCase().includes(this.quickSearchTerm.toLowerCase()))
        .slice(0, 5);
    },
    attentionObject() {
      // Convert attention ID (String) to Object format expected by child components
      if (typeof this.attention === 'string' && this.attention) {
        return { id: this.attention };
      }
      if (this.attention && typeof this.attention === 'object') {
        return this.attention;
      }
      return {};
    },
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
      this.showFunctionalExam = false;
      this.showPhysicalExam = false;
      this.showDiagnostic = false;
      this.showMedicalOrder = false;
      this.showControl = false;
      this.showResume = false;
      this.showDocuments = false;
      this.showEvolution = false;
      this.showConsultationTimeline = false;
      this.showConsultationDetail = false;
      this.showPatientJourney = false;
      this.onMobileMenu();
    },
    resetValues() {
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
    },
    onViewItem(item) {
      // Handle viewing item details from journey
      if (item.type === 'consultation') {
        this.onConsultationSelected(item.item);
      } else {
        // Handle other item types (booking, attention, etc.)
        console.log('View item:', item);
      }
    },
    receivePersonalData(data) {
      if (data) {
        this.dataChanged = true;
        this.newPersonalData = data;
      }
    },
    receiveConsultationReasonData(data) {
      if (data) {
        this.dataChanged = true;
        this.newConsultationReason = data;
      }
    },
    receiveCurrentIllnessData(data) {
      if (data) {
        this.dataChanged = true;
        this.newCurrentIllness = data;
      }
    },
    receivePatientAnamneseData(data) {
      if (data) {
        this.dataChanged = true;
        this.newPatientAnamnese = data;
      }
    },
    receiveFunctionalExamData(data) {
      if (data) {
        this.dataChanged = true;
        this.newFunctionalExam = data;
      }
    },
    receivePhysicalExamData(data) {
      if (data) {
        this.dataChanged = true;
        this.newPhysicalExam = data;
      }
    },
    receiveDiagnosticData(data) {
      if (data) {
        this.dataChanged = true;
        this.newDiagnostic = data;
      }
    },
    receiveMedicalOrderData(data) {
      if (data) {
        this.dataChanged = true;
        this.newMedicalOrder = data;
      }
    },
    async loadClinicalAlerts() {
      if (!this.client || !this.client.id || !this.commerce || !this.commerce.id) return;
      try {
        const alerts = await getAlertsByClient(this.commerce.id, this.client.id, true);
        this.clinicalAlerts = alerts || [];
      } catch (error) {
        console.error('Error loading clinical alerts:', error);
        this.clinicalAlerts = [];
      }
    },
    async handleAcknowledgeAlert(alertId) {
      try {
        // TODO: Call acknowledge API
        this.clinicalAlerts = this.clinicalAlerts.filter(a => a.id !== alertId);
      } catch (error) {
        console.error('Error acknowledging alert:', error);
      }
    },
    receiveControlData(data) {
      if (data) {
        this.dataChanged = true;
        this.newControl = data;
      }
    },
    async receiveDocumentsData(data) {
      if (data) {
        this.newDocument = data;
        await this.onSave();
      }
    },
    validate(personalData) {
      this.errorsAdd = [];
      if (personalData) {
        if (!personalData.name || personalData.name.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.name');
          this.nameError = true;
        }
        if (!personalData.lastName || personalData.lastName.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.lastName');
          this.lastNameError = true;
        }
        if (!personalData.idNumber || personalData.idNumber.length < 8) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.idNumber');
          this.idNumberError = true;
        }
        if (!personalData.birthday || personalData.birthday.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.birthday');
          this.birthdayError = true;
        }
        if (!personalData.age || personalData.age.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.age');
          this.ageError = true;
        }
        if (!personalData.occupation || personalData.occupation.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.occupation');
          this.occupationError = true;
        }
        if (!personalData.civilStatus || personalData.civilStatus.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.civilStatus');
          this.civilStatusError = true;
        }
        if (!personalData.sex || personalData.sex.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.sex');
          this.sexError = true;
        }
        if (!personalData.addressCode || personalData.addressCode.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.addressCode');
          this.addressCodeError = true;
        }
        if (!personalData.addressText || personalData.addressText.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.addressText');
          this.addressTextError = true;
        }
        if (!personalData.addressComplement || personalData.addressComplement.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.addressComplement');
          this.addressComplementError = true;
        }
        if (!personalData.phone || personalData.phone.length === 0) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.phone');
          this.phoneError = true;
        }
        if (personalData.font === undefined) {
          this.errorsAdd.push('patientHistoryView.validate.personalData.font');
          this.fontError = true;
        }
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async onSave() {
      try {
        this.loading = true;
        this.saving = true;
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            commerceId: this.commerce.id,
            clientId: this.client.id,
            personalData: this.newPersonalData,
            consultationReason: this.newConsultationReason,
            currentIllness: this.newCurrentIllness,
            patientAnamnese: this.newPatientAnamnese,
            functionalExam: this.newFunctionalExam,
            physicalExam: this.newPhysicalExam,
            diagnostic: this.newDiagnostic,
            medicalOrder: this.newMedicalOrder,
            patientDocument: this.newDocument,
            control: this.newControl,
            lastAttentionId: this.attention,
          };
          this.patientHistory = await savePatientHistory(body);
          this.dataChanged = false;
          this.lastSaved = new Date();
          this.refresh();
          // Refresh consultation timeline if it's visible
          if (this.showConsultationTimeline && this.$refs.consultationTimeline) {
            this.$refs.consultationTimeline.loadConsultations();
          }
        }
        this.loading = false;
        this.saving = false;
      } catch (error) {
        this.loading = false;
        this.saving = false;
        this.alertError = error.message;
      }
    },
    async onControlUpdate(control) {
      try {
        this.loading = true;
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            control,
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
    async onPatientDocumentUpdate(patientDocument) {
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
    },
    handleSearchResultSelected(result) {
      // Navegar al tipo de registro encontrado
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
      // TODO: Scroll al resultado específico si es posible
    },
    loadSearchHistory() {
      try {
        const stored = localStorage.getItem('patientHistorySearchHistory');
        if (stored) {
          this.searchHistory = JSON.parse(stored);
        }
      } catch (error) {
        console.error('Error loading search history:', error);
        this.searchHistory = [];
      }
    },
    saveSearchHistory(term) {
      if (!term || term.trim() === '') return;

      // Remover duplicados y agregar al inicio
      this.searchHistory = this.searchHistory.filter(h => h !== term);
      this.searchHistory.unshift(term);

      // Limitar a 10 búsquedas recientes
      if (this.searchHistory.length > 10) {
        this.searchHistory = this.searchHistory.slice(0, 10);
      }

      try {
        localStorage.setItem('patientHistorySearchHistory', JSON.stringify(this.searchHistory));
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    },
    performQuickSearch() {
      if (!this.quickSearchTerm || this.quickSearchTerm.trim() === '') return;

      this.saveSearchHistory(this.quickSearchTerm);
      this.showQuickSearchSuggestions = false;

      // Abrir búsqueda avanzada con el término prellenado
      this.showAdvancedSearch = true;
      // El modal se encargará de usar el término
    },
    selectSearchSuggestion(term) {
      this.quickSearchTerm = term;
      this.performQuickSearch();
    },
    setupQuickSearchShortcut() {
      const handleKeyDown = event => {
        // Atajo "/" para enfocar búsqueda rápida
        if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const target = event.target;
          // Solo activar si no estamos en un input/textarea
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            // Enfocar el input de búsqueda rápida
            this.$nextTick(() => {
              const searchInput = this.$el.querySelector('.quick-search-input');
              if (searchInput) {
                searchInput.focus();
              }
            });
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      // Guardar referencia para limpiar en beforeUnmount
      this.quickSearchKeyDownHandler = handleKeyDown;
    },
    setupModalCloseListener() {
      // Find the modal by traversing up from the component
      this.$nextTick(() => {
        const modalElement = this.$el?.closest('.modal');
        if (modalElement) {
          // Remove existing listener if any
          if (this.modalHideHandler) {
            modalElement.removeEventListener('hide.bs.modal', this.modalHideHandler);
          }
          // Create new handler that saves before closing
          this.modalHideHandler = async () => {
            // Save before closing if there are changes
            if (this.dataChanged && this.newPersonalData && !this.saving) {
              try {
                await this.onSave();
              } catch (error) {
                console.error('Error saving before modal close:', error);
              }
            }
          };
          modalElement.addEventListener('hide.bs.modal', this.modalHideHandler);
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
          ctrol => ctrol.status === 'PENDING'
        );
        if (pendingControl && pendingControl.length > 0) {
          this.pendingControlNumber = pendingControl.length;
        }
      }
    },
    async handleCloseModal() {
      // Save before closing if there are changes
      if (this.dataChanged && this.newPersonalData && !this.saving) {
        try {
          await this.onSave();
        } catch (error) {
          console.error('Error saving before close:', error);
        }
      }
      this.$emit('closeModal');
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
  computed: {},
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
    patientHistoryIn: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.patientHistoryIn && this.patientHistoryIn.id) {
          this.patientHistory = this.patientHistoryIn;
          this.refresh();
          const { personalData } = this.patientHistory;
          if (personalData) {
            this.newPersonalData = personalData;
          }
        }
      },
    },
  },
};
</script>

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
                    >
                      <i class="bi bi-clipboard-heart sidebar-menu-icon"></i>
                      <span class="sidebar-menu-text" v-if="!menuCollapsed">{{
                        $t('patientHistoryView.showPatientAnamnese')
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
                  <div class="patient-avatar">
                    <i class="bi bi-person-fill"></i>
                  </div>
                  <div class="patient-info">
                    <h3
                      class="patient-name"
                      v-if="
                        patientHistory.personalData &&
                        patientHistory.personalData.name &&
                        patientHistory.personalData.lastName
                      "
                    >
                      {{ patientHistory.personalData.name }}
                      {{ patientHistory.personalData.lastName }}
                    </h3>
                    <div v-else class="patient-name-placeholder">
                      <span class="badge bg-warning patient-badge">
                        {{ $t('patientHistoryView.clickSave') }} <i class="bi bi-save ms-1"></i>
                      </span>
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
                    <!-- Búsqueda Rápida -->
                    <div class="quick-search-container">
                      <input
                        type="text"
                        class="form-control form-control-sm quick-search-input"
                        v-model="quickSearchTerm"
                        @keyup.enter="performQuickSearch"
                        @focus="showQuickSearchSuggestions = true"
                        placeholder="Buscar rápido (/)..."
                        :title="'Presiona / para buscar o Enter para buscar'"
                      />
                      <div
                        v-if="showQuickSearchSuggestions && searchHistory.length > 0"
                        class="quick-search-suggestions"
                      >
                        <div
                          v-for="(item, index) in filteredSearchHistory"
                          :key="index"
                          class="suggestion-item"
                          @click="selectSearchSuggestion(item)"
                        >
                          <i class="bi bi-clock-history me-2"></i>
                          {{ item }}
                        </div>
                      </div>
                    </div>
                    <button
                      class="btn-action btn-action-outline"
                      @click="showAdvancedSearch = true"
                      :title="'Búsqueda Avanzada'"
                    >
                      <i class="bi bi-search"></i>
                      <span class="d-none d-md-inline ms-1">Buscar</span>
                    </button>
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
                      @click="onSave()"
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
                      :client-data="client"
                      :cache-data="newPersonalData"
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
        :initial-search-term="quickSearchTerm"
        @close="
          showAdvancedSearch = false;
          quickSearchTerm = '';
        "
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
  </div>
</template>

<style scoped>
/* Modern Patient History Container */
.patient-history-modern {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
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
  padding: 0.4rem 0.6rem;
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
  padding: 0.4rem 0.6rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.modern-card-header:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.patient-header-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  flex-wrap: wrap;
}

.patient-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.patient-info {
  flex: 0 0 auto;
  min-width: 0;
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
  flex: 1;
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
  gap: 0.3rem;
  justify-content: flex-end;
  flex-wrap: nowrap;
  align-items: center;
  flex-shrink: 0;
}

.quick-search-container {
  position: relative;
  min-width: 200px;
}

.quick-search-input {
  width: 200px;
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 0.4rem;
  transition: all 0.2s;
}

.quick-search-input:focus {
  width: 250px;
  border-color: #446ffc;
  box-shadow: 0 0 0 0.2rem rgba(68, 111, 252, 0.25);
  outline: none;
}

.quick-search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #333;
}

.suggestion-item:hover {
  background: rgba(68, 111, 252, 0.1);
}

.suggestion-item:first-child {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.suggestion-item:last-child {
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.65rem;
  border: none;
  border-radius: 0.4rem;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
}

.btn-action i {
  font-size: 0.95rem;
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
    justify-content: stretch;
    order: 4;
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
    max-height: 400px;
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
</style>
