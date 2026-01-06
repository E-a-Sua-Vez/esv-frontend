<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getBusinessExecutiveReport } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import { statusWhatsappConnectionById } from '../../application/services/business';
import { getBusinessLogoUrl } from '../../application/services/business-logo';
import {
  getTelemedicineStatistics,
  getTelemedicineHealthMetrics,
} from '../../application/services/telemedicine';
import { getDate } from '../../shared/utils/date';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import CommerceName from '../../components/common/CommerceName.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessExecutiveReport',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    SimpleDownloadCard,
    CommerceName,
    ComponentMenu,
    DesktopPageHeader,
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
      telemedicineStats: null,
      telemedicineHealth: null,
      toggles: {},
      businessLogoUrl: null,
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
        await getTelemedicineMonitoring();
        await loadBusinessLogo();
        state.toggles = await getPermissions('executive', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error?.response?.status || error?.status || 500;
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
        await getTelemedicineMonitoring();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error?.response?.status || error?.status || 500;
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

    const getTelemedicineMonitoring = async () => {
      try {
        const [stats, health] = await Promise.all([
          getTelemedicineStatistics(),
          getTelemedicineHealthMetrics(),
        ]);
        state.telemedicineStats = stats?.sessions || null;
        state.telemedicineHealth = health || null;
      } catch (error) {
        // Silently fail - telemedicine monitoring is optional
        state.telemedicineStats = null;
        state.telemedicineHealth = null;
      }
    };

    // Load business logo from Firebase Storage
    const loadBusinessLogo = async () => {
      if (!state.business || !state.business.logo) {
        return;
      }

      // If it's a business-logo path (Firebase Storage), load the URL
      if (state.business.logo.startsWith('/business-logos/')) {
        const parts = state.business.logo.split('/');
        if (parts.length === 4) {
          const businessId = parts[2];
          const logoId = parts[3];
          try {
            const logoUrl = await getBusinessLogoUrl(businessId, logoId);
            if (logoUrl) {
              state.businessLogoUrl = logoUrl;
            }
          } catch (error) {
            console.error('Error loading business logo:', error);
          }
        }
      } else {
        // Use static logo URL
        state.businessLogoUrl = state.business.logo;
      }
    };

    // Helper methods for modern dashboard
    const calculateHealthPercentage = (active, total) => {
      if (!total || total === 0) return 0;
      return Math.round((active / total) * 100);
    };

    const getStatusClass = percentage => {
      if (percentage >= 80) return 'status-healthy';
      if (percentage >= 50) return 'status-warning';
      return 'status-critical';
    };

    const getStatusIcon = percentage => {
      if (percentage >= 80) return 'bi-check-circle-fill';
      if (percentage >= 50) return 'bi-exclamation-circle-fill';
      return 'bi-x-circle-fill';
    };

    const getHealthColor = percentage => {
      if (percentage >= 80) return '#00c2cb';
      if (percentage >= 50) return '#f9c322';
      return '#a52a2a';
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
      getTelemedicineMonitoring,
      loadBusinessLogo,
      calculateHealthPercentage,
      getStatusClass,
      getStatusIcon,
      getHealthColor,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business.logo" :business-id="state.business?.id" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessExecutiveReport.title`)"
          :toggles="state.toggles"
          component-name="businessExecutiveReport"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessExecutiveReport">
          <div v-if="!loading && isActiveBusiness && state.toggles['executive.admin.view']">
            <div v-if="!loading" id="businessExecutiveReport-result" class="mt-4">
              <!-- System Health Overview Section -->
              <div id="systemHealthOverview" v-if="state.reports.resume" class="mb-4">
                <h3 class="system-status-title mb-4">
                  <i class="bi bi-activity me-2"></i>
                  {{ $t('businessExecutiveReport.resume') || 'System Status Overview' }}
                </h3>

                <!-- Main Health Metrics Grid -->
                <div class="row g-3 mb-4">
                  <!-- Commerces Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.active,
                            state.reports.resume.total
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-shop"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.active,
                                state.reports.resume.total
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.commerces') || 'Commerces' }}
                        </h4>
                        <div class="health-metric-large">{{ state.reports.resume.total || 0 }}</div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.active || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.inactive || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.active,
                              state.reports.resume.total
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Queues Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveQueues,
                            state.reports.resume.totalQueues
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-list-ul"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveQueues,
                                state.reports.resume.totalQueues
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.queues') || 'Queues' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalQueues || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveQueues || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.totalInactiveQueues || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveQueues,
                              state.reports.resume.totalQueues
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Modules Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveModules,
                            state.reports.resume.totalModules
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-puzzle"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveModules,
                                state.reports.resume.totalModules
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.modules') || 'Modules' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalModules || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveModules || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.totalInactiveModules || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveModules,
                              state.reports.resume.totalModules
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Collaborators Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveCollaborators,
                            state.reports.resume.totalCollaborators
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-people"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveCollaborators,
                                state.reports.resume.totalCollaborators
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.collaborators') || 'Collaborators' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalCollaborators || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveCollaborators || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{
                              state.reports.resume.totalInactiveCollaborators || 0
                            }}
                            Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveCollaborators,
                              state.reports.resume.totalCollaborators
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- WhatsApp Connection Status Card -->
                <div
                  v-if="
                    state.business &&
                    state.business.whatsappConnection &&
                    state.whatsappConnectionStatus &&
                    state.whatsappConnectionStatus.whatsapp
                  "
                  class="mb-4"
                >
                  <div class="system-health-card status-integration">
                    <div class="health-card-header">
                      <div class="health-icon-container">
                        <i class="bi bi-whatsapp"></i>
                      </div>
                      <div
                        class="health-status-badge"
                        :style="{
                          backgroundColor: state.whatsappConnectionStatus.connected
                            ? '#00c2cb'
                            : '#a52a2a',
                        }"
                      >
                        <i
                          :class="
                            state.whatsappConnectionStatus.connected
                              ? 'bi-check-circle-fill'
                              : 'bi-x-circle-fill'
                          "
                        ></i>
                      </div>
                    </div>
                    <div class="health-card-body">
                      <h4 class="health-card-title">
                        {{ $t('businessExecutiveReport.whatsapp') || 'WhatsApp Integration' }}
                      </h4>
                      <div class="health-metric-details mb-2">
                        <span class="fw-bold">{{ state.whatsappConnectionStatus.whatsapp }}</span>
                        <span class="health-separator mx-2">•</span>
                        <span
                          :class="
                            state.whatsappConnectionStatus.connected
                              ? 'health-active'
                              : 'health-inactive'
                          "
                        >
                          {{
                            state.whatsappConnectionStatus.connected ? 'Connected' : 'Disconnected'
                          }}
                        </span>
                      </div>
                      <div class="health-metric-details">
                        <span class="badge bg-secondary me-2">
                          ID: {{ state.whatsappConnectionStatus.idConnection }}
                        </span>
                        <span class="badge bg-light text-dark">
                          Last: {{ getDate(state.whatsappConnectionStatus.lastConection) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Commerce Details Section -->
              <div
                id="resumePerCommerce"
                class="mt-5"
                v-if="state.reports.resumeByCommerce && state.reports.resumeByCommerce.length > 0"
              >
                <h3 class="system-status-title mb-4">
                  <i class="bi bi-building me-2"></i>
                  {{ $t('businessExecutiveReport.resumeByCommerce') || 'Commerce Details' }}
                </h3>
                <div class="row g-3">
                  <div
                    v-for="(commerce, index) in state.reports.resumeByCommerce"
                    :key="index"
                    class="col-12 col-md-6 col-lg-4"
                  >
                    <div
                      class="commerce-detail-card"
                      :class="{ 'card-expanded': state.extendedEntity === index }"
                    >
                      <div class="commerce-card-header" @click="showUpdateForm(index)">
                        <div class="commerce-card-title-section">
                          <div
                            class="commerce-status-indicator"
                            :class="commerce.active ? 'status-active' : 'status-inactive'"
                          ></div>
                          <div>
                            <h5 class="commerce-name">
                              {{ commerce.businessesName || commerce.tag }}
                            </h5>
                            <span class="commerce-tag">{{ commerce.tag }}</span>
                          </div>
                        </div>
                        <button class="commerce-toggle-btn">
                          <i
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </button>
                      </div>
                      <div
                        class="commerce-card-body"
                        :class="{ expanded: state.extendedEntity === index }"
                      >
                        <!-- Queues -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-list-ul"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.queues') || 'Queues'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalQueues || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveQueues || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveQueues || 0 }} Inactive</span
                              >
                            </div>
                          </div>
                        </div>
                        <!-- Modules -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-puzzle"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.modules') || 'Modules'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalModules || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveModules || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveModules || 0 }} Inactive</span
                              >
                            </div>
                          </div>
                        </div>
                        <!-- Collaborators -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-people"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.collaborators') || 'Collaborators'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalCollaborators || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveCollaborators || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveCollaborators || 0 }} Inactive</span
                              >
                            </div>
                          </div>
                        </div>
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
    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessExecutiveReport.title')"
          :toggles="state.toggles"
          component-name="businessExecutiveReport"
          @go-back="goBack"
        />
        <div id="businessExecutiveReport">
          <div v-if="!loading && isActiveBusiness && state.toggles['executive.admin.view']">
            <div v-if="!loading" id="businessExecutiveReport-result" class="mt-4">
              <!-- System Health Overview Section -->
              <div id="systemHealthOverview" v-if="state.reports.resume" class="mb-4">
                <h3 class="system-status-title mb-4">
                  <i class="bi bi-activity me-2"></i>
                  {{ $t('businessExecutiveReport.resume') || 'System Status Overview' }}
                </h3>

                <!-- Main Health Metrics Grid -->
                <div class="row g-3 mb-4">
                  <!-- Commerces Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.active,
                            state.reports.resume.total
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-shop"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.active,
                                state.reports.resume.total
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.commerces') || 'Commerces' }}
                        </h4>
                        <div class="health-metric-large">{{ state.reports.resume.total || 0 }}</div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.active || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.inactive || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.active,
                                  state.reports.resume.total
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.active,
                              state.reports.resume.total
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Queues Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveQueues,
                            state.reports.resume.totalQueues
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-list-ul"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveQueues,
                                state.reports.resume.totalQueues
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.queues') || 'Queues' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalQueues || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveQueues || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.totalInactiveQueues || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveQueues,
                                  state.reports.resume.totalQueues
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveQueues,
                              state.reports.resume.totalQueues
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Modules Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveModules,
                            state.reports.resume.totalModules
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-puzzle"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveModules,
                                state.reports.resume.totalModules
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.modules') || 'Modules' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalModules || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveModules || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{ state.reports.resume.totalInactiveModules || 0 }} Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveModules,
                                  state.reports.resume.totalModules
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveModules,
                              state.reports.resume.totalModules
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Collaborators Health Card -->
                  <div class="col-12 col-md-6 col-lg-3">
                    <div
                      class="system-health-card"
                      :class="
                        getStatusClass(
                          calculateHealthPercentage(
                            state.reports.resume.totalActiveCollaborators,
                            state.reports.resume.totalCollaborators
                          )
                        )
                      "
                    >
                      <div class="health-card-header">
                        <div class="health-icon-container">
                          <i class="bi bi-people"></i>
                        </div>
                        <div
                          class="health-status-badge"
                          :style="{
                            backgroundColor: getHealthColor(
                              calculateHealthPercentage(
                                state.reports.resume.totalActiveCollaborators,
                                state.reports.resume.totalCollaborators
                              )
                            ),
                          }"
                        >
                          <i
                            :class="
                              getStatusIcon(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                )
                              )
                            "
                          ></i>
                        </div>
                      </div>
                      <div class="health-card-body">
                        <h4 class="health-card-title">
                          {{ $t('businessExecutiveReport.collaborators') || 'Collaborators' }}
                        </h4>
                        <div class="health-metric-large">
                          {{ state.reports.resume.totalCollaborators || 0 }}
                        </div>
                        <div class="health-metric-details">
                          <span class="health-active"
                            >{{ state.reports.resume.totalActiveCollaborators || 0 }} Active</span
                          >
                          <span class="health-separator">•</span>
                          <span class="health-inactive"
                            >{{
                              state.reports.resume.totalInactiveCollaborators || 0
                            }}
                            Inactive</span
                          >
                        </div>
                        <div class="health-progress-bar">
                          <div
                            class="health-progress-fill"
                            :style="{
                              width:
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                ) + '%',
                              backgroundColor: getHealthColor(
                                calculateHealthPercentage(
                                  state.reports.resume.totalActiveCollaborators,
                                  state.reports.resume.totalCollaborators
                                )
                              ),
                            }"
                          ></div>
                        </div>
                        <div class="health-percentage">
                          {{
                            calculateHealthPercentage(
                              state.reports.resume.totalActiveCollaborators,
                              state.reports.resume.totalCollaborators
                            )
                          }}% Health
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- WhatsApp Connection Status Card -->
                <div
                  v-if="
                    state.business &&
                    state.business.whatsappConnection &&
                    state.whatsappConnectionStatus &&
                    state.whatsappConnectionStatus.whatsapp
                  "
                  class="mb-4"
                >
                  <div class="system-health-card status-integration">
                    <div class="health-card-header">
                      <div class="health-icon-container">
                        <i class="bi bi-whatsapp"></i>
                      </div>
                      <div
                        class="health-status-badge"
                        :style="{
                          backgroundColor: state.whatsappConnectionStatus.connected
                            ? '#00c2cb'
                            : '#a52a2a',
                        }"
                      >
                        <i
                          :class="
                            state.whatsappConnectionStatus.connected
                              ? 'bi-check-circle-fill'
                              : 'bi-x-circle-fill'
                          "
                        ></i>
                      </div>
                    </div>
                    <div class="health-card-body">
                      <h4 class="health-card-title">
                        {{ $t('businessExecutiveReport.whatsapp') || 'WhatsApp Integration' }}
                      </h4>
                      <div class="health-metric-details mb-2">
                        <span class="fw-bold">{{ state.whatsappConnectionStatus.whatsapp }}</span>
                        <span class="health-separator mx-2">•</span>
                        <span
                          :class="
                            state.whatsappConnectionStatus.connected
                              ? 'health-active'
                              : 'health-inactive'
                          "
                        >
                          {{
                            state.whatsappConnectionStatus.connected ? 'Connected' : 'Disconnected'
                          }}
                        </span>
                      </div>
                      <div class="health-metric-details">
                        <span class="badge bg-secondary me-2">
                          ID: {{ state.whatsappConnectionStatus.idConnection }}
                        </span>
                        <span class="badge bg-light text-dark">
                          Last: {{ getDate(state.whatsappConnectionStatus.lastConection) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Commerce Details Section -->
              <div
                id="resumePerCommerce"
                class="mt-5"
                v-if="state.reports.resumeByCommerce && state.reports.resumeByCommerce.length > 0"
              >
                <h3 class="system-status-title mb-4">
                  <i class="bi bi-building me-2"></i>
                  {{ $t('businessExecutiveReport.resumeByCommerce') || 'Commerce Details' }}
                </h3>
                <div class="row g-3">
                  <div
                    v-for="(commerce, index) in state.reports.resumeByCommerce"
                    :key="index"
                    class="col-12 col-md-6 col-lg-4"
                  >
                    <div
                      class="commerce-detail-card"
                      :class="{ 'card-expanded': state.extendedEntity === index }"
                    >
                      <div class="commerce-card-header" @click="showUpdateForm(index)">
                        <div class="commerce-card-title-section">
                          <div
                            class="commerce-status-indicator"
                            :class="commerce.active ? 'status-active' : 'status-inactive'"
                          ></div>
                          <div>
                            <h5 class="commerce-name">
                              {{ commerce.businessesName || commerce.tag }}
                            </h5>
                            <span class="commerce-tag">{{ commerce.tag }}</span>
                          </div>
                        </div>
                        <button class="commerce-toggle-btn">
                          <i
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </button>
                      </div>
                      <div
                        class="commerce-card-body"
                        :class="{ expanded: state.extendedEntity === index }"
                      >
                        <!-- Queues -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-list-ul"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.queues') || 'Queues'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalQueues || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveQueues || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveQueues || 0 }} Inactive</span
                              >
                            </div>
                          </div>
                        </div>
                        <!-- Modules -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-puzzle"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.modules') || 'Modules'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalModules || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveModules || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveModules || 0 }} Inactive</span
                              >
                            </div>
                          </div>
                        </div>
                        <!-- Collaborators -->
                        <div class="commerce-metric-row">
                          <div class="commerce-metric-icon">
                            <i class="bi bi-people"></i>
                          </div>
                          <div class="commerce-metric-info">
                            <span class="commerce-metric-label">{{
                              $t('businessExecutiveReport.collaborators') || 'Collaborators'
                            }}</span>
                            <div class="commerce-metric-values">
                              <span class="commerce-metric-total">{{
                                commerce.totalCollaborators || 0
                              }}</span>
                              <span class="commerce-metric-active"
                                >{{ commerce.totalActiveCollaborators || 0 }} Active</span
                              >
                              <span class="commerce-metric-inactive"
                                >{{ commerce.totalInactiveCollaborators || 0 }} Inactive</span
                              >
                            </div>
                          </div>
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
    </div>
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

/* Desktop Header Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
  }

  .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
  }
}

/* Modern System Health Dashboard Styles */
.system-status-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
}

/* System Health Cards */
.system-health-card {
  background: #ffffff;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  height: 100%;
}

.system-health-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.1);
}

.system-health-card.status-healthy {
  border-left: 4px solid #00c2cb;
}

.system-health-card.status-warning {
  border-left: 4px solid #f9c322;
}

.system-health-card.status-critical {
  border-left: 4px solid #a52a2a;
}

.health-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.health-icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.health-status-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
}

.health-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.health-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin: 0;
}

.health-metric-large {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.health-metric-details {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.health-active {
  color: #00c2cb;
  font-weight: 600;
}

.health-inactive {
  color: #a52a2a;
  font-weight: 500;
}

.health-separator {
  color: rgba(0, 0, 0, 0.3);
}

.health-progress-bar {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.health-progress-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.5s ease;
}

.health-percentage {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  margin-top: 0.25rem;
}

/* Commerce Detail Cards */
.commerce-detail-card {
  background: #ffffff;
  padding: 1.25rem;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
  cursor: pointer;
}

.commerce-detail-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.1);
}

.commerce-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.commerce-card-title-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.commerce-status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.commerce-status-indicator.status-active {
  background-color: #00c2cb;
  box-shadow: 0 0 0 4px rgba(0, 194, 203, 0.2);
}

.commerce-status-indicator.status-inactive {
  background-color: #a52a2a;
  box-shadow: 0 0 0 4px rgba(165, 42, 42, 0.2);
}

.commerce-name {
  font-size: 1rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  margin: 0;
  line-height: 1.3;
}

.commerce-tag {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 500;
}

.commerce-toggle-btn {
  background: none;
  border: none;
  color: rgba(0, 0, 0, 0.5);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: all 0.2s ease;
}

.commerce-toggle-btn:hover {
  color: var(--azul-turno);
  transform: scale(1.1);
}

.commerce-card-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.commerce-card-body.expanded {
  max-height: 500px;
}

.commerce-metric-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.commerce-metric-row:last-child {
  border-bottom: none;
}

.commerce-metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(0, 74, 173, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-turno);
  font-size: 1.1rem;
  flex-shrink: 0;
}

.commerce-metric-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.commerce-metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.commerce-metric-values {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
}

.commerce-metric-total {
  font-weight: 700;
  color: var(--color-text);
  font-size: 1rem;
}

.commerce-metric-active {
  color: #00c2cb;
  font-weight: 500;
}

.commerce-metric-inactive {
  color: #a52a2a;
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .system-health-card {
    padding: 1.25rem;
  }

  .health-metric-large {
    font-size: 1.75rem;
  }

  .system-status-title {
    font-size: 1.25rem;
  }
}
</style>
