<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getBusinessById } from '../../application/services/business';
import { getBusinessExecutiveReport } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import CommerceName from '../../components/common/CommerceName.vue';

export default {
  name: 'BusinessExecutiveReport',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ToggleCapabilities, Warning, SimpleDownloadCard, CommerceName },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0,10),
      endDate: new Date().toISOString().slice(0,10),
      reports: {},
      extendedEntity: undefined,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getCurrentBusiness;
        if (state.currentUser.businessId) {
          state.business = await getBusinessById(state.currentUser.businessId);
        }
        store.setCurrentBusiness(state.business);
        const { calculatedReports } = await getBusinessExecutiveReport(state.business.id, state.startDate, state.endDate);
        state.reports = calculatedReports;
        state.toggles = await getPermissions('executive', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const downloadAttentionsReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = state.reports.resumeByCommerce;
        if (result && result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `executive-report-${state.business.keyName}-${state.startDate}-${state.endDate}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const refresh = async () => {
      try {
        loading.value = true;
        const { calculatedReports } = await getBusinessExecutiveReport(state.business.id, state.startDate, state.endDate);
        state.reports = calculatedReports;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    return {
      state,
      loading,
      alertError,
      refresh,
      goBack,
      isActiveBusiness,
      downloadAttentionsReport,
      showUpdateForm
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()">{{ $t("businessExecutiveReport.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessExecutiveReport.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessExecutiveReport"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessExecutiveReport">
        <div v-if="!loading &&isActiveBusiness && state.toggles['executive.admin.view']">
          <div id="businessExecutiveReport-controls" class="control-box">
            <div class="row">
              <div class="col-6">
                <input id="startDate" class="form-control metric-controls" type="date" v-model="state.startDate"/>
              </div>
              <div class="col-6">
                <input id="endDate" class="form-control metric-controls" type="date" v-model="state.endDate"/>
              </div>
              <div class="col">
                <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2  px-4" @click="refresh()"><i class="bi bi-search"></i> {{ $t("dashboard.refresh") }}</a>
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessExecutiveReport-result" class="mt-4">
            <div>
              <SimpleDownloadCard
                :download="state.toggles['executive.admin.download']"
                :title="$t('businessExecutiveReport.items.reports.1.name')"
                :showTooltip="true"
                :description="$t('businessExecutiveReport.items.reports.1.description')"
                :icon="'bi-file-earmark-spreadsheet'"
                @download="downloadAttentionsReport"
              ></SimpleDownloadCard>
            </div>
            <div id="resumeBusiness" v-if="state.reports.resume">
              <span class="fw-bold">{{ $t("businessExecutiveReport.resume") }}</span>
              <div class="row mt-1 g-1 resume-box">
                <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.activity") }}</span></div>
                <div class="col-4">
                  <div><span class="sub-item-label">{{ $t("businessExecutiveReport.attentions") }}</span></div>
                  <div><span> <i class="bi bi-qr-code blue-icon"></i> {{ state.reports.resume.totalAttentions || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span class="sub-item-label">{{ $t("businessExecutiveReport.enquetes") }}</span></div>
                  <div><span> <i class="bi bi-star yellow-icon"></i> {{ state.reports.resume.totalSurveys || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span class="sub-item-label">{{ $t("businessExecutiveReport.notifications") }}</span></div>
                  <div><span> <i class="bi bi-send-check blue-icon"></i> {{ state.reports.resume.totalNotifications || 0 }}</span></div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.commerces") }}</span></div>
                <div class="col-4">
                  <div><span> 📍 {{ state.reports.resume.total || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🟢 {{ state.reports.resume.active || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🔴 {{ state.reports.resume.inactive || 0 }}</span></div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.queues") }}</span></div>
                <div class="col-4">
                  <div><span> ▶️ {{ state.reports.resume.totalQueues || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🟢 {{ state.reports.resume.totalActiveQueues || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🔴 {{ state.reports.resume.totalInactiveQueues || 0 }}</span></div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.modules") }}</span></div>
                <div class="col-4">
                  <div><span> 🏬 {{ state.reports.resume.totalModules || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🟢 {{ state.reports.resume.totalActiveModules || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🔴 {{ state.reports.resume.totalInactiveModules || 0 }}</span></div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.collaborators") }}</span></div>
                <div class="col-4">
                  <div><span> 👤 {{ state.reports.resume.totalCollaborators || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🟢 {{ state.reports.resume.totalActiveCollaborators || 0 }}</span></div>
                </div>
                <div class="col-4">
                  <div><span> 🔴 {{ state.reports.resume.totalInactiveCollaborators || 0 }}</span></div>
                </div>
              </div>
            </div>
            <div id="resumePerCommerce" v-if="state.reports.resumeByCommerce && state.reports.resumeByCommerce.length > 0">
              <span class="fw-bold">{{ $t("businessExecutiveReport.resumeByCommerce") }}</span>
              <div v-for="(commerce, index) in state.reports.resumeByCommerce" :key="index" class="commerce-card">
                <div class="row">
                  <div class="col-10">
                    <CommerceName :name="commerce.businessesName" :tag="commerce.tag" :active="commerce.active"></CommerceName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row mt-1 g-1 resume-box">
                    <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.activity") }}</span></div>
                    <div class="col-4">
                      <div><span class="sub-item-label">{{ $t("businessExecutiveReport.attentions") }}</span></div>
                      <div><span> <i class="bi bi-qr-code blue-icon"></i> {{ commerce.totalAttentions || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span class="sub-item-label">{{ $t("businessExecutiveReport.enquetes") }}</span></div>
                      <div><span> <i class="bi bi-star yellow-icon"></i> {{ commerce.totalSurveys || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span class="sub-item-label">{{ $t("businessExecutiveReport.notifications") }}</span></div>
                      <div><span> <i class="bi bi-send-check blue-icon"></i> {{ commerce.totalNotifications || 0 }}</span></div>
                    </div>
                  </div>
                  <div class="row mt-1 g-1 resume-box">
                    <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.queues") }}</span></div>
                    <div class="col-4">
                      <div><span> ▶️ {{ commerce.totalQueues || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🟢 {{ commerce.totalActiveQueues || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🔴 {{ commerce.totalInactiveQueues || 0 }}</span></div>
                    </div>
                  </div>
                  <div class="row mt-1 g-1 resume-box">
                    <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.modules") }}</span></div>
                    <div class="col-4">
                      <div><span> 🏬 {{ commerce.totalModules || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🟢 {{ commerce.totalActiveModules || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🔴 {{ commerce.totalInactiveModules || 0 }}</span></div>
                    </div>
                  </div>
                  <div class="row mt-1 g-1 resume-box">
                    <div><span class="item-label fw-bold">{{ $t("businessExecutiveReport.collaborators") }}</span></div>
                    <div class="col-4">
                      <div><span> 👤 {{ commerce.totalCollaborators || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🟢 {{ commerce.totalActiveCollaborators || 0 }}</span></div>
                    </div>
                    <div class="col-4">
                      <div><span> 🔴 {{ commerce.totalInactiveCollaborators || 0 }}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['executive.admin.view']) && !loading">
          <Message
            :title="$t('businessExecutiveReport.message.1.title')"
            :content="$t('businessExecutiveReport.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.item-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.sub-item-label {
  line-height: 1rem;
  font-size: .9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.commerce-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.resume-box {
  background-color: var(--color-background);
  padding: .1rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.module-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
}
</style>