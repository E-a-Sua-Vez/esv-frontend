<script>
import { ref, toRefs } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import SimpleDownloadButton from '../../reports/SimpleDownloadButton.vue';
import { getDateAndHour, getDate } from '../../../shared/utils/date';
import html2pdf from "html2pdf.js";
import Message from '../../common/Message.vue';
import HistoryDetailsWithItemsCard from '../common/HistoryDetailsWithItemsCard.vue';

export default {
  name: 'PatientResumeForm',
  components: { Warning, Spinner, VueRecaptcha, Toggle, HistoryDetailsCard, SimpleDownloadButton, Message, HistoryDetailsWithItemsCard },
  props: {
    commerce: { type: Object, default: {} },
    patientHistoryData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
  },
  async setup(props) {

    let loading = ref(false);

    const {
      commerce,
      patientHistoryData,
      toggles,
    } = toRefs(props);

    const exportToPDF = async () => {
      loading.value = true;
      const filename = `medical-history.pdf`;
      const options = {
				margin: .5,
  			filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};
      let doc = document.getElementById("patient-history-resume");
      setTimeout(() => {
        html2pdf().set(options).from(doc).save().then(() => {
          doc = undefined;
          loading.value = false;
        }).catch(error => {
          doc = undefined;
          loading.value = false;
        });
      }, 2100);
    }

    return {
      patientHistoryData,
      loading,
      commerce,
      toggles,
      getDateAndHour,
      getDate,
      exportToPDF
    }
  }
}
</script>
<template>
  <div>
    <div id="form">
      <Spinner :show="loading"></Spinner>
      <div v-if="patientHistoryData && patientHistoryData.id">
        <div id="admin-sub-menu" class="row mt-3 mx-0">
          <div class="row righted">
            <SimpleDownloadButton
              :download="toggles['patient.history.download']"
              :showTooltip="false"
              @download="exportToPDF"
              :canDownload="toggles['patient.history.download'] === true"
            ></SimpleDownloadButton>
          </div>
        </div>
        <div id="patient-history-resume">
          <div class="row">
            <div class="centered resume-commerce-title">
              <span>{{ commerce.name }} </span>
            </div>
            <div class="lefted resume-patient-title">
              <span class=""> {{ $t("dashboard.patientHistoryOf") }} </span>
              <span class="mx-1">{{ patientHistoryData.personalData?.name }} </span> <span class="mx-1">{{ patientHistoryData.personalData?.lastName }} </span>
            </div>
            <div class="lefted resume-patient-subtitle" v-if="patientHistoryData.modifiedAt || patientHistoryData.updatedDate">
              <span class=""> {{ $t("patientHistoryView.updated") }} </span>
              <span class="mx-1">{{ getDateAndHour(patientHistoryData.modifiedAt || patientHistoryData.updatedDate) }} </span>
            </div>
          </div>
          <div id="personal-data">
            <div class="row m-1 mb-2">
              <div class="col-12 text-label badge bg-secondary title-section">
                <span>{{ $t("patientHistoryView.showPersonalData") }} <i class="bi bi-person-fill mx-1"></i></span>
              </div>
            </div>
            <div id="patient-name-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.name") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.name || 'N/I' }}
              </div>
            </div>
            <div id="patient-lastName-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.lastName") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.lastName || 'N/I' }}
              </div>
            </div>
            <div id="patient-idNumber-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.idNumber") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.idNumber || 'N/I' }}
              </div>
            </div>
            <div id="patient-birthday-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.birthday") }}
              </div>
              <div class="col-8 lefted">
                {{ getDate(patientHistoryData.personalData?.birthday) || 'N/I' }}
              </div>
            </div>
            <div id="patient-age-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.age") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.age || 'N/I' }}
              </div>
            </div>
            <div id="patient-civilStatus-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.civilStatus") }}
              </div>
              <div class="col-8 lefted">
                {{ $t(`civilStatuses.${patientHistoryData.personalData?.civilStatus}`) || 'N/I' }}
              </div>
            </div>
            <div id="patient-sex-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.sex") }}
              </div>
              <div class="col-8 lefted">
                {{ $t(`sexs.${patientHistoryData.personalData?.sex}`)  || 'N/I' }}
              </div>
            </div>
            <div id="patient-occupation-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.occupation") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.occupation || 'N/I' }}
              </div>
            </div>
            <div id="patient-addressText-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.addressText") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.addressText || 'N/I' }}
              </div>
            </div>
            <div id="patient-addressCode-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.addressCode") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.addressCode || 'N/I' }}
              </div>
            </div>
            <div id="patient-addressComplement-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.addressComplement") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.addressComplement || 'N/I' }}
              </div>
            </div>
            <div id="patient-phone-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.phone") }}
              </div>
              <div class="col-8 lefted">
                {{ patientHistoryData.personalData?.phone || 'N/I' }}
              </div>
            </div>
            <div id="patient-font-form-add" class="row m-1">
              <div class="col-4 text-label lefted">
                {{ $t("patientHistoryView.font") }}
              </div>
              <div class="col-8 lefted">
                {{ $t(`booleans.${patientHistoryData.personalData?.font}`) || 'N/I' }}
              </div>
            </div>
          </div>
          <div id="consultationReason-data">
            <div v-if="patientHistoryData.consultationReason && patientHistoryData.consultationReason.length > 0 && patientHistoryData.consultationReason[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.consultationReason") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.consultationReason" :key="`reason-${index}`">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.reason"
                >
                </HistoryDetailsCard>
              </div>
            </div>
          </div>
          <div id="currentIllness-data">
            <div v-if="patientHistoryData.currentIllness && patientHistoryData.currentIllness.length > 0 && patientHistoryData.currentIllness[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.currentIllness") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.currentIllness" :key="`reason-${index}`">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.illness"
                >
                </HistoryDetailsCard>
              </div>
            </div>
          </div>
          <div id="patientAnamnese-data">
            <div v-if="patientHistoryData?.patientAnamnese">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.patientAnamnese") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-if="toggles['patient.history.view'] && patientHistoryData.patientAnamnese && patientHistoryData.patientAnamnese.habitsDetails" class="">
                <div v-for="item in Object.keys(patientHistoryData.patientAnamnese.habitsDetails)" :key="item.id" class="mx-2">
                  <div class="mx-1 fw-bold lefted"> {{ patientHistoryData.patientAnamnese?.habitsDetails[item]?.title }} </div>
                  <!-- YES NO-->
                  <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics?.yesNo">
                    <div class="lefted mx-3">
                      <span> {{ patientHistoryData.patientAnamnese.habitsDetails[item].answer.answer ? '✅' : '🚫' }}</span>
                    </div>
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.result.join(', ')"
                    >
                    </HistoryDetailsCard>
                  </div>
                  <!-- SELECT N-->
                  <div v-else-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics?.selectN">
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.join(', ')"
                    >
                    </HistoryDetailsCard>
                  </div>
                  <!-- SELECT 1-->
                  <div v-else-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics?.select1">
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer.join(', ')"
                    >
                    </HistoryDetailsCard>
                  </div>
                  <!-- CHECK -->
                  <div v-else-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics?.check">
                    <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.actual">
                      <span class="fw-bold"> {{ $t("businessPatientHistoryItemAdmin.actual") }} </span>
                      <span class="mx-1"> {{ patientHistoryData.patientAnamnese.habitsDetails[item].answer.actual ? '✅' : '🚫' }} </span>
                    </div>
                    <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.ageFrom">
                      <span class="fw-bold"> {{ $t("businessPatientHistoryItemAdmin.ageFrom") }} </span>
                      <span class="mx-1"> {{ patientHistoryData.patientAnamnese.habitsDetails[item].answer.ageFrom }} </span>
                    </div>
                    <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.ageTo">
                      <span class="fw-bold"> {{ $t("businessPatientHistoryItemAdmin.ageTo") }} </span>
                      <span class="mx-1"> {{ patientHistoryData.patientAnamnese.habitsDetails[item].answer.ageTo }} </span>
                    </div>
                    <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer &&
                      patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.frequency">
                      <span class="fw-bold"> {{ $t("businessPatientHistoryItemAdmin.frequency") }} </span>
                      <span class="mx-1"> {{ $t(`patientHistoryItemFrequenciesTypes.${patientHistoryData.patientAnamnese?.habitsDetails[item]?.answer?.frequency}`) }} </span>
                    </div>
                  </div>
                  <!-- COMMENT -->
                  <div v-if="patientHistoryData.patientAnamnese?.habitsDetails[item]?.characteristics?.comment">
                    <HistoryDetailsCard
                      :show="toggles['patient.history.view']"
                      :content="patientHistoryData.patientAnamnese?.habitsDetails[item]?.comment"
                    >
                    </HistoryDetailsCard>
                  </div>
                </div>
              </div>
              <HistoryDetailsCard
                :show="toggles['patient.history.view']"
                :date="patientHistoryData.modifiedAt"
                :content="patientHistoryData.patientAnamnese?.habits"
              >
              </HistoryDetailsCard>
            </div>
          </div>
          <div id="functionalExam-data">
            <div v-if="patientHistoryData?.functionalExam && patientHistoryData.functionalExam.length > 0 && patientHistoryData.functionalExam[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.functionalExam") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.functionalExam" :key="`reason-${index}`">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.exam"
                >
                </HistoryDetailsCard>
              </div>
            </div>
          </div>
          <div id="physicalExam-data">
            <div v-if="patientHistoryData.physicalExam && patientHistoryData.physicalExam.length > 0 && patientHistoryData.physicalExam[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.physicalExam") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.physicalExam" :key="`reason-${index}`">
                <HistoryDetailsWithItemsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :details="element.examDetails"
                  :content="element.exam"
                >
                </HistoryDetailsWithItemsCard>
              </div>
            </div>
          </div>
          <div id="diagnostic-data">
            <div v-if="patientHistoryData.diagnostic && patientHistoryData.diagnostic.length > 0 && patientHistoryData.diagnostic[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.diagnostic") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.diagnostic" :key="`reason-${index}`">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.diagnostic"
                >
                </HistoryDetailsCard>
              </div>
            </div>
          </div>
          <div id="medicalOrder-data">
            <div v-if="patientHistoryData.medicalOrder && patientHistoryData.medicalOrder.length > 0 && patientHistoryData.medicalOrder[0]">
              <div class="row m-1 mb-2">
                <div class="col-12 text-label badge bg-secondary title-section">
                  <span>{{ $t("patientHistoryView.medicalOrder") }} <i class="bi bi-person-fill mx-1"></i></span>
                </div>
              </div>
              <div v-for="(element, index) in patientHistoryData.medicalOrder" :key="`reason-${index}`">
                <HistoryDetailsCard
                  :show="toggles['patient.history.view']"
                  :date="element.createdAt"
                  :content="element.medicalOrder"
                >
                </HistoryDetailsCard>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <Message
          :title="$t('patientHistoryView.message.1.title')"
          :content="$t('patientHistoryView.message.1.content')" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.title-section {
  font-size: .8rem;
}
.resume-commerce-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
}
.resume-patient-title {
  font-size: 1rem;
  font-style: italic;
}
.resume-patient-subtitle {
  font-size: .8rem;
  font-style: italic;
}
</style>