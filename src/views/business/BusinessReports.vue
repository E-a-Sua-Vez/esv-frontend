<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getAttentionsReport,
  getNotificationsReport,
  getSurveysReport,
  getBookingsReport,
  getWaitlistsReport,
  getClientsReport,
  getClientContactsReport,
  getBookingPaymentsResume,
  getAttentionPaymentsResume,
  getAttentionProductsResume,
  getIncomesResume,
  getOutcomesResume,
} from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import jsonToCsv from '../../shared/utils/jsonToCsv';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'BusinessReports',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    SimpleDownloadCard,
    ComponentMenu,
    DesktopContentLayout,
    DesktopFiltersPanel,
    DesktopPageHeader,
    DateRangeFilters,
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
      reports: ref({}),
      toggles: {},
      format: 'csv',
      // Filter state for desktop layout
      filtersCollapsed: false,
      allCommerces: ref([]),
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Compute selectedCommerces as array of IDs for reports
    const selectedCommerces = computed(() => {
      if (commerce.value && commerce.value.id) {
        return [commerce.value.id];
      }
      return [];
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);
        state.toggles = await getPermissions('reports', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const handleCommerceChanged = async commerce => {
      // Commerce is now managed globally
      if (commerce && commerce.id && commerce.id !== 'ALL') {
        await store.setCurrentCommerce(commerce);
      }
    };

    const downloadReport = (data, prefix) => {
      try {
        loading.value = true;
        let dataAsBlob = [];
        if (data && data.length > 0) {
          if (state.format === 'csv') {
            dataAsBlob = jsonToCsv(data);
          } else if (state.format === 'json') {
            dataAsBlob = JSON.stringify(data);
          } else if (state.format === 'xls') {
            dataAsBlob = jsonToCsv(data);
          }
        }
        const blobURL = URL.createObjectURL(new Blob([dataAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `${prefix}-${commerce.value.tag}-${state.startDate}-${state.endDate}.${state.format}`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadAttentionsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getAttentionsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'attentions');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadNotificationsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getNotificationsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'notifications');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadSurveysReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getSurveysReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'surveys');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadBookingsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getBookingsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'bookings');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadWaitlistsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getWaitlistsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'waitlist');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadClientsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getClientsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'clients');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadClientContactsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getClientContactsReport(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'client-contacts');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadBookingPaymentsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getBookingPaymentsResume(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'booking-payments');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadAttentionPaymentsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getAttentionPaymentsResume(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'attention-payments');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadAttentionProductsReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getAttentionProductsResume(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'attention-products');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadIncomesReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getIncomesResume(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'incomes');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const downloadOutcomesReport = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const result = await getOutcomesResume(
          commerce.value.id,
          state.selectedCommerces,
          state.startDate,
          state.endDate
        );
        downloadReport(result, 'outcomes');
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || error.message || 500;
        loading.value = false;
      }
    };

    const getToday = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      state.startDate = `${year}-${month}-${day}`;
      state.endDate = `${year}-${month}-${day}`;
    };

    const getCurrentMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      state.startDate = `${year}-${month}-01`;
      state.endDate = `${year}-${month}-${day}`;
    };

    const getLastMonth = async () => {
      const date = new Date().toISOString().slice(0, 10);
      state.startDate = new DateModel(date).substractMonths(1).toString();
      state.endDate = new DateModel(state.startDate).endOfMonth().toString();
    };

    const getLastThreeMonths = async () => {
      const date = new Date().toISOString().slice(0, 10);
      state.startDate = new DateModel(date).substractMonths(3).toString();
      state.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
    };

    const handleFiltersToggle = collapsed => {
      state.filtersCollapsed = collapsed;
    };

    return {
      state,
      loading,
      alertError,
      getCurrentMonth,
      getLastMonth,
      getLastThreeMonths,
      getToday,
      goBack,
      isActiveBusiness,
      commerce,
      selectedCommerces,
      handleCommerceChanged,
      downloadAttentionsReport,
      downloadNotificationsReport,
      downloadSurveysReport,
      downloadBookingsReport,
      downloadWaitlistsReport,
      downloadClientsReport,
      downloadClientContactsReport,
      downloadBookingPaymentsReport,
      downloadAttentionPaymentsReport,
      downloadAttentionProductsReport,
      downloadIncomesReport,
      downloadOutcomesReport,
      handleFiltersToggle,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessReports.title`)"
          :toggles="state.toggles"
          component-name="businessReports"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessReports">
          <div v-if="isActiveBusiness() && state.toggles['reports.admin.view']">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('businessReports.message.3.title')"
                :content="$t('businessReports.message.3.content')"
              />
            </div>
            <div v-else id="businessReports-controls" class="control-box">
              <div class="row"></div>
              <div class="row my-2">
                <div class="col-3">
                  <button
                    class="btn btn-dark rounded-pill px-2 metric-filters"
                    @click="getToday()"
                    :disabled="loading"
                  >
                    {{ $t('dashboard.today') }}
                  </button>
                </div>
                <div class="col-3">
                  <button
                    class="btn btn-dark rounded-pill px-2 metric-filters"
                    @click="getCurrentMonth()"
                    :disabled="loading"
                  >
                    {{ $t('dashboard.thisMonth') }}
                  </button>
                </div>
                <div class="col-3">
                  <button
                    class="btn btn-dark rounded-pill px-2 metric-filters"
                    @click="getLastMonth()"
                    :disabled="loading"
                  >
                    {{ $t('dashboard.lastMonth') }}
                  </button>
                </div>
                <div class="col-3">
                  <button
                    class="btn btn-dark rounded-pill px-2 metric-filters"
                    @click="getLastThreeMonths()"
                    :disabled="loading"
                  >
                    {{ $t('dashboard.lastThreeMonths') }}
                  </button>
                </div>
              </div>
              <div class="row my-2">
                <div class="col-6">
                  <input
                    id="startDate"
                    class="form-control metric-controls"
                    type="date"
                    v-model="state.startDate"
                  />
                </div>
                <div class="col-6">
                  <input
                    id="endDate"
                    class="form-control metric-controls"
                    type="date"
                    v-model="state.endDate"
                  />
                </div>
              </div>
              <div class="row my-2 centered">
                <div class="col centered form-check form-switch check-option">
                  <input
                    type="radio"
                    class="form-check-input btn-sm"
                    v-model="state.format"
                    value="csv"
                    name="csv-type"
                    id="csv-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="csv-since"> <i :class="`bi bi-filetype-csv`"></i> </label>
                </div>
                <div class="col centered form-check form-switch check-option">
                  <input
                    type="radio"
                    class="form-check-input btn-sm"
                    v-model="state.format"
                    value="xls"
                    name="xls-type"
                    id="xls-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="xls-since"> <i :class="`bi bi-filetype-xls`"></i> </label>
                </div>
                <div class="col centered form-check form-switch check-option">
                  <input
                    type="radio"
                    class="form-check-input btn-sm"
                    v-model="state.format"
                    value="json"
                    name="json-type"
                    id="json-since"
                    autocomplete="off"
                  />
                  <label class="btn" for="json-since">
                    <i :class="`bi bi-filetype-json`"></i>
                  </label>
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessReports-result" class="mt-4">
              <div>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.attentions']"
                  :can-donwload="!!state.toggles['reports.admin.attentions']"
                  :title="$t('businessReports.items.reports.1.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.1.description')"
                  :icon="'bi-qr-code'"
                  :icon-style-class="'blue-icon'"
                  @download="downloadAttentionsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.notifications']"
                  :can-donwload="!!state.toggles['reports.admin.notifications']"
                  :title="$t('businessReports.items.reports.2.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.2.description')"
                  :icon="'bi-send-check-fill'"
                  :icon-style-class="'blue-icon'"
                  @download="downloadNotificationsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.surveys']"
                  :can-donwload="!!state.toggles['reports.admin.surveys']"
                  :title="$t('businessReports.items.reports.3.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.3.description')"
                  :icon="'bi-star-fill'"
                  :icon-style-class="'yellow-icon'"
                  @download="downloadSurveysReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.bookings']"
                  :can-donwload="!!state.toggles['reports.admin.bookings']"
                  :title="$t('businessReports.items.reports.4.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.4.description')"
                  :icon="'bi-calendar2-check-fill'"
                  :icon-style-class="'orange-icon'"
                  @download="downloadBookingsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.waitlists']"
                  :can-donwload="!!state.toggles['reports.admin.waitlists']"
                  :title="$t('businessReports.items.reports.5.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.5.description')"
                  :icon="'bi-calendar-heart-fill'"
                  :icon-style-class="'red-icon'"
                  @download="downloadWaitlistsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.clients']"
                  :can-donwload="!!state.toggles['reports.admin.clients']"
                  :title="$t('businessReports.items.reports.6.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.6.description')"
                  :icon="'bi-person-fill'"
                  :icon-style-class="'blue-icon'"
                  @download="downloadClientsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.client-contacts']"
                  :can-donwload="!!state.toggles['reports.admin.client-contacts']"
                  :title="$t('businessReports.items.reports.7.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.7.description')"
                  :icon="'bi-chat-left-dots-fill'"
                  :icon-style-class="'green-icon'"
                  @download="downloadClientContactsReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.attention-products']"
                  :can-donwload="!!state.toggles['reports.admin.attention-products']"
                  :title="$t('businessReports.items.reports.10.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.10.description')"
                  :icon="'bi-eyedropper'"
                  :icon-style-class="'red-icon'"
                  @download="downloadIncomesReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.incomes']"
                  :can-donwload="!!state.toggles['reports.admin.incomes']"
                  :title="$t('businessReports.items.reports.11.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.11.description')"
                  :icon="'bi-cash-coin'"
                  :icon-style-class="'blue-icon'"
                  @download="downloadIncomesReport"
                ></SimpleDownloadCard>
                <SimpleDownloadCard
                  :show="!!state.toggles['reports.admin.outcomes']"
                  :can-donwload="!!state.toggles['reports.admin.outcomes']"
                  :title="$t('businessReports.items.reports.12.name')"
                  :show-tooltip="true"
                  :description="$t('businessReports.items.reports.12.description')"
                  :icon="'bi-cash-coin'"
                  :icon-style-class="'red-icon'"
                  @download="downloadOutcomesReport"
                ></SimpleDownloadCard>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['reports.admin.view']) && !loading">
            <Message
              :title="$t('businessReports.message.1.title')"
              :content="$t('businessReports.message.1.content')"
            />
          </div>
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
          :title="$t('businessReports.title')"
          :toggles="state.toggles"
          component-name="businessReports"
          @go-back="goBack"
        />
        <div id="businessReports">
          <div v-if="isActiveBusiness() && state.toggles['reports.admin.view']">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('businessReports.message.3.title')"
                :content="$t('businessReports.message.3.content')"
              />
            </div>
            <DesktopContentLayout
              v-else
              :show-filters="true"
              :filters-sticky="true"
              @filters-toggle="handleFiltersToggle"
            >
              <template #filters="{ onToggle, collapsed }">
                <DesktopFiltersPanel
                  :model-value="{ commerce: commerce }"
                  :loading="loading"
                  :commerces="[]"
                  :show-commerce-selector="false"
                  :show-date-filters="false"
                  :show-quick-date-buttons="false"
                  :show-refresh-button="false"
                  :sticky="true"
                  :show-all-option="true"
                  :commerce-selector-id="'reports-commerce-selector'"
                  :on-toggle="onToggle"
                  :collapsed="collapsed"
                  @commerce-changed="handleCommerceChanged"
                >
                  <template #custom-filters>
                    <div class="filters-content-wrapper">
                      <!-- Date quick buttons -->
                      <div class="row my-2">
                        <div class="col-6 mb-2">
                          <button
                            class="btn btn-sm btn-dark rounded-pill w-100"
                            @click="getToday()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.today') }}
                          </button>
                        </div>
                        <div class="col-6 mb-2">
                          <button
                            class="btn btn-sm btn-dark rounded-pill w-100"
                            @click="getCurrentMonth()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.thisMonth') }}
                          </button>
                        </div>
                        <div class="col-6 mb-2">
                          <button
                            class="btn btn-sm btn-dark rounded-pill w-100"
                            @click="getLastMonth()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.lastMonth') }}
                          </button>
                        </div>
                        <div class="col-6 mb-2">
                          <button
                            class="btn btn-sm btn-dark rounded-pill w-100"
                            @click="getLastThreeMonths()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.lastThreeMonths') }}
                          </button>
                        </div>
                      </div>

                      <!-- DateRangeFilters with search button -->
                      <DateRangeFilters
                        :start-date="state.startDate"
                        :end-date="state.endDate"
                        :show-quick-buttons="false"
                        :disabled="loading"
                        :show-search-button="false"
                        @update:startDate="
                          val => {
                            state.startDate = val;
                          }
                        "
                        @update:endDate="
                          val => {
                            state.endDate = val;
                          }
                        "
                      />

                      <!-- Format selector -->
                      <div class="mb-3">
                        <label class="form-label fw-bold mb-2">Formato</label>
                        <div class="d-flex flex-wrap gap-2">
                          <div class="form-check form-switch check-option">
                            <input
                              type="radio"
                              class="form-check-input btn-sm"
                              v-model="state.format"
                              value="csv"
                              name="csv-type-desktop"
                              id="csv-desktop"
                              autocomplete="off"
                            />
                            <label class="btn" for="csv-desktop">
                              <i :class="`bi bi-filetype-csv`"></i>
                            </label>
                          </div>
                          <div class="form-check form-switch check-option">
                            <input
                              type="radio"
                              class="form-check-input btn-sm"
                              v-model="state.format"
                              value="xls"
                              name="xls-type-desktop"
                              id="xls-desktop"
                              autocomplete="off"
                            />
                            <label class="btn" for="xls-desktop">
                              <i :class="`bi bi-filetype-xls`"></i>
                            </label>
                          </div>
                          <div class="form-check form-switch check-option">
                            <input
                              type="radio"
                              class="form-check-input btn-sm"
                              v-model="state.format"
                              value="json"
                              name="json-type-desktop"
                              id="json-desktop"
                              autocomplete="off"
                            />
                            <label class="btn" for="json-desktop">
                              <i :class="`bi bi-filetype-json`"></i>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </DesktopFiltersPanel>
              </template>

              <template #content>
                <div v-if="!loading" id="businessReports-result" class="mt-4">
                  <div>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.attentions']"
                      :can-donwload="!!state.toggles['reports.admin.attentions']"
                      :title="$t('businessReports.items.reports.1.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.1.description')"
                      :icon="'bi-qr-code'"
                      :icon-style-class="'blue-icon'"
                      @download="downloadAttentionsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.notifications']"
                      :can-donwload="!!state.toggles['reports.admin.notifications']"
                      :title="$t('businessReports.items.reports.2.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.2.description')"
                      :icon="'bi-send-check-fill'"
                      :icon-style-class="'blue-icon'"
                      @download="downloadNotificationsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.surveys']"
                      :can-donwload="!!state.toggles['reports.admin.surveys']"
                      :title="$t('businessReports.items.reports.3.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.3.description')"
                      :icon="'bi-star-fill'"
                      :icon-style-class="'yellow-icon'"
                      @download="downloadSurveysReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.bookings']"
                      :can-donwload="!!state.toggles['reports.admin.bookings']"
                      :title="$t('businessReports.items.reports.4.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.4.description')"
                      :icon="'bi-calendar2-check-fill'"
                      :icon-style-class="'orange-icon'"
                      @download="downloadBookingsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.waitlists']"
                      :can-donwload="!!state.toggles['reports.admin.waitlists']"
                      :title="$t('businessReports.items.reports.5.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.5.description')"
                      :icon="'bi-calendar-heart-fill'"
                      :icon-style-class="'red-icon'"
                      @download="downloadWaitlistsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.clients']"
                      :can-donwload="!!state.toggles['reports.admin.clients']"
                      :title="$t('businessReports.items.reports.6.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.6.description')"
                      :icon="'bi-person-fill'"
                      :icon-style-class="'blue-icon'"
                      @download="downloadClientsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.client-contacts']"
                      :can-donwload="!!state.toggles['reports.admin.client-contacts']"
                      :title="$t('businessReports.items.reports.7.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.7.description')"
                      :icon="'bi-chat-left-dots-fill'"
                      :icon-style-class="'green-icon'"
                      @download="downloadClientContactsReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.attention-products']"
                      :can-donwload="!!state.toggles['reports.admin.attention-products']"
                      :title="$t('businessReports.items.reports.10.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.10.description')"
                      :icon="'bi-eyedropper'"
                      :icon-style-class="'red-icon'"
                      @download="downloadIncomesReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.incomes']"
                      :can-donwload="!!state.toggles['reports.admin.incomes']"
                      :title="$t('businessReports.items.reports.11.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.11.description')"
                      :icon="'bi-cash-coin'"
                      :icon-style-class="'blue-icon'"
                      @download="downloadIncomesReport"
                    ></SimpleDownloadCard>
                    <SimpleDownloadCard
                      :show="!!state.toggles['reports.admin.outcomes']"
                      :can-donwload="!!state.toggles['reports.admin.outcomes']"
                      :title="$t('businessReports.items.reports.12.name')"
                      :show-tooltip="true"
                      :description="$t('businessReports.items.reports.12.description')"
                      :icon="'bi-cash-coin'"
                      :icon-style-class="'red-icon'"
                      @download="downloadOutcomesReport"
                    ></SimpleDownloadCard>
                  </div>
                </div>
              </template>
            </DesktopContentLayout>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['reports.admin.view']) && !loading">
            <Message
              :title="$t('businessReports.message.1.title')"
              :content="$t('businessReports.message.1.content')"
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

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
.module-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
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
