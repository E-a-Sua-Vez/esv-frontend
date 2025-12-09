<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import { lazyLoadHtml2Pdf } from '../../../shared/utils/lazyLoad';
import { globalStore } from '../../../stores';
import { getDate } from '../../../shared/utils/date';
import SimpleCard from '../../dashboard/common/SimpleCard.vue';
import { LineChart, useBarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';
import PDFHeader from '../../reports/PDFHeader.vue';
import PDFFooter from '../../reports/PDFFooter.vue';
import SimpleDownloadButton from '../../reports/SimpleDownloadButton.vue';
import { getFinancialMetrics } from '../../../application/services/query-stack';
import CollectionDetails from '../../dashboard/domain/CollectionDetails.vue';
import IncomesCollectionDetails from '../../dashboard/domain/IncomesCollectionDetails.vue';
import OutcomesCollectionDetails from '../../dashboard/domain/OutcomesCollectionDetails.vue';
import { DateModel } from '../../../shared/utils/date.model';

Chart.register(...registerables);

export default {
  name: 'ResumeFinancialManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    Alert,
    Warning,
    SimpleCard,
    LineChart,
    PDFHeader,
    PDFFooter,
    SimpleDownloadButton,
    CollectionDetails,
    IncomesCollectionDetails,
    OutcomesCollectionDetails,
  },
  props: {
    showResumeFinancialManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      financialResume: {
        incomes: {
          paymentData: {},
        },
        outcomes: {
          paymentData: {},
        },
        resume: {},
        evolution: {},
      },
      newFinancialResume: {},
      showFilterOptions: false,
      store,
      userType: undefined,
      user: undefined,
      startDate: undefined,
      endDate: undefined,
      calculatedMetrics: {},
      detailsOpened: false,
    };
  },
  async beforeMount() {
    this.financialResume = {
      incomes: {
        paymentData: {},
      },
      outcomes: {
        paymentData: {},
      },
      resume: {},
      evolution: {},
    };
    await this.getCurrentMonth();
  },
  methods: {
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    async clear() {
      await this.getCurrentMonth();
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    async refresh() {
      try {
        this.loading = true;
        const commerceIds = [this.commerce.id];
        const { calculatedMetrics } = await getFinancialMetrics(
          commerceIds,
          this.startDate,
          this.endDate
        );
        this.calculatedMetrics = calculatedMetrics;
        const incomes = calculatedMetrics['incomes.created'];
        const outcomes = calculatedMetrics['outcomes.created'];
        this.financialResume.incomes = incomes;
        this.financialResume.outcomes = outcomes;
        const { barChartProps: financialEvolution } = useBarChart({
          chartData: {
            labels: Array.from(
              new Set([...incomes['evolution']['labels'], ...outcomes['evolution']['labels']])
            ),
            datasets: [
              {
                label: 'Incomes',
                boxWidth: 10,
                borderColor: '#004aad',
                backgroundColor: 'rgba(127, 134, 255, 0.7)',
                borderDash: [2, 2],
                data: incomes['evolution']['datasets'].map(data => data['paymentAmountSum']) || [],
                fill: false,
                tension: 0.1,
                radius: 0,
                type: 'bar',
              },
              {
                label: 'Commissions',
                boxWidth: 10,
                borderColor: '#a52a2a',
                backgroundColor: 'rgba(255, 99, 71, 0.3)',
                borderDash: [2, 2],
                data:
                  incomes['evolution']['datasets'].map(data => data['paymentCommissionSum']) || [],
                fill: false,
                tension: 0.1,
                radius: 0,
                type: 'bar',
              },
              {
                label: 'Outcomes',
                boxWidth: 10,
                borderColor: '#a52a2a',
                backgroundColor: 'rgba(255, 99, 71, 0.8)',
                borderDash: [2, 2],
                data: outcomes['evolution']['datasets'].map(data => data['paymentAmountSum']) || [],
                fill: false,
                tension: 0.1,
                radius: 0,
                type: 'bar',
              },
            ],
            options: {
              fill: false,
              radius: 0,
            },
          },
        });
        this.financialResume.evolution = financialEvolution;
        const diff =
          (+incomes.paymentData.paymentAmountSum || 0) -
            ((+incomes.paymentData.paymentCommissionSum || 0) +
              (+outcomes.paymentData.paymentAmountSum || 0)) || 0;
        this.financialResume.resume.diff = diff || 0;
        const avg = this.getPercentage(diff || 0, +incomes.paymentData.paymentAmountSum || 1);
        this.financialResume.resume.avg = avg;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    exportToPDF() {
      this.loading = true;
      this.detailsOpened = true;
      const filename = `financial-resume-${this.commerce.name}.pdf`;
      const options = {
        margin: 0.5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      let doc = document.getElementById('financial-component');
      document.getElementById('pdf-header').style.display = 'block';
      document.getElementById('pdf-footer').style.display = 'block';
      setTimeout(async () => {
        try {
          const html2pdf = await lazyLoadHtml2Pdf();
          html2pdf()
            .set(options)
            .from(doc)
            .save()
            .then(() => {
              document.getElementById('pdf-header').style.display = 'none';
              document.getElementById('pdf-footer').style.display = 'none';
              doc = undefined;
              this.loading = false;
              this.downloading = false;
              this.detailsOpened = false;
            })
            .catch(error => {
              document.getElementById('pdf-header').style.display = 'none';
              document.getElementById('pdf-footer').style.display = 'none';
              doc = undefined;
              this.loading = false;
              this.downloading = false;
              this.detailsOpened = false;
            });
        } catch (error) {
          document.getElementById('pdf-header').style.display = 'none';
          document.getElementById('pdf-footer').style.display = 'none';
          doc = undefined;
          this.loading = false;
          this.downloading = false;
          this.detailsOpened = false;
        }
      }, 1100);
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh();
    },
    getPercentage(value, total) {
      const percentage = (value * 100) / total;
      return parseFloat(percentage.toFixed(2), 2) || 0;
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
  },
};
</script>

<template>
  <div>
    <!-- Expose filters slot for desktop - rendered outside main content conditional -->
    <slot
      v-if="filtersLocation === 'slot'"
      name="filters-exposed"
      :clear="clear"
      :get-today="getToday"
      :get-current-month="getCurrentMonth"
      :get-last-month="getLastMonth"
      :get-last-three-months="getLastThreeMonths"
      :refresh="refresh"
      :start-date="startDate"
      :end-date="endDate"
      :loading="loading"
    ></slot>

    <div>
      <div
        id="financialResume-management"
        class="row"
        v-if="showResumeFinancialManagement === true && toggles['financial.resume.view']"
      >
        <div class="col">
          <div id="attention-management-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div>
              <div>
                <div>
                  <div id="admin-sub-menu" class="row mt-3 mx-0">
                    <div class="col lefted">
                      <SimpleDownloadButton
                        :download="toggles['financial.reports.resume']"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.reports.resume.description')"
                        @download="exportToPDF"
                        :can-download="toggles['financial.reports.resume'] === true"
                      ></SimpleDownloadButton>
                    </div>
                  </div>
                  <!-- Filters Section - Can be shown in component or exposed via slot -->
                  <div v-if="filtersLocation === 'component'" class="my-2 row metric-card">
                    <div class="col-12">
                      <span class="metric-card-subtitle">
                        <span
                          class="form-check-label metric-keyword-subtitle mx-1"
                          @click="showFilters()"
                        >
                          <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
                        </span>
                      </span>
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                        @click="clear()"
                      >
                        <span><i class="bi bi-eraser-fill"></i></span>
                      </button>
                    </div>
                    <div>
                      <div class="row my-1">
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
                      <div class="m-1">
                        <div class="row">
                          <div class="col-5">
                            <input
                              id="startDate"
                              class="form-control metric-controls"
                              type="date"
                              v-model="startDate"
                            />
                          </div>
                          <div class="col-5">
                            <input
                              id="endDate"
                              class="form-control metric-controls"
                              type="date"
                              v-model="endDate"
                            />
                          </div>
                          <div class="col-2">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                              @click="refresh()"
                            >
                              <span><i class="bi bi-search"></i></span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="financial-component" v-if="this.financialResume">
                <PDFHeader
                  :show="toggles['financial.reports.resume']"
                  :title="$t('businessFinancial.reports.resume.title')"
                  :start-date="startDate"
                  :end-date="endDate"
                  :commerce="commerce"
                >
                </PDFHeader>
                <div>
                  <div class="row">
                    <div v-if="calculatedMetrics && Object.keys(calculatedMetrics).length > 0">
                      <div class="metric-card" v-if="calculatedMetrics['incomes.created']">
                        <div class="metric-card-title">
                          <span> {{ $t('dashboard.incomes') }} </span>
                        </div>
                        <IncomesCollectionDetails
                          :show="!!toggles['financial.reports.resume']"
                          :distribution="calculatedMetrics['incomes.created'].paymentData"
                          :count="
                            calculatedMetrics['incomes.created']['paymentData'].paymentCounter || 0
                          "
                          :distribution-payment="
                            calculatedMetrics['incomes.created'].paymentDistribution
                          "
                          :distribution-type="
                            calculatedMetrics['incomes.created'].paymentTypeDistribution
                          "
                          :distribution-method="
                            calculatedMetrics['incomes.created'].paymentMethodDistribution
                          "
                          :distribution-fiscal-note="
                            calculatedMetrics['incomes.created'].paymentFiscalNoteDistribution
                          "
                          :details-opened="detailsOpened"
                        >
                        </IncomesCollectionDetails>
                      </div>
                      <div class="metric-card" v-if="calculatedMetrics['outcomes.created']">
                        <div class="metric-card-title">
                          <span> {{ $t('dashboard.outcomes') }} </span>
                        </div>
                        <OutcomesCollectionDetails
                          :show="!!toggles['financial.reports.resume']"
                          :distribution="calculatedMetrics['outcomes.created'].paymentData"
                          :distribution-payment="
                            calculatedMetrics['outcomes.created'].paymentDistribution
                          "
                          :count="
                            calculatedMetrics['outcomes.created']['paymentData'].paymentCounter || 0
                          "
                          :distribution-type="
                            calculatedMetrics['outcomes.created'].paymentTypeDistribution
                          "
                          :details-opened="detailsOpened"
                        >
                        </OutcomesCollectionDetails>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div id="profit" class="col">
                      <SimpleCard
                        :show="true"
                        :data="+financialResume['resume']['diff'] || 0"
                        :subdata="`${+financialResume['resume']['avg'] || 0}%`"
                        :title="$t('businessFinancial.profit')"
                        :show-tooltip="false"
                        :icon="'bi-arrow-up-circle-fill'"
                        :icon-style-class="'green-icon'"
                      >
                      </SimpleCard>
                    </div>
                  </div>
                  <div
                    class="row mx-2 mt-3"
                    v-if="
                      calculatedMetrics['incomes.created']?.evolution?.datasets &&
                      calculatedMetrics['outcomes.created']?.evolution?.datasets
                    "
                  >
                    <div class="card col centered p-4">
                      <div class="fw-bold mb-2">
                        <span>{{ $t('businessFinancial.evolution') }} </span>
                      </div>
                      <LineChart class="centered" v-bind="financialResume.evolution" />
                    </div>
                  </div>
                  <div v-else></div>
                </div>
                <PDFFooter :show="toggles['financial.reports.resume']"></PDFFooter>
              </div>
              <div v-else>
                <Message
                  :icon="'bi-graph-up-arrow'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showResumeFinancialManagement === true && !toggles['financial.resume.view']">
        <Message
          :icon="'bi-graph-up-arrow'"
          :title="$t('dashboard.message.1.title')"
          :content="$t('dashboard.message.1.content')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: 0.6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.form-control {
  font-size: 0.9rem;
}
</style>
