<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getBusinessExecutiveReport } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import { statusWhatsappConnectionById } from '../../application/services/business';
import { getDate } from '../../shared/utils/date';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import CommerceName from '../../components/common/CommerceName.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessExecutiveReport',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    Warning,
    SimpleDownloadCard,
    CommerceName,
    ComponentMenu,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      reports: {},
      extendedEntity: undefined,
      whatsappConnectionStatus: {},
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        const { calculatedReports } = await getBusinessExecutiveReport(
          state.business.id,
          state.startDate,
          state.endDate
        );
        state.reports = calculatedReports;
        await getWhatsappStatus();
        state.toggles = await getPermissions('executive', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const refresh = async () => {
      try {
        loading.value = true;
        const { calculatedReports } = await getBusinessExecutiveReport(
          state.business.id,
          state.startDate,
          state.endDate
        );
        state.reports = calculatedReports;
        await getWhatsappStatus();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const getWhatsappStatus = async () => {
      try {
        loading.value = true;
        const result = await statusWhatsappConnectionById(state.business.id);
        if (result && result.whatsappConnection) {
          state.whatsappConnectionStatus = result.whatsappConnection;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    return {
      state,
      loading,
      alertError,
      getDate,
      refresh,
      goBack,
      isActiveBusiness,
      showUpdateForm,
      getWhatsappStatus,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessExecutiveReport.title`)"
        :toggles="state.toggles"
        component-name="businessExecutiveReport"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessExecutiveReport">
        <div v-if="!loading && isActiveBusiness && state.toggles['executive.admin.view']">
          <div v-if="!loading" id="businessExecutiveReport-result" class="mt-4">
            <div id="resumeBusiness" v-if="state.reports.resume">
              <span class="fw-bold">{{ $t('businessExecutiveReport.resume') }}</span>
              <div class="row mt-1 g-1 resume-box">
                <div>
                  <span class="item-label fw-bold">{{
                    $t('businessExecutiveReport.commerces')
                  }}</span>
                </div>
                <div class="col-4">
                  <div>
                    <span> 📍 {{ state.reports.resume.total || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🟢 {{ state.reports.resume.active || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🔴 {{ state.reports.resume.inactive || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div>
                  <span class="item-label fw-bold">{{ $t('businessExecutiveReport.queues') }}</span>
                </div>
                <div class="col-4">
                  <div>
                    <span> ▶️ {{ state.reports.resume.totalQueues || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🟢 {{ state.reports.resume.totalActiveQueues || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🔴 {{ state.reports.resume.totalInactiveQueues || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div>
                  <span class="item-label fw-bold">{{
                    $t('businessExecutiveReport.modules')
                  }}</span>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🏬 {{ state.reports.resume.totalModules || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🟢 {{ state.reports.resume.totalActiveModules || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🔴 {{ state.reports.resume.totalInactiveModules || 0 }}</span>
                  </div>
                </div>
              </div>
              <div class="row mt-1 g-1 resume-box">
                <div>
                  <span class="item-label fw-bold">{{
                    $t('businessExecutiveReport.collaborators')
                  }}</span>
                </div>
                <div class="col-4">
                  <div>
                    <span> 👤 {{ state.reports.resume.totalCollaborators || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🟢 {{ state.reports.resume.totalActiveCollaborators || 0 }}</span>
                  </div>
                </div>
                <div class="col-4">
                  <div>
                    <span> 🔴 {{ state.reports.resume.totalInactiveCollaborators || 0 }}</span>
                  </div>
                </div>
              </div>
              <div
                class="row mt-1 g-1 resume-box"
                v-if="state.business && state.business.whatsappConnection"
              >
                <div>
                  <span class="item-label fw-bold">{{
                    $t('businessExecutiveReport.whatsapp')
                  }}</span>
                </div>
                <div
                  class="row"
                  v-if="state.whatsappConnectionStatus && state.whatsappConnectionStatus.whatsapp"
                >
                  <div class="col-2 centered">
                    <span> {{ state.whatsappConnectionStatus.connected ? '🟢' : '🔴' }}</span>
                  </div>
                  <div class="col-10">
                    <div class="col">
                      <i class="bi bi-whatsapp"></i>
                      <span class="fw-bold mx-2">
                        {{ state.whatsappConnectionStatus.whatsapp }}
                      </span>
                    </div>
                    <div class="col">
                      <span class="badge detail-data-badge mx-2">
                        <span class="fw-bold detail-data-badge-title">
                          {{ $t('businessConfiguration.id') }}
                        </span>
                        {{ state.whatsappConnectionStatus.idConnection }}
                      </span>
                      <span class="badge detail-data-badge mx-2">
                        <span class="fw-bold detail-data-badge-title">
                          {{ $t('businessConfiguration.lastConnection') }}
                        </span>
                        {{ getDate(state.whatsappConnectionStatus.lastConection) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              id="resumePerCommerce"
              class="mt-4"
              v-if="state.reports.resumeByCommerce && state.reports.resumeByCommerce.length > 0"
            >
              <span class="fw-bold">{{ $t('businessExecutiveReport.resumeByCommerce') }}</span>
              <div
                v-for="(commerce, index) in state.reports.resumeByCommerce"
                :key="index"
                class="result-card"
              >
                <div class="row">
                  <div class="col-10">
                    <CommerceName
                      :name="commerce.businessesName"
                      :tag="commerce.tag"
                      :active="commerce.active"
                    ></CommerceName>
                  </div>
                  <div class="col-2">
                    <a href="#" @click.prevent="showUpdateForm(index)">
                      <i
                        :id="index"
                        :class="`bi ${
                          state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </a>
                  </div>
                </div>
                <div
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                >
                  <div class="row mt-1 g-1 resume-box">
                    <div>
                      <span class="item-label fw-bold">{{
                        $t('businessExecutiveReport.queues')
                      }}</span>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> ▶️ {{ commerce.totalQueues || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🟢 {{ commerce.totalActiveQueues || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🔴 {{ commerce.totalInactiveQueues || 0 }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-1 g-1 resume-box">
                    <div>
                      <span class="item-label fw-bold">{{
                        $t('businessExecutiveReport.modules')
                      }}</span>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🏬 {{ commerce.totalModules || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🟢 {{ commerce.totalActiveModules || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🔴 {{ commerce.totalInactiveModules || 0 }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="row mt-1 g-1 resume-box">
                    <div>
                      <span class="item-label fw-bold">{{
                        $t('businessExecutiveReport.collaborators')
                      }}</span>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 👤 {{ commerce.totalCollaborators || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🟢 {{ commerce.totalActiveCollaborators || 0 }}</span>
                      </div>
                    </div>
                    <div class="col-4">
                      <div>
                        <span> 🔴 {{ commerce.totalInactiveCollaborators || 0 }}</span>
                      </div>
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
            :content="$t('businessExecutiveReport.message.1.content')"
          />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.item-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.sub-item-label {
  line-height: 1rem;
  font-size: 0.9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}

.resume-box {
  background-color: var(--color-background);
  padding: 0.1rem;
  margin: 0.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.module-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
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
</style>
