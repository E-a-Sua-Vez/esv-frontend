<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getAttentionsReport, getNotifications, getSurveysReport, getBookingsReport, getWaitlistsReport } from '../../application/services/query-stack';
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

export default {
  name: 'BusinessReports',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ToggleCapabilities, Warning, SimpleDownloadCard },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0,10),
      endDate: new Date().toISOString().slice(0,10),
      reports: ref({}),
      commerce: {},
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.toggles = await getPermissions('reports', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const downloadAttentionsReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = await getAttentionsReport(state.commerce.id, state.startDate, state.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `attentions-${state.commerce.tag}-${state.startDate}-${state.endDate}.csv`;
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

    const downloadNotificationsReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = await getNotifications(state.commerce.id, state.startDate, state.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `notifications-${state.commerce.tag}-${state.startDate}-${state.endDate}.csv`;
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

    const downloadSurveysReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = await getSurveysReport(state.commerce.id, state.startDate, state.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `surveys-${state.commerce.tag}-${state.startDate}-${state.endDate}.csv`;
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

    const downloadBookingsReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = await getBookingsReport(state.commerce.id, state.startDate, state.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `bookings-${state.commerce.tag}-${state.startDate}-${state.endDate}.csv`;
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

    const downloadWaitlistsReport = async () => {
      try {
        loading.value = true;
        let csvAsBlob = [];
        const result = await getWaitlistsReport(state.commerce.id, state.startDate, state.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `waitlist-${state.commerce.tag}-${state.startDate}-${state.endDate}.csv`;
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

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      selectCommerce,
      downloadAttentionsReport,
      downloadNotificationsReport,
      downloadSurveysReport,
      downloadBookingsReport,
      downloadWaitlistsReport
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()">{{ $t("businessReports.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessReports.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessReports"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessReports">
        <div v-if="isActiveBusiness() && state.toggles['reports.admin.view']">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('businessReports.message.3.title')"
              :content="$t('businessReports.message.3.content')" />
          </div>
          <div v-else id="businessReports-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces">
                <span>{{ $t("businessReports.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="reports">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
            </div>
            <div class="row">
              <div class="col-6">
                <input id="startDate" class="form-control metric-controls" type="date" v-model="state.startDate"/>
              </div>
              <div class="col-6">
                <input id="endDate" class="form-control metric-controls" type="date" v-model="state.endDate"/>
              </div>
            </div>
            <div v-if="!loading" id="businessReports-result" class="mt-4">
              <div>
                <SimpleDownloadCard
                  :show="state.toggles['reports.admin.attentions']"
                  :canDonwload="state.toggles['reports.admin.attentions']"
                  :title="$t('businessReports.items.reports.1.name')"
                  :showTooltip="true"
                  :description="$t('businessReports.items.reports.1.description')"
                  :icon="'bi-qr-code'"
                  :iconStyleClass="'blue-icon'"
                  @download="downloadAttentionsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="state.toggles['reports.admin.notifications']"
                  :canDonwload="state.toggles['reports.admin.notifications']"
                  :title="$t('businessReports.items.reports.2.name')"
                  :showTooltip="true"
                  :description="$t('businessReports.items.reports.2.description')"
                  :icon="'bi-send-check-fill'"
                  :iconStyleClass="'blue-icon'"
                  @download="downloadNotificationsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="state.toggles['reports.admin.surveys']"
                  :canDonwload="state.toggles['reports.admin.surveys']"
                  :title="$t('businessReports.items.reports.3.name')"
                  :showTooltip="true"
                  :description="$t('businessReports.items.reports.3.description')"
                  :icon="'bi-star-fill'"
                  :iconStyleClass="'yellow-icon'"
                  @download="downloadSurveysReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="state.toggles['reports.admin.bookings']"
                  :canDonwload="state.toggles['reports.admin.bookings']"
                  :title="$t('businessReports.items.reports.4.name')"
                  :showTooltip="true"
                  :description="$t('businessReports.items.reports.4.description')"
                  :icon="'bi-calendar2-check-fill'"
                  :iconStyleClass="'orange-icon'"
                  @download="downloadBookingsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="state.toggles['reports.admin.waitlists']"
                  :canDonwload="state.toggles['reports.admin.waitlists']"
                  :title="$t('businessReports.items.reports.5.name')"
                  :showTooltip="true"
                  :description="$t('businessReports.items.reports.5.description')"
                  :icon="'bi-calendar-heart-fill'"
                  :iconStyleClass="'red-icon'"
                  @download="downloadWaitlistsReport"
                ></SimpleDownloadCard>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['reports.admin.view']) && !loading">
          <Message
            :title="$t('businessReports.message.1.title')"
            :content="$t('businessReports.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.module-card {
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