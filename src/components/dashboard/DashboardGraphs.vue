<script>
import Spinner from '../../components/common/Spinner.vue';
import { LineChart, DoughnutChart, BarChart } from 'vue-chart-3';
import Message from '../../components/common/Message.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import { lazyLoadHtml2Pdf } from '../../shared/utils/lazyLoad';
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';

export default {
  name: 'DashboardGraphs',
  components: {
    LineChart,
    DoughnutChart,
    BarChart,
    Message,
    SimpleDownloadCard,
    PDFHeader,
    PDFFooter,
    Spinner,
  },
  props: {
    showGraphs: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    graphs: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      downloading: false,
      showAttentions: true,
      showBookings: false,
    };
  },
  methods: {
    getPastPeriodPercentage(period) {
      if (period && period.number >= 0) {
        const percentage =
          ((this.calculatedMetrics['attention.created'].attentionNumber || 1) * 100) /
          (period.number === 0 ? 1 : period.number);
        return parseFloat(percentage.toFixed(2));
      }
      return 0;
    },
    getPastMonthPercentage(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod) {
        const percentage = (currentPeriod.number * 100) / pastPeriod.number;
        return percentage === Infinity
          ? pastPeriod.number * 100
          : parseFloat(percentage.toFixed(2)) || pastPeriod.number * 100;
      }
      return 0;
    },
    getPercentage(number) {
      const percentage =
        (number * 100) / this.calculatedMetrics['attention.created'].attentionNumber;
      return parseFloat(percentage.toFixed(2), 2) || 0;
    },
    getPercentageSurvey(number) {
      const percentage =
        (number * 100) / this.calculatedMetrics['attention.created'].surveyFlow.datasets[0];
      return parseFloat(percentage.toFixed(2), 2) || 0;
    },
    getPercentageBooking(number) {
      const percentage = (number * 100) / this.calculatedMetrics['booking.created'].bookingNumber;
      return parseFloat(percentage.toFixed(2), 2) || 0;
    },
    getDifference(percentage) {
      return parseFloat((100 - percentage).toFixed(2), 2) || 0;
    },
    getTrendIcon(compareActual, comparePrevious) {
      if (compareActual < comparePrevious) {
        return 'bi-arrow-down-circle-fill red-icon';
      } else if (compareActual === comparePrevious) {
        return 'bi-circle-fill blue-icon';
      } else {
        return 'bi-arrow-up-circle-fill green-icon';
      }
    },
    getMaxAvgTime() {
      const arr = this.calculatedMetrics['attention.created'].durationFlow.datasets;
      return arr.reduce((a, b) => Math.max(a, b), -Infinity);
    },
    getMinAvgTime() {
      const arr = this.calculatedMetrics['attention.created'].durationFlow.datasets;
      return arr.reduce((a, b) => Math.min(a, b), 100000000);
    },
    getMaxAvgHour() {
      const arr = this.calculatedMetrics['attention.created'].hourDistribution.datasets;
      const max = JSON.parse(JSON.stringify(arr)).reduce((a, b) => Math.max(a, b), -Infinity);
      const ind = arr.indexOf(max.toString());
      return {
        label: this.calculatedMetrics['attention.created'].hourDistribution.labels[ind],
        data: max,
      };
    },
    getMaxAvgDay() {
      const arr = this.calculatedMetrics['attention.created'].dayDistribution.datasets;
      const max = JSON.parse(JSON.stringify(arr)).reduce((a, b) => Math.max(a, b), -Infinity);
      const ind = arr.indexOf(max.toString());
      return {
        label: this.calculatedMetrics['attention.created'].dayDistribution.labels[ind],
        data: max,
      };
    },
    getMaxBookingAvgHour() {
      const arr = this.calculatedMetrics['booking.created'].hourDistribution.datasets;
      const max = JSON.parse(JSON.stringify(arr)).reduce((a, b) => Math.max(a, b), -Infinity);
      const ind = arr.indexOf(max.toString());
      return {
        label: this.calculatedMetrics['booking.created'].hourDistribution.labels[ind],
        data: max,
      };
    },
    getMaxBookingAvgDay() {
      const arr = this.calculatedMetrics['booking.created'].dayDistribution.datasets;
      const max = JSON.parse(JSON.stringify(arr)).reduce((a, b) => Math.max(a, b), -Infinity);
      const ind = arr.indexOf(max.toString());
      return {
        label: this.calculatedMetrics['booking.created'].dayDistribution.labels[ind],
        data: max,
      };
    },
    getLocalHour(hour) {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (this.commerce.country) {
        if (this.commerce.country === 've') {
          const resultHour = hourDate.getHours() - 4;
          return resultHour < 0 ? 24 + resultHour : resultHour;
        } else if (['br', 'cl'].includes(this.commerce.country)) {
          const resultHour = hourDate.getHours() - 3;
          return resultHour < 0 ? 24 + resultHour : resultHour;
        } else {
          return hourDate.getHours();
        }
      }
    },
    surveyLabel(label) {
      const labels = {
        TERMINATED: 'INITIATED',
        RATED: 'TERMINATED',
      };
      return labels[label];
    },
    showAttentionsMenu() {
      this.showAttentions = true;
      this.showBookings = false;
    },
    showBookingsMenu() {
      this.showAttentions = false;
      this.showBookings = true;
    },
    async exportToPDF() {
      this.loading = true;
      this.downloading = true;
      const filename = `graphs-${this.commerce.name}-${this.commerce.tag}-${this.startDate}-${this.endDate}.pdf`;
      const options = {
        margin: 0.5,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      };
      let doc = document.getElementById('graphs-component');
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
            })
            .catch(error => {
              document.getElementById('pdf-header').style.display = 'none';
              document.getElementById('pdf-footer').style.display = 'none';
              doc = undefined;
              this.loading = false;
              this.downloading = false;
            });
        } catch (error) {
          document.getElementById('pdf-header').style.display = 'none';
          document.getElementById('pdf-footer').style.display = 'none';
          doc = undefined;
          this.loading = false;
          this.downloading = false;
        }
      }, 2100);
    },
  },
};
</script>

<template>
  <div>
    <div id="graphs" class="row" v-if="showGraphs === true && toggles['dashboard.graphs.view']">
      <Spinner :show="loading"></Spinner>
      <div class="row col m-0 mb-2">
        <hr />
        <div class="col-6 centered">
          <button
            class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
            :class="this.showAttentions ? 'btn-selected' : ''"
            @click="showAttentionsMenu()"
            :disabled="!toggles['dashboard.graphs-attentions.view']"
          >
            {{ $t('dashboard.attentions') }}
          </button>
        </div>
        <div class="col-6 centered">
          <button
            class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
            :class="this.showBookings ? 'btn-selected' : ''"
            @click="showBookingsMenu()"
            :disabled="!toggles['dashboard.graphs-bookings.view']"
          >
            {{ $t('dashboard.bookings') }}
          </button>
        </div>
      </div>
      <SimpleDownloadCard
        :download="toggles['dashboard.reports.graphs']"
        :title="`${$t('dashboard.reports.graphs.title')} ${
          this.showAttentions ? $t('dashboard.attentions') : $t('dashboard.bookings')
        }`"
        :show-tooltip="true"
        :description="$t('dashboard.reports.graphs.description')"
        :icon="'file-earmark-pdf'"
        :can-download="toggles['dashboard.reports.graphs'] === true"
        @download="exportToPDF"
      ></SimpleDownloadCard>
      <div id="graphs-component">
        <PDFHeader
          :show="toggles['dashboard.reports.graphs']"
          :title="$t('dashboard.reports.graphs.title')"
          :start-date="startDate"
          :end-date="endDate"
          :commerce="commerce"
        >
        </PDFHeader>
        <!-- cards desktop -->
        <div class="d-block">
          <div id="accordion">
            <div>
              <div
                id="collapseOne"
                v-if="showAttentions === true && toggles['dashboard.graphs-attentions.view']"
              >
                <div class="card-body">
                  <!-- attention-number-evolution -->
                  <div
                    v-if="graphs['attention-number-evolution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-number-evolution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.1') }} </strong></span
                          >
                        </div>
                        <div class="row">
                          <LineChart
                            class="centered"
                            v-bind="calculatedMetrics.attentionNumberEvolutionProps"
                          />
                          <div class="metric-conclusion mt-3">
                            <div class="row centered">
                              <div class="col-12 col-md-2 m-1 centered">
                                <i
                                  :class="
                                    getTrendIcon(
                                      calculatedMetrics['attention.created'].attentionNumber,
                                      calculatedMetrics['attention.created']
                                        .pastPeriodAttentionNumber.number
                                    )
                                  "
                                >
                                  <span>
                                    {{ $t('dashboard.items.trends.attention-number-evolution.1') }}
                                  </span>
                                </i>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.2') }}
                                  <span class="fw-bold">
                                    {{ calculatedMetrics['attention.created'].attentionNumber }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                                  {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                                  <span class="fw-bold">
                                    {{
                                      (
                                        calculatedMetrics['attention.created'].dailyAvg || 0
                                      ).toFixed(2)
                                    }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.11') }}
                                </span>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.4') }}
                                  <span class="fw-bold">
                                    {{
                                      getPastPeriodPercentage(
                                        calculatedMetrics['attention.created']
                                          .pastPeriodAttentionNumber
                                      )
                                    }}%
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.5') }}
                                  <span class="fw-bold">
                                    ({{
                                      calculatedMetrics['attention.created']
                                        .pastPeriodAttentionNumber.number
                                    }}).
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                                  <span class="fw-bold">
                                    {{
                                      (
                                        calculatedMetrics['attention.created']
                                          .pastPeriodAttentionNumber.dailyAvg || 0
                                      ).toFixed(2)
                                    }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.11') }}
                                </span>
                              </div>
                            </div>
                            <hr />
                            <div class="row centered mt-1">
                              <div class="col-12 col-md-2 m-1 centered">
                                <i
                                  :class="
                                    getTrendIcon(
                                      calculatedMetrics['attention.created']
                                        .currentMonthAttentionNumber.number,
                                      calculatedMetrics['attention.created']
                                        .pastMonthAttentionNumber.number
                                    )
                                  "
                                >
                                  <span>
                                    {{ $t('dashboard.items.trends.attention-number-evolution.6') }}
                                  </span>
                                </i>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.7') }}
                                  <span class="fw-bold">
                                    {{
                                      calculatedMetrics['attention.created']
                                        .currentMonthAttentionNumber.number
                                    }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                                </span>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.8') }}
                                  <span class="fw-bold">
                                    {{
                                      calculatedMetrics['attention.created']
                                        .pastMonthAttentionNumber.number
                                    }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                                  {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                                  <span class="fw-bold">
                                    {{
                                      (
                                        calculatedMetrics['attention.created']
                                          .pastMonthAttentionNumber.dailyAvg || 0
                                      ).toFixed(2)
                                    }}
                                  </span>
                                  {{ $t('dashboard.items.trends.attention-number-evolution.11') }}

                                  {{ $t('dashboard.items.trends.attention-number-evolution.9') }}
                                  <span class="fw-bold">
                                    {{
                                      getPastMonthPercentage(
                                        calculatedMetrics['attention.created']
                                          .pastMonthAttentionNumber,
                                        calculatedMetrics['attention.created']
                                          .currentMonthAttentionNumber
                                      )
                                    }}%.
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.1')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-number-queue -->
                  <div
                    v-if="graphs['attention-number-queue']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-number-queue.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.2') }} </strong></span
                          >
                        </div>
                        <div class="row">
                          <DoughnutChart
                            class="centered"
                            v-bind="calculatedMetrics.attentionQueuesProps"
                          />
                          <div class="col-12 mt-1">
                            <div
                              class="row centered mx-0 my-0"
                              v-for="(option, ind) in calculatedMetrics['attention.created']
                                .attentionQueues.labels"
                              :key="`option.${ind}`"
                            >
                              <div class="col-6 centered px-1">
                                <span class="metric-card-title fw-bold"> {{ option }} </span>
                              </div>
                              <div class="col-2 centered px-1">
                                <span class="badge rounded-pill bg-secondary metric-card-subtitle">
                                  {{
                                    calculatedMetrics['attention.created'].attentionQueues.datasets[
                                      ind
                                    ]
                                  }}
                                </span>
                              </div>
                              <div class="col-4 centered px-1">
                                <span class="badge rounded-pill bg-primary metric-card-subtitle">
                                  {{
                                    getPercentage(
                                      calculatedMetrics['attention.created'].attentionQueues
                                        .datasets[ind]
                                    )
                                  }}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.2')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-flow -->
                  <div
                    v-if="graphs['attention-flow']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div v-if="toggles['dashboard.attention-flow.view']" class="col">
                      <div class="card metric-card-graph h6 centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.3') }} </strong></span
                          >
                        </div>
                        <BarChart class="centered" v-bind="calculatedMetrics.attentionFlowProps" />
                        <div class="col-12 mt-1">
                          <div
                            class="row centered mx-0 my-0"
                            v-for="(option, ind) in calculatedMetrics['attention.created']
                              .attentionFlow.labels"
                            :key="`option.${ind}`"
                          >
                            <div class="col-6 centered px-1">
                              <span class="metric-card-title fw-bold"> {{ option }} </span>
                            </div>
                            <div class="col-2 centered px-1">
                              <span class="badge rounded-pill bg-secondary metric-card-subtitle">
                                {{
                                  calculatedMetrics['attention.created'].attentionFlow.datasets[ind]
                                }}
                              </span>
                            </div>
                            <div class="col-4 centered px-1">
                              <span class="badge rounded-pill bg-primary metric-card-subtitle">
                                {{
                                  getPercentage(
                                    calculatedMetrics['attention.created'].attentionFlow.datasets[
                                      ind
                                    ]
                                  )
                                }}
                                %
                              </span>
                            </div>
                          </div>
                          <hr class="mb-1 mt-1" />
                        </div>
                        <div class="metric-conclusion mt-1">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-funnel-fill blue-icon">
                                {{ $t('dashboard.items.trends.attention-flow.1') }}</i
                              >
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-flow.2') }}
                                <span class="fw-bold">
                                  {{ calculatedMetrics['attention.created'].attentionNumber }}
                                </span>
                                {{ $t('dashboard.items.trends.attention-flow.3') }}
                                <span class="fw-bold">
                                  {{
                                    calculatedMetrics['attention.created'].attentionFlow.datasets[2]
                                  }} </span
                                >.
                              </span>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-flow.4') }}
                                <i class="bi bi-arrow-up-circle-fill green-icon">
                                  {{ $t('dashboard.items.trends.attention-flow.5') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-flow.6') }}
                                <span class="fw-bold">
                                  {{
                                    getPercentage(
                                      calculatedMetrics['attention.created'].attentionFlow
                                        .datasets[2]
                                    )
                                  }}%
                                </span>
                                {{ $t('dashboard.items.trends.attention-flow.7') }}
                                <i class="bi bi-arrow-right-circle-fill red-icon">
                                  {{ $t('dashboard.items.trends.attention-flow.8') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-flow.6') }}
                                <span class="fw-bold">
                                  {{
                                    getDifference(
                                      getPercentage(
                                        calculatedMetrics['attention.created'].attentionFlow
                                          .datasets[2]
                                      )
                                    )
                                  }}%.
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.3')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- survey-flow -->
                  <div v-if="graphs['survey-flow']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
                    <div v-if="toggles['dashboard.survey-flow.view']" class="col">
                      <div class="card metric-card-graph h6 centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.7') }} </strong></span
                          >
                        </div>
                        <BarChart class="centered" v-bind="calculatedMetrics.surveyFlowProps" />
                        <div class="col-12 mt-1">
                          <div
                            class="row centered mx-0 my-0"
                            v-for="(option, ind) in calculatedMetrics['attention.created']
                              .surveyFlow.labels"
                            :key="`option.${ind}`"
                          >
                            <div class="col-6 centered px-1">
                              <span class="metric-card-title fw-bold">
                                {{ surveyLabel(option) }}
                              </span>
                            </div>
                            <div class="col-2 centered px-1">
                              <span class="badge rounded-pill bg-secondary metric-card-subtitle">
                                {{
                                  calculatedMetrics['attention.created'].surveyFlow.datasets[ind]
                                }}
                              </span>
                            </div>
                            <div class="col-4 centered px-1">
                              <span class="badge rounded-pill bg-primary metric-card-subtitle">
                                {{
                                  getPercentageSurvey(
                                    calculatedMetrics['attention.created'].surveyFlow.datasets[ind]
                                  )
                                }}
                                %
                              </span>
                            </div>
                          </div>
                          <hr class="mb-1 mt-1" />
                        </div>
                        <div class="metric-conclusion mt-1">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-funnel-fill blue-icon">
                                {{ $t('dashboard.items.trends.survey-flow.1') }}</i
                              >
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.survey-flow.2') }}
                                <span class="fw-bold">
                                  {{
                                    calculatedMetrics['attention.created'].surveyFlow.datasets[0]
                                  }}
                                </span>
                                {{ $t('dashboard.items.trends.survey-flow.3') }}
                                <span class="fw-bold">
                                  {{
                                    calculatedMetrics['attention.created'].surveyFlow.datasets[1]
                                  }} </span
                                >.
                              </span>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.survey-flow.4') }}
                                <i class="bi bi-arrow-up-circle-fill green-icon">
                                  {{ $t('dashboard.items.trends.survey-flow.5') }}
                                </i>
                                {{ $t('dashboard.items.trends.survey-flow.6') }}
                                <span class="fw-bold">
                                  {{
                                    getPercentageSurvey(
                                      calculatedMetrics['attention.created'].surveyFlow.datasets[1]
                                    )
                                  }}%
                                </span>
                                {{ $t('dashboard.items.trends.survey-flow.7') }}
                                <i class="bi bi-arrow-right-circle-fill red-icon">
                                  {{ $t('dashboard.items.trends.survey-flow.8') }}
                                </i>
                                {{ $t('dashboard.items.trends.survey-flow.6') }}
                                <span class="fw-bold">
                                  {{
                                    getDifference(
                                      getPercentageSurvey(
                                        calculatedMetrics['attention.created'].surveyFlow
                                          .datasets[1]
                                      )
                                    )
                                  }}%.
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.7')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-duration-evolution -->
                  <div
                    v-if="graphs['attention-duration-evolution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-duration-evolution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.4') }} </strong></span
                          >
                        </div>
                        <LineChart
                          class="centered"
                          v-bind="calculatedMetrics.attentionDurationEvolutionProps"
                        />
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-clock-fill blue-icon">
                                {{ $t('dashboard.items.trends.attention-duration-evolution.1') }}
                              </i>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.2') }}
                                <span class="fw-bold">
                                  {{ calculatedMetrics['attention.created'].avgDuration }} </span
                                >.
                              </span>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.3') }}
                                <i class="bi bi-arrow-up-circle-fill green-icon">
                                  {{ $t('dashboard.items.trends.attention-duration-evolution.4') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                                <span class="fw-bold"> {{ getMaxAvgTime() }} </span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.6') }}
                                <i class="bi bi-arrow-down-circle-fill red-icon">
                                  {{ $t('dashboard.items.trends.attention-duration-evolution.7') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                                <span class="fw-bold"> {{ getMinAvgTime() }} </span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.8') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.4')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-rate-duration-evolution -->
                  <div
                    v-if="graphs['attention-rate-duration-evolution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-rate-duration-evolution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.6') }} </strong></span
                          >
                        </div>
                        <LineChart
                          class="centered"
                          v-bind="calculatedMetrics.attentionRateDurationEvolutionProps"
                        />
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-clock-fill blue-icon">
                                {{
                                  $t('dashboard.items.trends.attention-rate-duration-evolution.1')
                                }}
                              </i>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{
                                  $t('dashboard.items.trends.attention-rate-duration-evolution.2')
                                }}
                                <span class="fw-bold">
                                  {{
                                    calculatedMetrics['attention.created'].avgRateDuration
                                  }} </span
                                >.
                              </span>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.3') }}
                                <i class="bi bi-arrow-up-circle-fill green-icon">
                                  {{ $t('dashboard.items.trends.attention-duration-evolution.4') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                                <span class="fw-bold"> {{ getMaxAvgTime() }} </span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.6') }}
                                <i class="bi bi-arrow-down-circle-fill red-icon">
                                  {{ $t('dashboard.items.trends.attention-duration-evolution.7') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                                <span class="fw-bold"> {{ getMinAvgTime() }} </span>
                                {{ $t('dashboard.items.trends.attention-duration-evolution.8') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.6')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-hour-distribution -->
                  <div
                    v-if="graphs['attention-hour-distribution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-hour-distribution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong> {{ $t('dashboard.items.attentions.graph.5') }} </strong></span
                          >
                        </div>
                        <LineChart
                          class="centered"
                          v-bind="calculatedMetrics.attentionHourDistributionProps"
                        />
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-clock-fill blue-icon">
                                {{ $t('dashboard.items.trends.attention-hour-distribution.1') }}
                              </i>
                            </div>
                            <div class="col-12 col-md-8 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-hour-distribution.2') }}
                                <span class="fw-bold">
                                  {{ getLocalHour(getMaxAvgHour().label) }}:00
                                </span>
                                {{ $t('dashboard.items.trends.attention-hour-distribution.3') }}
                                <span class="fw-bold"> {{ getMaxAvgHour().data }} </span>
                                {{ $t('dashboard.items.trends.attention-hour-distribution.4') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.5')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- attention-day-distribution -->
                  <div
                    v-if="graphs['attention-day-distribution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.attention-day-distribution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{ $t('dashboard.items.attentions.graph.13') }}
                            </strong></span
                          >
                        </div>
                        <LineChart
                          class="centered"
                          v-bind="calculatedMetrics.attentionDayDistributionProps"
                        />
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-clock-fill blue-icon">
                                {{ $t('dashboard.items.trends.attention-day-distribution.1') }}
                              </i>
                            </div>
                            <div class="col-12 col-md-8 m-1 centered">
                              <span>
                                {{ $t('dashboard.items.trends.attention-day-distribution.2') }}
                                <span class="fw-bold"> {{ getMaxAvgDay().label }} </span>
                                {{ $t('dashboard.items.trends.attention-day-distribution.3') }}
                                <span class="fw-bold"> {{ getMaxAvgDay().data }} </span>
                                {{ $t('dashboard.items.trends.attention-day-distribution.4') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.13')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                </div>
              </div>
              <div v-if="showAttentions === true && !toggles['dashboard.graphs-attentions.view']">
                <Message
                  :icon="'graph-up-arrow'"
                  :title="$t('dashboard.message.1.title')"
                  :content="$t('dashboard.message.1.content')"
                />
              </div>
              <div
                id="collapseTwo"
                v-if="showBookings === true && toggles['dashboard.graphs-bookings.view']"
              >
                <div class="card-body">
                  <!-- booking-number-evolution -->
                  <div
                    v-if="graphs['booking-number-evolution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.booking-number-evolution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{ $t('dashboard.items.attentions.graph.10') }}
                            </strong></span
                          >
                        </div>
                        <div class="row">
                          <div class="centered booking-chart-container">
                            <LineChart
                              class="centered"
                              v-bind="calculatedMetrics.bookingNumberEvolutionProps"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.10')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- booking-flow -->
                  <div v-if="graphs['booking-flow']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
                    <div v-if="toggles['dashboard.booking-flow.view']" class="col">
                      <div class="card metric-card-graph h6 centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{ $t('dashboard.items.attentions.graph.11') }}
                            </strong></span
                          >
                        </div>
                        <div class="centered booking-chart-container">
                          <BarChart class="centered" v-bind="calculatedMetrics.bookingFlowProps" />
                        </div>
                        <div class="col-12 mt-1">
                          <div class="booking-status-breakdown">
                            <div
                              class="booking-status-row"
                              v-for="(option, ind) in calculatedMetrics['booking.created']
                                .bookingFlow.labels"
                              :key="`option.${ind}`"
                            >
                              <div class="booking-status-label">
                                <span class="fw-bold"> {{ option }} </span>
                              </div>
                              <div class="booking-status-badges">
                                <span class="badge rounded-pill bg-secondary booking-count-badge">
                                  {{
                                    calculatedMetrics['booking.created'].bookingFlow.datasets[ind]
                                  }}
                                </span>
                                <span
                                  class="badge rounded-pill bg-primary booking-percentage-badge"
                                >
                                  {{
                                    getPercentageBooking(
                                      calculatedMetrics['booking.created'].bookingFlow.datasets[ind]
                                    )
                                  }}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <hr class="booking-divider" />
                        </div>
                        <div class="metric-conclusion mt-1">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-funnel-fill blue-icon booking-conclusion-icon">
                                {{ $t('dashboard.items.trends.attention-flow.1') }}</i
                              >
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span class="booking-conclusion-text">
                                {{ $t('dashboard.items.trends.attention-flow.2') }}
                                <span class="fw-bold booking-highlight">
                                  {{ calculatedMetrics['booking.created'].bookingNumber }}
                                </span>
                                {{ $t('dashboard.items.trends.attention-flow.3') }}
                                <span class="fw-bold booking-highlight">
                                  {{
                                    calculatedMetrics['booking.created'].bookingFlow.datasets[1]
                                  }} </span
                                >.
                              </span>
                            </div>
                            <div class="col-12 col-md-4 m-1 centered">
                              <span class="booking-conclusion-text">
                                {{ $t('dashboard.items.trends.attention-flow.4') }}
                                <i class="bi bi-arrow-up-circle-fill green-icon">
                                  {{ $t('dashboard.items.trends.attention-flow.5') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-flow.6') }}
                                <span class="fw-bold booking-highlight">
                                  {{
                                    getPercentageBooking(
                                      calculatedMetrics['booking.created'].bookingFlow.datasets[1]
                                    )
                                  }}%
                                </span>
                                {{ $t('dashboard.items.trends.attention-flow.7') }}
                                <i class="bi bi-arrow-right-circle-fill red-icon">
                                  {{ $t('dashboard.items.trends.attention-flow.8') }}
                                </i>
                                {{ $t('dashboard.items.trends.attention-flow.6') }}
                                <span class="fw-bold booking-highlight">
                                  {{
                                    getDifference(
                                      getPercentageBooking(
                                        calculatedMetrics['booking.created'].bookingFlow.datasets[1]
                                      )
                                    )
                                  }}%.
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.11')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- booking-hour-distribution -->
                  <div
                    v-if="graphs['booking-hour-distribution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.booking-hour-distribution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{ $t('dashboard.items.attentions.graph.12') }}
                            </strong></span
                          >
                        </div>
                        <div class="centered booking-chart-container">
                          <LineChart
                            class="centered"
                            v-bind="calculatedMetrics.bookingHourDistributionProps"
                          />
                        </div>
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-clock-fill blue-icon booking-conclusion-icon">
                                {{ $t('dashboard.items.trends.booking-hour-distribution.1') }}
                              </i>
                            </div>
                            <div class="col-12 col-md-8 m-1 centered">
                              <span class="booking-conclusion-text">
                                {{ $t('dashboard.items.trends.booking-hour-distribution.2') }}
                                <span class="fw-bold booking-highlight">
                                  {{ getLocalHour(getMaxBookingAvgHour().label) }}:00
                                </span>
                                {{ $t('dashboard.items.trends.booking-hour-distribution.3') }}
                                <span class="fw-bold booking-highlight">
                                  {{ getMaxBookingAvgHour().data }}
                                </span>
                                {{ $t('dashboard.items.trends.booking-hour-distribution.4') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.12')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                  <!-- telemedicine-evolution -->
                  <div
                    v-if="graphs['telemedicine-evolution'] && commerce?.telemedicineEnabled"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.telemedicine-evolution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{
                                $t('dashboard.telemedicine.evolution.title') ||
                                'Evolución de Sesiones de Telemedicina'
                              }}
                            </strong></span
                          >
                        </div>
                        <div class="row">
                          <LineChart
                            class="centered"
                            v-bind="calculatedMetrics.telemedicineEvolutionProps"
                          />
                          <div class="metric-conclusion mt-3">
                            <div class="row centered">
                              <div class="col-12 col-md-2 m-1 centered">
                                <i class="bi bi-graph-up-arrow blue-icon">
                                  <span>
                                    {{
                                      $t('dashboard.telemedicine.evolution.trend') || 'Tendencia'
                                    }}
                                  </span>
                                </i>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{
                                    $t('dashboard.telemedicine.evolution.total') ||
                                    'Total de sesiones:'
                                  }}
                                  <span class="fw-bold">
                                    {{ calculatedMetrics['telemedicine.created']?.total || 0 }}
                                  </span>
                                  {{
                                    $t('dashboard.telemedicine.evolution.period') || 'en el período'
                                  }}
                                </span>
                              </div>
                              <div class="col-12 col-md-4 m-1 centered">
                                <span>
                                  {{
                                    $t('dashboard.telemedicine.evolution.completed') ||
                                    'Completadas:'
                                  }}
                                  <span class="fw-bold">
                                    {{ calculatedMetrics['telemedicine.created']?.completed || 0 }}
                                  </span>
                                  {{
                                    $t('dashboard.telemedicine.evolution.cancelled') ||
                                    'Canceladas:'
                                  }}
                                  <span class="fw-bold">
                                    {{ calculatedMetrics['telemedicine.created']?.cancelled || 0 }}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- booking-day-distribution -->
                  <div
                    v-if="graphs['booking-day-distribution']"
                    class="row row-cols-1 row-cols-md-1 g-2 mx-2"
                  >
                    <div
                      v-if="toggles['dashboard.booking-day-distribution.view']"
                      class="col d-flex align-items-stretch"
                    >
                      <div class="card col metric-card-graph centered">
                        <div class="metric-card-title">
                          <span
                            ><strong>
                              {{ $t('dashboard.items.attentions.graph.14') }}
                            </strong></span
                          >
                        </div>
                        <div class="centered booking-chart-container">
                          <LineChart
                            class="centered"
                            v-bind="calculatedMetrics.bookingDayDistributionProps"
                          />
                        </div>
                        <div class="metric-conclusion mt-3">
                          <div class="row centered">
                            <div class="col-12 col-md-2 m-1 centered">
                              <i class="bi bi-calendar-fill blue-icon booking-conclusion-icon">
                                {{ $t('dashboard.items.trends.booking-day-distribution.1') }}
                              </i>
                            </div>
                            <div class="col-12 col-md-8 m-1 centered">
                              <span class="booking-conclusion-text">
                                {{ $t('dashboard.items.trends.booking-day-distribution.2') }}
                                <span class="fw-bold booking-highlight">
                                  {{ getMaxBookingAvgDay().label }}
                                </span>
                                {{ $t('dashboard.items.trends.booking-day-distribution.3') }}
                                <span class="fw-bold booking-highlight">
                                  {{ getMaxBookingAvgDay().data }}
                                </span>
                                {{ $t('dashboard.items.trends.booking-day-distribution.4') }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      v-if="!downloading"
                      :icon="'graph-up-arrow'"
                      :title="$t('dashboard.items.attentions.graph.14')"
                      :content="$t('dashboard.message.2.content')"
                    />
                  </div>
                </div>
              </div>
              <div v-if="showBookings === true && !toggles['dashboard.graphs-bookings.view']">
                <Message
                  :icon="'graph-up-arrow'"
                  :title="$t('dashboard.message.1.title')"
                  :content="$t('dashboard.message.1.content')"
                />
              </div>
            </div>
          </div>
        </div>
        <PDFFooter :show="toggles['dashboard.reports.graphs']"></PDFFooter>
      </div>
    </div>
    <div v-if="showGraphs === true && !toggles['dashboard.graphs.view']">
      <Message
        :icon="'graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
  </div>
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1rem;
  font-weight: 600;
}
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-graph {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1.25rem 1rem;
  margin: 0.75rem 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
  will-change: transform, box-shadow;
}

.metric-card-graph::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  opacity: 0.8;
  transition: height 0.3s ease;
}

.metric-card-graph::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
  pointer-events: none;
}

.metric-card-graph:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.2);
}

.metric-card-graph:hover::before {
  height: 5px;
  opacity: 1;
}

.metric-card-graph:hover::after {
  left: 100%;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.metric-conclusion {
  padding: 0.75rem;
  margin: 0.75rem 0 0 0;
  font-size: 0.8rem;
  line-height: 1.4rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.03) 0%, rgba(0, 194, 203, 0.02) 100%);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-conclusion::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.metric-card-graph:hover .metric-conclusion {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.04) 100%);
  border-color: rgba(0, 74, 173, 0.1);
  transform: translateX(2px);
}

.metric-card-graph:hover .metric-conclusion::before {
  opacity: 1;
}

.metric-card-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  align-items: center;
  justify-content: center;
  display: flex;
  color: #000;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid rgba(0, 74, 173, 0.1);
  position: relative;
  transition: all 0.3s ease;
}

.metric-card-title::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  transition: width 0.3s ease;
}

.metric-card-graph:hover .metric-card-title::after {
  width: 60%;
}

.metric-card-title strong {
  color: var(--azul-turno);
  transition: color 0.3s ease;
}

.metric-card-graph:hover .metric-card-title strong {
  color: var(--verde-tu);
}

/* Enhanced graph container */
.centered {
  padding: 0.75rem 0;
  position: relative;
  transition: all 0.3s ease;
}

.centered canvas {
  transition: transform 0.3s ease;
}

.metric-card-graph:hover .centered canvas {
  transform: scale(1.02);
}

/* Improved conclusion styling */
.metric-conclusion .row {
  margin: 0;
}

.metric-conclusion .centered {
  padding: 0.35rem;
}

.metric-conclusion i {
  font-size: 1.25rem;
  margin-right: 0.5rem;
  transition: transform 0.3s ease, color 0.3s ease;
  display: inline-block;
}

.metric-conclusion:hover i {
  transform: scale(1.1) rotate(5deg);
}

.metric-conclusion .fw-bold {
  color: var(--azul-turno);
  font-weight: 700;
}

/* Badge improvements - Compact */
.badge {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.bg-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #446ffc 100%) !important;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 74, 173, 0.15);
}

.bg-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.25);
}

.bg-secondary {
  background: rgba(0, 0, 0, 0.08) !important;
  color: #000 !important;
  transition: all 0.3s ease;
}

.bg-secondary:hover {
  background: rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px);
}

/* Responsive improvements */
@media (max-width: 768px) {
  .metric-card-graph {
    padding: 1.5rem 1rem;
    margin: 0.75rem 0.25rem;
  }

  .metric-card-title {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .metric-conclusion {
    padding: 1rem;
    font-size: 0.8rem;
  }
}

@media (max-width: 576px) {
  .metric-card-graph {
    padding: 1.25rem 0.75rem;
  }

  .metric-card-title {
    font-size: 0.85rem;
  }
}

/* Booking-specific graph enhancements */
.booking-chart-container {
  padding: 1rem 0;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.booking-status-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.25rem 0;
}

.booking-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.02) 0%, rgba(0, 194, 203, 0.01) 100%);
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.booking-status-row:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.04) 0%, rgba(0, 194, 203, 0.02) 100%);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.booking-status-label {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}

.booking-status-badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.booking-count-badge {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  min-width: 2.5rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.08) !important;
  color: #000 !important;
}

.booking-percentage-badge {
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  min-width: 3rem;
  text-align: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, #446ffc 100%) !important;
}

.booking-divider {
  margin: 1.5rem 0 1rem 0;
  border: none;
  border-top: 2px solid rgba(0, 74, 173, 0.1);
  opacity: 0.5;
}

.booking-conclusion-icon {
  font-size: 1.5rem;
  margin-right: 0.5rem;
  color: var(--azul-turno);
}

.booking-conclusion-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.8);
}

.booking-highlight {
  color: var(--azul-turno);
  font-weight: 700;
  font-size: 1.05rem;
}

/* Compact metric rows styling */
.col-12.mt-1 .row.centered {
  padding: 0.25rem 0;
  margin: 0;
}

.col-12.mt-1 .row.centered .col-6,
.col-12.mt-1 .row.centered .col-2,
.col-12.mt-1 .row.centered .col-4 {
  padding: 0.25rem 0.5rem;
}

.col-12.mt-1 .badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.col-12.mt-1 .metric-card-title {
  font-size: 0.85rem;
  margin: 0;
  padding: 0;
}

.col-12.mt-1 .metric-card-subtitle {
  font-size: 0.75rem;
}

/* Responsive adjustments for booking graphs */
@media (max-width: 768px) {
  .booking-chart-container {
    padding: 1rem 0;
    min-height: 250px;
  }

  .booking-status-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }

  .booking-status-badges {
    width: 100%;
    justify-content: flex-start;
  }

  .booking-conclusion-text {
    font-size: 0.875rem;
  }

  .booking-highlight {
    font-size: 1rem;
  }
}

@media (max-width: 576px) {
  .booking-chart-container {
    padding: 0.75rem 0;
    min-height: 200px;
  }

  .booking-status-label {
    font-size: 0.875rem;
  }

  .booking-count-badge,
  .booking-percentage-badge {
    padding: 0.4rem 0.7rem;
    font-size: 0.8rem;
    min-width: auto;
  }

  .booking-conclusion-icon {
    font-size: 1.25rem;
  }

  .booking-conclusion-text {
    font-size: 0.8rem;
  }
}
</style>
