<script>
import Spinner from '../../components/common/Spinner.vue';
import { LineChart, DoughnutChart, BarChart } from 'vue-chart-3';
import Message from '../../components/common/Message.vue';
import SimpleDownloadCard from '../../components/reports/SimpleDownloadCard.vue';
import html2pdf from "html2pdf.js";
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
    html2pdf,
    PDFHeader,
    PDFFooter,
    Spinner
  },
  props: {
    showGraphs: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    graphs: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined }
  },
  data() {
    return {
      loading: false,
      downloading: false
    }
  },
  methods: {
    getPastPeriodPercentage(period) {
      if (period && period.number >= 0) {
        const percentage = period.number * 100 / (this.calculatedMetrics['attention.created'].attentionNumber === 0 ? 1 : this.calculatedMetrics['attention.created'].attentionNumber);
        return parseFloat(percentage.toFixed(2));
      }
      return 0;
    },
    getPastMonthPercentage(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod) {
        const percentage = pastPeriod.number * 100 / currentPeriod.number;
        return percentage === Infinity ? pastPeriod.number * 100 : parseFloat(percentage.toFixed(2)) || pastPeriod.number * 100;
      }
      return 0;
    },
    getPercentage(number) {
      const percentage = (number * 100) / this.calculatedMetrics['attention.created'].attentionNumber;
      return parseFloat(percentage.toFixed(2), 2) || 0;
    },
    getDifference(percentage) {
      return parseFloat((100 - percentage).toFixed(2), 2) || 0; ;
    },
    getTrendIcon(compareActual, comparePrevious) {
      if (compareActual < comparePrevious) {
        return 'bi-arrow-down-circle-fill red-icon'
      } else if (compareActual === comparePrevious) {
        return 'bi-circle-fill blue-icon'
      } else {
        return 'bi-arrow-up-circle-fill green-icon'
      }
    },
    getMaxAvgTime() {
      const arr = this.calculatedMetrics["attention.created"].durationFlow.datasets;
      return arr.reduce((a, b) => Math.max(a, b), -Infinity);
    },
    getMinAvgTime() {
      const arr = this.calculatedMetrics["attention.created"].durationFlow.datasets;
      return arr.reduce((a, b) => Math.min(a, b), 100000000);
    },
    getMaxAvgHour() {
      const arr = this.calculatedMetrics["attention.created"].hourDistribution.datasets;
      const max = JSON.parse(JSON.stringify(arr)).reduce((a, b) => Math.max(a, b), -Infinity);
      const ind = arr.indexOf(max.toString());
      return {
        label: this.calculatedMetrics["attention.created"].hourDistribution.labels[ind],
        data: max
      }
    },
    getLocalHour(hour) {
      const date = new Date();
      const hourDate = new Date(date.setHours(hour));
      if (this.commerce.country) {
        if (this.commerce.country === 've') {
          return hourDate.getHours() - 4;
        } else if (['br', 'cl'].includes(this.commerce.country)) {
          return hourDate.getHours() - 3;
        } else {
          return hourDate.getHours();
        }
      }
    },
    surveyLabel(label) {
      const labels = {
        'TERMINATED': 'INITIATED',
        'RATED': 'TERMINATED'
      };
      return labels[label];
    },
    exportToPDF() {
      this.loading = true;
      this.downloading = true;
      const filename = `graphs-${this.commerce.name}-${this.commerce.tag}-${this.startDate}-${this.endDate}.pdf`;
      const options = {
				margin: .5,
  			filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};
      let doc = document.getElementById("graphs-component");
      document.getElementById("pdf-header").style.display = "block";
      document.getElementById("pdf-footer").style.display = "block";
      setTimeout(() => {
        html2pdf().set(options).from(doc).save().then(() => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          doc = undefined;
          this.loading = false;
          this.downloading = false;
        }).catch(error => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          doc = undefined;
          this.loading = false;
          this.downloading = false;
        });
      }, 2100);
    }
  }
}
</script>

<template>
  <div id="graphs" class="row" v-if="showGraphs === true && toggles['dashboard.graphs.view']">
    <SimpleDownloadCard
      :download="toggles['dashboard.reports.graphs']"
      :title="$t('dashboard.reports.graphs.title')"
      :showTooltip="true"
      :description="$t('dashboard.reports.graphs.description')"
      :icon="'bi-file-earmark-pdf'"
      :canDownload="toggles['dashboard.reports.graphs'] === true"
      @download="exportToPDF"
    ></SimpleDownloadCard>
    <Spinner :show="loading"></Spinner>
    <div id="graphs-component">
      <PDFHeader
        :show="toggles['dashboard.reports.graphs']"
        :title="$t('dashboard.reports.graphs.title')"
        :startDate="startDate"
        :endDate="endDate"
        :commerce="commerce"
      >
      </PDFHeader>
      <!-- cards desktop -->
      <div class="d-block">
        <!-- attention-number-evolution -->
        <div v-if="graphs['attention-number-evolution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-number-evolution.view']" class="col d-flex align-items-stretch">
            <div class="card col metric-card-graph centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.1') }} </strong></span>
              </div>
              <div class="row">
                <LineChart class="centered" v-bind="calculatedMetrics.attentionNumberEvolutionProps" />
                <div class="metric-conclusion mt-3">
                  <div class="row centered">
                    <div class="col-12 col-md-2 m-1 centered">
                      <i :class="getTrendIcon(
                        calculatedMetrics['attention.created'].attentionNumber,
                        calculatedMetrics['attention.created'].pastPeriodAttentionNumber.number)">
                        <span> {{ $t('dashboard.items.trends.attention-number-evolution.1') }} </span>
                      </i>
                    </div>
                    <div class="col-12 col-md-4 m-1 centered">
                      <span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.2') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].attentionNumber }} </span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                        {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                        <span class="fw-bold"> {{ (calculatedMetrics["attention.created"].dailyAvg || 0).toFixed(2) }} </span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.11') }}
                      </span>
                    </div>
                    <div class="col-12 col-md-4 m-1 centered">
                      <span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.4') }}
                          <span class="fw-bold"> {{ getPastPeriodPercentage(calculatedMetrics['attention.created'].pastPeriodAttentionNumber) }}% </span>
                          {{ $t('dashboard.items.trends.attention-number-evolution.5') }} <span class="fw-bold"> ({{ calculatedMetrics['attention.created'].pastPeriodAttentionNumber.number }}). </span>
                          {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                          <span class="fw-bold"> {{ (calculatedMetrics["attention.created"].pastPeriodAttentionNumber.dailyAvg || 0).toFixed(2) }} </span>
                          {{ $t('dashboard.items.trends.attention-number-evolution.11') }}
                      </span>
                    </div>
                  </div>
                  <hr>
                  <div class="row centered mt-1">
                    <div class="col-12 col-md-2 m-1 centered">
                      <i :class="getTrendIcon(
                        calculatedMetrics['attention.created'].currentMonthAttentionNumber.number,
                        calculatedMetrics['attention.created'].pastMonthAttentionNumber.number)">
                        <span> {{ $t('dashboard.items.trends.attention-number-evolution.6') }} </span>
                      </i>
                    </div>
                    <div class="col-12 col-md-4 m-1 centered">
                      <span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.7') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].currentMonthAttentionNumber.number }} </span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                      </span>
                    </div>
                    <div class="col-12 col-md-4 m-1 centered">
                      <span>
                        {{ $t('dashboard.items.trends.attention-number-evolution.8') }}
                          <span class="fw-bold"> {{ calculatedMetrics['attention.created'].pastMonthAttentionNumber.number }} </span>
                          {{ $t('dashboard.items.trends.attention-number-evolution.3') }}
                          {{ $t('dashboard.items.trends.attention-number-evolution.10') }}
                          <span class="fw-bold"> {{ (calculatedMetrics["attention.created"].pastMonthAttentionNumber.dailyAvg || 0).toFixed(2) }} </span>
                          {{ $t('dashboard.items.trends.attention-number-evolution.11') }}

                          {{ $t('dashboard.items.trends.attention-number-evolution.9') }}
                          <span class="fw-bold"> {{ getPastMonthPercentage(calculatedMetrics['attention.created'].pastMonthAttentionNumber,
                          calculatedMetrics['attention.created'].currentMonthAttentionNumber) }}%. </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.1')"
            :content="$t('dashboard.message.2.content')" />
        </div>
         <!-- attention-number-queue -->
        <div v-if="graphs['attention-number-queue']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-number-queue.view']" class="col d-flex align-items-stretch">
            <div class="card col metric-card-graph centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.2') }} </strong></span>
              </div>
              <div class="row">
                <DoughnutChart class="centered" v-bind="calculatedMetrics.attentionQueuesProps" />
                <div class="col-12 mt-2">
                  <div class="row centered m-1" v-for="(option, ind) in calculatedMetrics['attention.created'].attentionQueues.labels" :key="`option.${ind}`">
                    <div class="col-6 centered">
                      <span class="metric-card-title fw-bold"> {{ option }} </span>
                    </div>
                    <div class="col-2 centered">
                      <span class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ calculatedMetrics['attention.created'].attentionQueues.datasets[ind] }} </span>
                    </div>
                    <div class="col-4 centered">
                    <span class="badge rounded-pill bg-primary metric-card-subtitle"> {{ getPercentage(calculatedMetrics['attention.created'].attentionQueues.datasets[ind]) }} % </span>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.2')"
            :content="$t('dashboard.message.2.content')" />
        </div>
         <!-- attention-flow -->
        <div v-if="graphs['attention-flow']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-flow.view']" class="col">
            <div class="card metric-card-graph h6 centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.3') }} </strong></span>
              </div>
              <BarChart class="centered" v-bind="calculatedMetrics.attentionFlowProps" />
              <div class="col-12 mt-2">
                <div class="row centered m-1" v-for="(option, ind) in calculatedMetrics['attention.created'].attentionFlow.labels" :key="`option.${ind}`">
                  <div class="col-6 centered">
                    <span class="metric-card-title fw-bold"> {{ option }} </span>
                  </div>
                  <div class="col-2 centered">
                    <span class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ calculatedMetrics['attention.created'].attentionFlow.datasets[ind] }} </span>
                  </div>
                  <div class="col-4 centered">
                    <span class="badge rounded-pill bg-primary metric-card-subtitle"> {{ getPercentage(calculatedMetrics['attention.created'].attentionFlow.datasets[ind]) }} % </span>
                  </div>
                </div>
                <hr class="mb-2">
              </div>
              <div class="metric-conclusion mt-1">
                <div class="row centered">
                  <div class="col-12 col-md-2 m-1 centered">
                    <i class="bi bi-funnel-fill blue-icon"> {{ $t('dashboard.items.trends.attention-flow.1') }}</i>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-flow.2') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].attentionNumber }} </span>
                        {{ $t('dashboard.items.trends.attention-flow.3') }}
                        <span class="fw-bold"> {{ calculatedMetrics["attention.created"].attentionFlow.datasets[2] }} </span>.
                    </span>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-flow.4') }} <i class="bi bi-arrow-up-circle-fill green-icon"> {{ $t('dashboard.items.trends.attention-flow.5') }} </i> {{ $t('dashboard.items.trends.attention-flow.6') }}
                        <span class="fw-bold"> {{ getPercentage(calculatedMetrics["attention.created"].attentionFlow.datasets[2]) }}% </span>
                      {{ $t('dashboard.items.trends.attention-flow.7') }} <i class="bi bi-arrow-right-circle-fill red-icon"> {{ $t('dashboard.items.trends.attention-flow.8') }} </i> {{ $t('dashboard.items.trends.attention-flow.6') }} <span class="fw-bold"> {{ getDifference(getPercentage(calculatedMetrics["attention.created"].attentionFlow.datasets[2])) }}%. </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.3')"
            :content="$t('dashboard.message.2.content')" />
        </div>
        <!-- survey-flow -->
        <div v-if="graphs['survey-flow']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.survey-flow.view']" class="col">
            <div class="card metric-card-graph h6 centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.7') }} </strong></span>
              </div>
              <BarChart class="centered" v-bind="calculatedMetrics.surveyFlowProps" />
              <div class="col-12 mt-2">
                <div class="row centered m-1" v-for="(option, ind) in calculatedMetrics['attention.created'].surveyFlow.labels" :key="`option.${ind}`">
                  <div class="col-6 centered">
                    <span class="metric-card-title fw-bold"> {{ surveyLabel(option) }} </span>
                  </div>
                  <div class="col-2 centered">
                    <span class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ calculatedMetrics['attention.created'].surveyFlow.datasets[ind] }} </span>
                  </div>
                  <div class="col-4 centered">
                    <span class="badge rounded-pill bg-primary metric-card-subtitle"> {{ getPercentage(calculatedMetrics['attention.created'].surveyFlow.datasets[ind]) }} % </span>
                  </div>
                </div>
                <hr class="mb-2">
              </div>
              <div class="metric-conclusion mt-1">
                <div class="row centered">
                  <div class="col-12 col-md-2 m-1 centered">
                    <i class="bi bi-funnel-fill blue-icon"> {{ $t('dashboard.items.trends.survey-flow.1') }}</i>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.survey-flow.2') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].attentionNumber }} </span>
                        {{ $t('dashboard.items.trends.survey-flow.3') }}
                        <span class="fw-bold"> {{ calculatedMetrics["attention.created"].surveyFlow.datasets[1] }} </span>.
                    </span>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.survey-flow.4') }} <i class="bi bi-arrow-up-circle-fill green-icon"> {{ $t('dashboard.items.trends.survey-flow.5') }} </i> {{ $t('dashboard.items.trends.survey-flow.6') }}
                        <span class="fw-bold"> {{ getPercentage(calculatedMetrics["attention.created"].surveyFlow.datasets[1]) }}% </span>
                      {{ $t('dashboard.items.trends.survey-flow.7') }} <i class="bi bi-arrow-right-circle-fill red-icon"> {{ $t('dashboard.items.trends.survey-flow.8') }} </i> {{ $t('dashboard.items.trends.survey-flow.6') }} <span class="fw-bold"> {{ getDifference(getPercentage(calculatedMetrics["attention.created"].surveyFlow.datasets[1])) }}%. </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.7')"
            :content="$t('dashboard.message.2.content')" />
        </div>
        <!-- attention-duration-evolution -->
        <div v-if="graphs['attention-duration-evolution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-duration-evolution.view']" class="col d-flex align-items-stretch">
            <div class="card col metric-card-graph centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.4') }} </strong></span>
              </div>
              <LineChart class="centered" v-bind="calculatedMetrics.attentionDurationEvolutionProps" />
              <div class="metric-conclusion mt-3">
                <div class="row centered">
                  <div class="col-12 col-md-2 m-1 centered">
                    <i class="bi bi-clock-fill blue-icon"> {{ $t('dashboard.items.trends.attention-duration-evolution.1') }} </i>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.2') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].avgDuration }} </span>.
                    </span>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.3') }}
                        <i class="bi bi-arrow-up-circle-fill green-icon"> {{ $t('dashboard.items.trends.attention-duration-evolution.4') }} </i>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                        <span class="fw-bold"> {{ getMaxAvgTime() }} </span>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.6') }} <i class="bi bi-arrow-down-circle-fill red-icon">
                      {{ $t('dashboard.items.trends.attention-duration-evolution.7') }} </i> {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
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
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.4')"
            :content="$t('dashboard.message.2.content')" />
        </div>
        <!-- attention-rate-duration-evolution -->
        <div v-if="graphs['attention-rate-duration-evolution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-rate-duration-evolution.view']" class="col d-flex align-items-stretch">
            <div class="card col metric-card-graph centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.6') }} </strong></span>
              </div>
              <LineChart class="centered" v-bind="calculatedMetrics.attentionRateDurationEvolutionProps" />
              <div class="metric-conclusion mt-3">
                <div class="row centered">
                  <div class="col-12 col-md-2 m-1 centered">
                    <i class="bi bi-clock-fill blue-icon"> {{ $t('dashboard.items.trends.attention-rate-duration-evolution.1') }} </i>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-rate-duration-evolution.2') }}
                        <span class="fw-bold"> {{ calculatedMetrics['attention.created'].avgRateDuration }} </span>.
                    </span>
                  </div>
                  <div class="col-12 col-md-4 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.3') }}
                        <i class="bi bi-arrow-up-circle-fill green-icon"> {{ $t('dashboard.items.trends.attention-duration-evolution.4') }} </i>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
                        <span class="fw-bold"> {{ getMaxAvgTime() }} </span>
                      {{ $t('dashboard.items.trends.attention-duration-evolution.6') }} <i class="bi bi-arrow-down-circle-fill red-icon">
                      {{ $t('dashboard.items.trends.attention-duration-evolution.7') }} </i> {{ $t('dashboard.items.trends.attention-duration-evolution.5') }}
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
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.6')"
            :content="$t('dashboard.message.2.content')" />
        </div>
        <!-- attention-hour-distribution -->
        <div v-if="graphs['attention-hour-distribution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
          <div v-if="toggles['dashboard.attention-hour-distribution.view']" class="col d-flex align-items-stretch">
            <div class="card col metric-card-graph centered">
              <div class="metric-card-title">
                <span><strong> {{ $t('dashboard.items.attentions.graph.5') }} </strong></span>
              </div>
              <LineChart class="centered" v-bind="calculatedMetrics.attentionHourDistributionProps" />
              <div class="metric-conclusion mt-3">
                <div class="row centered">
                  <div class="col-12 col-md-2 m-1 centered">
                    <i class="bi bi-clock-fill blue-icon"> {{ $t('dashboard.items.trends.attention-hour-distribution.1') }} </i>
                  </div>
                  <div class="col-12 col-md-8 m-1 centered">
                    <span>
                      {{ $t('dashboard.items.trends.attention-hour-distribution.2') }}
                        <span class="fw-bold"> {{ getLocalHour(getMaxAvgHour().label) }}:00 </span>
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
          <Message v-if="!downloading"
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.items.attentions.graph.5')"
            :content="$t('dashboard.message.2.content')" />
        </div>
      </div>
      <PDFFooter
        :show="toggles['dashboard.reports.graphs']"
      ></PDFFooter>
    </div>
  </div>
  <div v-if="showGraphs === true && !toggles['dashboard.graphs.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')" />
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
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-graph {
  background-color: var(--color-background);
  padding: 1.5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-conclusion {
  padding: .5rem;
  margin: .5rem;
  font-size: .8rem;
  line-height: .9rem;
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>