<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from "vue3-popper";
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import { globalStore } from '../../../stores';
import { savePatientHistory, updatePatientHistoryControl } from '../../../application/services/patient-history';
import { getPermissions } from '../../../application/services/permissions';
import { getDateAndHour } from '../../../shared/utils/date';
import PatientPersonalDataForm from './PatientPersonalDataForm.vue';
import ConsultationReasonForm from './ConsultationReasonForm.vue';
import CurrentIllnessForm from './CurrentIllnessForm.vue';
import PersonalBackgroundForm from './PersonalBackgroundForm.vue';
import FamilyBackgroundForm from './FamilyBackgroundForm.vue';
import PsychobiologicalHabitsForm from './PsychobiologicalHabitsForm.vue';
import FunctionalExamForm from './FunctionalExamForm.vue';
import PhysicalExamForm from './PhysicalExamForm.vue';
import DiagnosticForm from './DiagnosticForm.vue';
import MedicalOrderForm from './MedicalOrderForm.vue';
import PatientResumeForm from './PatientResumeForm.vue';
import ControlForm from './ControlForm.vue';

export default {
  name: 'PatientHistoryManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, Alert, Warning, PatientPersonalDataForm, ConsultationReasonForm, CurrentIllnessForm, PersonalBackgroundForm, FamilyBackgroundForm, PsychobiologicalHabitsForm, FunctionalExamForm, PhysicalExamForm, DiagnosticForm, MedicalOrderForm, PatientResumeForm, ControlForm },
  props: {
    showPatientHistoryManagement: { type: Boolean, default: false },
    client: { type: String, default: undefined },
    attention: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    patientHistoryIn: { type: Object, default: {} },
    patientHistoryItems: { type: Array, default: [] }
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
      pendingControlNumber: 0,
      dataChanged: false,
      saveIntervalId: undefined,
      showPersonalData: true,
      showConsultationReason: false,
      showCurrentIllness: false,
      showPersonalBackground: false,
      showFamilyBackground: false,
      showPsychobiologicalHabits: false,
      showFunctionalExam: false,
      showPhysicalExam: false,
      showDiagnostic: false,
      showMedicalOrder: false,
      showControl: false,
      showResume: false,
      newPersonalData: undefined,
      newConsultationReason: undefined,
      newCurrentIllness: undefined,
      newPersonalBackground: undefined,
      newFamilyBackground: undefined,
      newPsychobiologicalHabits: undefined,
      newFunctionalExam: undefined,
      newPhysicalExam: undefined,
      newDiagnostic: undefined,
      newMedicalOrder: undefined,
      newControl: undefined
    }
  },
  async beforeMount() {
    this.toggles = await getPermissions('patient', 'history');
    this.userType = await this.store.getCurrentUserType;
  },
  async beforeUnmount() {
    if (this.saveIntervalId !== undefined) {
      clearInterval(this.saveIntervalId);
    }
  },
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    getDate(date) {
      const timeZone = this.commerce && this.commerce.localeInfo ? this.commerce.localeInfo.timezone : 'America/Sao_Paulo';
      return getDateAndHour(date, timeZone);
    },
    async clear() {
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
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
      this.showPersonalBackground = false;
      this.showFamilyBackground = false;
      this.showPsychobiologicalHabits = false;
      this.showFunctionalExam = false;
      this.showPhysicalExam = false;
      this.showDiagnostic = false;
      this.showMedicalOrder = false;
      this.showControl = false;
      this.showResume = false;
      this.onMobileMenu();
    },
    resetValues() {
      this.newPersonalData = undefined;
      this.newConsultationReason = undefined;
      this.newCurrentIllness = undefined;
      this.newPersonalBackground = undefined;
      this.newFamilyBackground = undefined;
      this.newPsychobiologicalHabits = undefined;
      this.newFunctionalExam = undefined;
      this.newPhysicalExam = undefined;
      this.newDiagnostic = undefined;
      this.newMedicalOrder = undefined;
      this.newControl = undefined
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
    onPersonalBackground() {
      this.resetButtons();
      this.showPersonalBackground = true;
    },
    onFamilyBackground() {
      this.resetButtons();
      this.showFamilyBackground = true;
    },
    onPsychobiologicalHabits() {
      this.resetButtons();
      this.showPsychobiologicalHabits = true;
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
    receivePersonalData (data) {
      if (data) {
        this.dataChanged = true;
        this.newPersonalData = data;
      };
    },
    receiveConsultationReasonData (data) {
      if (data) {
        this.dataChanged = true;
        this.newConsultationReason = data;
      };
    },
    receiveCurrentIllnessData (data) {
      if (data) {
        this.dataChanged = true;
        this.newCurrentIllness = data;
      };
    },
    receivePersonalBackgroundData (data) {
      if (data) {
        this.dataChanged = true;
        this.newPersonalBackground = data;
      };
    },
    receiveFamilyBackgroundData (data) {
      if (data) {
        this.dataChanged = true;
        this.newFamilyBackground = data;
      };
    },
    receivePsychobiologicalHabitsData (data) {
      if (data) {
        this.dataChanged = true;
        this.newPsychobiologicalHabits = data;
      };
    },
    receiveFunctionalExamData (data) {
      if (data) {
        this.dataChanged = true;
        this.newFunctionalExam = data;
      };
    },
    receivePhysicalExamData (data) {
      if (data) {
        this.dataChanged = true;
        this.newPhysicalExam = data;
      };
    },
    receiveDiagnosticData (data) {
      if (data) {
        this.dataChanged = true;
        this.newDiagnostic = data;
      };
    },
    receiveMedicalOrderData (data) {
      if (data) {
        this.dataChanged = true;
        this.newMedicalOrder = data;
      };
    },
    receiveControlData (data) {
      if (data) {
        this.dataChanged = true;
        this.newControl = data;
      };
    },
    validate (personalData) {
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
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            commerceId: this.commerce.id,
            clientId: this.client,
            personalData: this.newPersonalData,
            consultationReason: this.newConsultationReason,
            currentIllness: this.newCurrentIllness,
            personalBackground: this.newPersonalBackground,
            familyBackground: this.newFamilyBackground,
            psychobiologicalHabits: this.newPsychobiologicalHabits,
            functionalExam: this.newFunctionalExam,
            physicalExam: this.newPhysicalExam,
            diagnostic: this.newDiagnostic,
            medicalOrder: this.newMedicalOrder,
            control: this.newControl,
            lastAttentionId: this.attention
          }
          this.patientHistory = await savePatientHistory(body);
          this.refresh();
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async onUpdate(control) {
      try {
        this.loading = true;
        this.alertError = '';
        if (this.validate(this.newPersonalData)) {
          const body = {
            control: control,
            lastAttentionId: this.attention
          }
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
    refresh() {
      if (this.patientHistory && this.patientHistory.control) {
        const pendingControl = this.patientHistory.control.filter(ctrl => ctrl.status === 'PENDING');
        if (pendingControl && pendingControl.length > 0) {
          this.pendingControlNumber = pendingControl.length;
        }
      }
    },
    async onItensMedicalHistory () {
      if (this.userType && this.userType === 'business') {
        this.$emit('closeModal');
        this.$router.push({ path: '/interno/negocio/patient-history-item-admin' });
      }
    },
    async onMobileMenu () {
      const modalCloseButton = document.getElementById('menu-mobile-button');
      modalCloseButton.click();
    }
  },
  computed: {
    changedData() {
      const { dataChanged } = this;
      return {
        dataChanged
      }
    }
  },
  watch: {
    changedData: {
      immediate: true,
      deep: true,
      async handler(newData, oldData) {
        if (this.dataChanged === true && (newData.dataChanged !== oldData.dataChanged)) {
          this.saveIntervalId = setInterval(async () => {
            if (this.newPersonalData) {
              await this.onSave();
            }
          }, 60000);
        }
      }
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      }
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
      }
    }
  }
}
</script>

<template>
  <div id="patientHistory-management" class="row modal-body" v-if="showPatientHistoryManagement === true && toggles['patient.history.view']">
    <div class="col">
      <div id="patient-history-management-component">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div class="row">
          <!-- MENU-->
          <div class="col-12 col-lg-3 d-none d-md-block">
            <div class="row centered mx-1">
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showPersonalData ? 'btn-selected' : ''"
                @click="onPersonalData">
                {{ $t("patientHistoryView.showPersonalData") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showConsultationReason ? 'btn-selected' : ''"
                @click="onConsultationReason">
                {{ $t("patientHistoryView.showConsultationReason") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showCurrentIllness ? 'btn-selected' : ''"
                @click="onCurrentIllness">
                {{ $t("patientHistoryView.showCurrentIllness") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showPersonalBackground ? 'btn-selected' : ''"
                @click="onPersonalBackground">
                {{ $t("patientHistoryView.showPersonalBackground") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showFamilyBackground ? 'btn-selected' : ''"
                @click="onFamilyBackground">
                {{ $t("patientHistoryView.showFamilyBackground") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showPsychobiologicalHabits ? 'btn-selected' : ''"
                @click="onPsychobiologicalHabits">
                {{ $t("patientHistoryView.showPsychobiologicalHabits") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showFunctionalExam ? 'btn-selected' : ''"
                @click="onFunctionalExam">
                {{ $t("patientHistoryView.showFunctionalExam") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showPhysicalExam ? 'btn-selected' : ''"
                @click="onPhysicalExam">
                {{ $t("patientHistoryView.showPhysicalExam") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showDiagnostic ? 'btn-selected' : ''"
                @click="onDiagnostic">
                {{ $t("patientHistoryView.showDiagnostic") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showMedicalOrder ? 'btn-selected' : ''"
                @click="onMedicalOrder">
                {{ $t("patientHistoryView.showMedicalOrder") }}
              </button>
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="showControl ? 'btn-selected' : ''"
                @click="onControl">
                {{ $t("patientHistoryView.showControl") }}
                <span class="badge bg-warning rounded-pill alert-pending" v-if="pendingControlNumber > 0"> {{ pendingControlNumber }}</span>
              </button>
              <button
                v-if="userType === 'business'"
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                @click="onItensMedicalHistory">
                {{ $t("patientHistoryView.showItensMedicalHistory") }} <i class="bi bi-gear-fill"></i>
              </button>
            </div>
          </div>
          <div class="col-12 col-lg-3 d-block d-md-none">
            <div class="righted menu-mobile">
              <a
                id="menu-mobile-button"
                class="nav-link"
                data-bs-toggle="collapse"
                href="#menu-options-mobile">
                {{ $t("patientHistoryView.menu") }} <i class="bi bi-chevron-down"></i>
              </a>
            </div>
            <div id="menu-options-mobile" class="collapse">
              <div id="menu-options-mobile" class="row centered mx-1">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showPersonalData ? 'btn-selected' : ''"
                  @click="onPersonalData">
                  {{ $t("patientHistoryView.showPersonalData") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showConsultationReason ? 'btn-selected' : ''"
                  @click="onConsultationReason">
                  {{ $t("patientHistoryView.showConsultationReason") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showCurrentIllness ? 'btn-selected' : ''"
                  @click="onCurrentIllness">
                  {{ $t("patientHistoryView.showCurrentIllness") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showPersonalBackground ? 'btn-selected' : ''"
                  @click="onPersonalBackground">
                  {{ $t("patientHistoryView.showPersonalBackground") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showFamilyBackground ? 'btn-selected' : ''"
                  @click="onFamilyBackground">
                  {{ $t("patientHistoryView.showFamilyBackground") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showPsychobiologicalHabits ? 'btn-selected' : ''"
                  @click="onPsychobiologicalHabits">
                  {{ $t("patientHistoryView.showPsychobiologicalHabits") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showFunctionalExam ? 'btn-selected' : ''"
                  @click="onFunctionalExam">
                  {{ $t("patientHistoryView.showFunctionalExam") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showPhysicalExam ? 'btn-selected' : ''"
                  @click="onPhysicalExam">
                  {{ $t("patientHistoryView.showPhysicalExam") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showDiagnostic ? 'btn-selected' : ''"
                  @click="onDiagnostic">
                  {{ $t("patientHistoryView.showDiagnostic") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showMedicalOrder ? 'btn-selected' : ''"
                  @click="onMedicalOrder">
                  {{ $t("patientHistoryView.showMedicalOrder") }}
                </button>
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showControl ? 'btn-selected' : ''"
                  @click="onControl">
                  {{ $t("patientHistoryView.showControl") }}
                  <span class="badge bg-warning rounded-pill alert-pending" v-if="pendingControlNumber > 0"> {{ pendingControlNumber }}</span>
                </button>
                <button
                  v-if="userType === 'business'"
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  @click="onItensMedicalHistory">
                  {{ $t("patientHistoryView.showItensMedicalHistory") }} <i class="bi bi-gear-fill"></i>
                </button>
              </div>
            </div>
          </div>
          <!-- COMPONENTES -->
          <div class="col-12 col-lg-9">
            <div class="row righted mb-2">
              <div class="col-12 col-md-6 centered my-1">
                <div class="metric-card-number">
                  <span v-if="patientHistory.personalData && patientHistory.personalData.name && patientHistory.personalData.lastName">
                    <i class="bi bi-person-fill"> </i> {{ patientHistory.personalData.name }} {{ patientHistory.personalData.lastName }} <br>
                    <span class="badge bg-warning detail-data-badge-title alert-pending"> {{ $t("patientHistoryView.pendingControls") }} {{ pendingControlNumber }}</span>
                  </span>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <button
                  class="col btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="showResume ? 'btn-selected' : ''"
                  @click="onResume()">
                  {{ $t("patientHistoryView.resume") }} <i class="bi bi-file-fill"></i>
                </button>
              </div>
              <div class="col-6 col-md-3">
                <button
                  class="col btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  @click="onSave()">
                  {{ $t("patientHistoryView.save") }} <i class="bi bi-save"></i>
                </button>
              </div>
            </div>
            <div class="row centered blocks-section">
              <div v-if="showResume">
                <PatientResumeForm
                  :patientHistoryData="patientHistory"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                >
                </PatientResumeForm>
              </div>
              <div v-if="showPersonalData">
                <PatientPersonalDataForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newPersonalData"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receivePersonalData"
                >
                </PatientPersonalDataForm>
              </div>
              <div v-if="showConsultationReason">
                <ConsultationReasonForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newConsultationReason"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveConsultationReasonData"
                >
                </ConsultationReasonForm>
              </div>
              <div v-if="showCurrentIllness">
                <CurrentIllnessForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newCurrentIllness"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveCurrentIllnessData"
                >
                </CurrentIllnessForm>
              </div>
              <div v-if="showPersonalBackground">
                <PersonalBackgroundForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newPersonalBackground"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receivePersonalBackgroundData"
                >
                </PersonalBackgroundForm>
              </div>
              <div v-if="showFamilyBackground">
                <FamilyBackgroundForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newFamilyBackground"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveFamilyBackgroundData"
                >
                </FamilyBackgroundForm>
              </div>
              <div v-if="showPsychobiologicalHabits">
                <PsychobiologicalHabitsForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newPsychobiologicalHabits"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :patientHistoryItems="patientHistoryItems"
                  :receiveData="receivePsychobiologicalHabitsData"
                >
                </PsychobiologicalHabitsForm>
              </div>
              <div v-if="showFunctionalExam">
                <FunctionalExamForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newFunctionalExam"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveFunctionalExamData"
                >
                </FunctionalExamForm>
              </div>
              <div v-if="showPhysicalExam">
                <PhysicalExamForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newPhysicalExam"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :patientHistoryItems="patientHistoryItems"
                  :receiveData="receivePhysicalExamData"
                >
                </PhysicalExamForm>
              </div>
              <div v-if="showDiagnostic">
                <DiagnosticForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newDiagnostic"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveDiagnosticData"
                >
                </DiagnosticForm>
              </div>
              <div v-if="showMedicalOrder">
                <MedicalOrderForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newMedicalOrder"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveMedicalOrderData"
                >
                </MedicalOrderForm>
              </div>
              <div v-if="showControl">
                <ControlForm
                  :patientHistoryData="patientHistory"
                  :cacheData="newControl"
                  :commerce="commerce"
                  :toggles="toggles"
                  :errorsAdd="errorsAdd"
                  :receiveData="receiveControlData"
                  :onSave="onSave"
                  :onUpdate="onUpdate"
                >
                </ControlForm>
              </div>
            </div>
            <div class="righted">
              <span class="resume-patient-subtitle" v-if="patientHistory.updatedDate || patientHistory.modifiedAt">
                <span class=""> {{ $t("patientHistoryView.updated") }} </span>
                <span class="mx-1">{{ getDate(patientHistory.modifiedAt || patientHistory.updatedDate) }} </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showPatientHistoryManagement === true && !toggles['patient.history.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')" />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: .2rem;
  padding-bottom: .2rem;
  margin: .2rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: .8rem;
  font-weight: 500;
  line-height: .9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.2rem;
}
.metric-keyword-tag {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: .6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: .8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  font-size: .9rem;
  line-height: .9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.blocks-section {
  overflow-y: scroll;
  max-height: 490px;
  font-size: small;
  margin-bottom: 2rem;
  padding: .5rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  background-color: var(--color-background);
}
.resume-patient-subtitle {
  font-size: .8rem;
  font-style: italic;
}
.show {
  max-height: 2000px !important;
  overflow-y: visible;
}
.menu-mobile {
  font-size: .9rem;
}
.alert-pending {
  color: var(--color-text);
}
</style>