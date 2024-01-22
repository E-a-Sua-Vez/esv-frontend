<script>
import { ref, watch, reactive, onBeforeMount, computed, toRefs } from 'vue';
import Popper from "vue3-popper";
import Spinner from '../common/Spinner.vue';
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import html2pdf from "html2pdf.js";
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';
import { getSurveyEvolutionMetrics, getSurveysEvolution } from '../../application/services/query-stack';
import { Chart, registerables } from 'chart.js';
import { LineChart, useBarChart } from 'vue-chart-3';
import AttentionRatingDetails from './domain/AttentionRatingDetails.vue';
import AttentionNPSDetails from './domain/AttentionNPSDetails.vue';
import AttentionCommentsDetails from './domain/AttentionCommentsDetails.vue';

Chart.register(...registerables);

export default {
  name: 'DashboardSurveysConsolidated',
  components: {
    Spinner,
    SimpleCard,
    DetailsCard,
    Message,
    html2pdf,
    SimpleDownloadCard,
    PDFHeader,
    PDFFooter,
    LineChart,
    Popper,
    AttentionRatingDetails,
    AttentionNPSDetails,
    AttentionCommentsDetails
  },
  props: {
    showSurveyConsolidated: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined }
  },
  async setup(props) {
    let loading = ref(false);
    let alertError = ref('');

    const {
      showSurveyConsolidated,
      toggles,
      startDate,
      endDate,
      commerce,
      queues
    } = toRefs(props);

    const state = reactive({
      detailsOpened: false,
      queueId: undefined,
      showFilterOptions: false,
      dateType: 'month',
      calculatedSurveyMetrics: {},
      evolution: {},
      calculatedSurveyMetricsYear: {},
      calculatedSurveyMetricsLastMonth: {},
      graphs: {
        'surveys-consolidated-nps-evolution': false,
        'surveys-consolidated-nps-evolution': false
      },
      surveysConsolidatedNPSEvolutionProps: {},
      extendedNpsEntity: false,
      extendedCsatEntity: false,
      npsScore: [],
      npsDistribution: [],
      csatScore: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        await refresh();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const resetGraphsVisibility = () => {
      state.graphs = {
        'surveys-consolidated-nps-evolution': false
      };
    }

    const checkGraphsVisibility = () => {
      if (state.evolution.datasets.length > 0) {
        if (toggles.value['dashboard.surveys-consolidated-nps-evolution.view']) {
          state.graphs['surveys-consolidated-nps-evolution'] = true;
        }
        if (toggles.value['dashboard.surveys-consolidated-csat-evolution.view']) {
          state.graphs['surveys-consolidated-csat-evolution'] = true;
        }
      }
    }

    const getCalculatedSurveyMetrics = async () => {
      const resultByMonth = await getSurveyEvolutionMetrics(commerce.value.id, state.queueId, undefined, undefined, 'month');
      state.calculatedSurveyMetrics = resultByMonth.calculatedSurveyMetrics;
      state.evolution = resultByMonth.evolution;
      const resultByYear = await getSurveysEvolution(commerce.value.id, undefined, undefined, state.queueId, 'year');
      if (resultByYear && resultByYear.length > 0) {
        state.calculatedSurveyMetricsYear = resultByYear[resultByYear.length - 1];
        state.npsScore = [
          { nps: 10, counter: state.calculatedSurveyMetricsYear.totalNps10 || 0 },
          { nps: 9, counter: state.calculatedSurveyMetricsYear.totalNps9 || 0 },
          { nps: 8, counter: state.calculatedSurveyMetricsYear.totalNps8 || 0 },
          { nps: 7, counter: state.calculatedSurveyMetricsYear.totalNps7 || 0 },
          { nps: 6, counter: state.calculatedSurveyMetricsYear.totalNps6 || 0 },
          { nps: 5, counter: state.calculatedSurveyMetricsYear.totalNps5 || 0 },
          { nps: 4, counter: state.calculatedSurveyMetricsYear.totalNps4 || 0 },
          { nps: 3, counter: state.calculatedSurveyMetricsYear.totalNps3 || 0 },
          { nps: 2, counter: state.calculatedSurveyMetricsYear.totalNps2 || 0 },
          { nps: 1, counter: state.calculatedSurveyMetricsYear.totalNps1 || 0 }
        ];
        state.npsDistribution = {
          detractors: {
            counter: state.calculatedSurveyMetricsYear.totalDetractors || 0,
            avg: npsScorePercentage(state.calculatedSurveyMetricsYear.countNPS, state.calculatedSurveyMetricsYear.totalDetractors)
          },
          promoters: {
            counter: state.calculatedSurveyMetricsYear.totalPromoters || 0,
            avg: npsScorePercentage(state.calculatedSurveyMetricsYear.countNPS, state.calculatedSurveyMetricsYear.totalPromoters)
          },
          neutrals: {
            counter: state.calculatedSurveyMetricsYear.totalNeutrals || 0,
            avg: npsScorePercentage(state.calculatedSurveyMetricsYear.countNPS, state.calculatedSurveyMetricsYear.totalNeutrals)
          }
        };
        state.csatScore = {
          totalRating5: state.calculatedSurveyMetricsYear.totalRating5 || 0,
          totalRating4: state.calculatedSurveyMetricsYear.totalRating4 || 0,
          totalRating3: state.calculatedSurveyMetricsYear.totalRating3 || 0,
          totalRating2: state.calculatedSurveyMetricsYear.totalRating2 || 0,
          totalRating1: state.calculatedSurveyMetricsYear.totalRating1 || 0,
          totalRating0: state.calculatedSurveyMetricsYear.totalRating0|| 0,
        },
        state.sentimentDistribution = {
          totalSentimentBad: state.calculatedSurveyMetricsYear.totalSentimentBad || 0,
          totalSentimentNeutral: state.calculatedSurveyMetricsYear.totalSentimentNeutral || 0,
          totalSentimentGood: state.calculatedSurveyMetricsYear.totalSentimentGood || 0
        }
      }
    }

    const refresh = async () => {
      try {
        loading.value = true;
        resetGraphsVisibility();
        await getCalculatedSurveyMetrics();
        checkGraphsVisibility();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? error.response ? error.respose.status : 500 : 500;
        loading.value = false;
      }
    }

    const clear = () => {
      state.queueId = undefined;
    }

    const showFilters = () => {
      state.showFilterOptions = !state.showFilterOptions
    }

    const exportToPDF = () => {
      loading.value = true;
      state.detailsOpened = true;
      const filename = `surveys-consolidated-${commerce.value.name}-${commerce.value.tag}.pdf`;
      const options = {
				margin: .5,
  			filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};
      let doc = document.getElementById("survey-consolidated-component");
      document.getElementById("pdf-header").style.display = "block";
      document.getElementById("pdf-footer").style.display = "block";
      setTimeout(() => {
        html2pdf().set(options).from(doc).save().then(() => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          state.detailsOpened = false;
          loading.value = false;
          doc = undefined;
        }).catch(error => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          state.detailsOpened = false;
          loading.value = false;
          doc = undefined;
        });
      }, 2000);
    }

    const surveysConsolidatedNPSEvolution = computed(() => {
      const data = state.evolution;
      if (data && data.labels) {
        return {
        labels: data.labels || [],
        datasets: [
          {
            label: 'NPS',
            boxWidth: 10,
            borderColor: '#a52a2a',
            backgroundColor: '#a52a2a',
            borderDash: [2, 2],
            data: !data.datasets ? [] : data.datasets.map(data => data.nps),
            fill: false,
            radius: 3,
            tension: .2,
            type: 'line'
          }
        ],
        options: {
          fill: false,
          radius: 0,
        }
        }
      }
    });
    const { barChartProps: surveysConsolidatedNPSEvolutionProps } = useBarChart({ chartData: surveysConsolidatedNPSEvolution });

    const surveysConsolidatedCSATEvolution = computed(() => {
      const data = state.evolution;
      if (data && data.labels) {
        return {
        labels: data.labels || [],
        datasets: [
          {
            label: 'CSAT',
            boxWidth: 10,
            borderColor: '#2f407a',
            backgroundColor: '#2f407a',
            borderDash: [2, 2],
            data: !data.datasets ? [] : data.datasets.map(data => data.rating),
            fill: false,
            radius: 3,
            tension: .2,
            type: 'line'
          }
        ],
        options: {
          fill: false,
          radius: 0,
        }
        }
      }
    });
    const { barChartProps: surveysConsolidatedCSATEvolutionProps } = useBarChart({ chartData: surveysConsolidatedCSATEvolution });


    const changeData = computed(() => {
      const { queueId, dateType } = state;
      return {
        queueId,
        dateType
      }
    })

    const clasifyNpsScore = (score) => {
      if (!score) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (score <= 5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (score <= 8) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    }

    const npsScorePercentage = (total, score) => {
      return parseFloat((score * 100 / total).toFixed(2), 2) || 0;
    }

    const showDetailsNps = () => {
      state.extendedNpsEntity = !state.extendedNpsEntity;
    }

    const showDetailsCsat = () => {
      state.extendedCsatEntity = !state.extendedCsatEntity;
    }

    watch (
      changeData,
      async () => {
        await refresh();
      }
    )

    return {
      state,
      loading,
      alertError,
      changeData,
      surveysConsolidatedNPSEvolutionProps,
      surveysConsolidatedCSATEvolutionProps,
      showSurveyConsolidated,
      toggles,
      startDate,
      endDate,
      queues,
      showDetailsNps,
      showDetailsCsat,
      npsScorePercentage,
      clasifyNpsScore,
      clear,
      showFilters,
      exportToPDF,
    }
  }
}
</script>

<template>
  <div id="surveys-consolidated" class="row" v-if="showSurveyConsolidated === true && toggles['dashboard.surveys-consolidated.view']">
    <div v-if="state.calculatedSurveyMetricsYear">
      <SimpleDownloadCard
        :download="toggles['dashboard.reports.surveys-consolidated']"
        :title="$t('dashboard.reports.surveys-consolidated.title')"
        :showTooltip="true"
        :description="$t('dashboard.reports.surveys-consolidated.description')"
        :icon="'bi-file-earmark-pdf'"
        @download="exportToPDF"
        :canDownload="toggles['dashboard.reports.surveys-consolidated'] === true"
      ></SimpleDownloadCard>
      <Spinner :show="loading"></Spinner>
      <div>
        <div class="my-2 row metric-card" v-if="queues && queues.length > 1">
          <div class="col-12">
            <span class="metric-card-subtitle">
              <span class="form-check-label metric-keyword-subtitle" @click="showFilters()"> <i class="bi bi-funnel-fill"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${state.showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
            </span>
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
              @click="clear()">
              <span><i class="bi bi-eraser-fill"></i></span>
            </button>
          </div>
          <div v-if="state.showFilterOptions">
            <div class="col-12 col-md my-1 filter-card" v-if="queues && queues.length > 1">
              <label class="metric-card-subtitle mx-2" for="select-queue"> {{ $t("dashboard.queue") }} </label>
              <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="state.queueId">
                <option v-for="queue in queues" :key="queue.name" :value="queue.id" id="select-queue">{{ queue.name }}</option>
              </select>
            </div>
          </div>
        </div>
        <div id="survey-consolidated-component">
          <PDFHeader
            :show="toggles['dashboard.reports.surveys-consolidated']"
            :title="$t('dashboard.reports.surveys-consolidated.title')"
            :startDate="startDate"
            :endDate="endDate"
            :commerce="commerce"
          >
          </PDFHeader>
          <div class="d-block mt-3">
            <div class="metric-card h4">
              <div class="metric-card-title centered">
                <span> {{ $t('dashboard.items.attentions.26')}}  </span>
              </div>
              <div class="centered mb-2">
                <span class="fw-bold px-2">
                  {{ state.calculatedSurveyMetricsYear.date }}
                </span>
              </div>
              <hr>
              <div id="attention-rating-avg">
                <DetailsCard
                  :show="toggles['dashboard.attention-rating-avg.view']"
                  :data="parseFloat((+state.calculatedSurveyMetricsYear.avgRating || 0).toFixed(2), 2)"
                  :subdata="+state.calculatedSurveyMetricsYear.countRating || 0"
                  :title="$t('dashboard.items.attentions.3')"
                  :showTooltip="true"
                  :description="$t('dashboard.rating')"
                  :icon="'bi-star-fill'"
                  :iconStyleClass="'yellow-icon'"
                  :detailsOpened="state.detailsOpened"
                  >
                  <template v-slot:details>
                    <AttentionRatingDetails
                      :show="toggles['dashboard.attention-rating-avg.view']"
                      :count="+state.calculatedSurveyMetricsYear.countRating || 0"
                      :min="+state.calculatedSurveyMetricsYear.minRating || 0"
                      :max="+state.calculatedSurveyMetricsYear.maxRating || 0"
                      :messages="[]"
                      :score="state.csatScore || []"
                      :limit="5"
                    >
                    </AttentionRatingDetails>
                  </template>
                </DetailsCard>
              </div>
              <div id="attention-nps-avg">
                <DetailsCard
                  :show="toggles['dashboard.attention-nps-avg.view']"
                  :data="parseFloat((+state.calculatedSurveyMetricsYear.nps || 0).toFixed(2), 2)"
                  :subdata="+state.calculatedSurveyMetricsYear.countNPS || 0"
                  :title="$t('dashboard.items.attentions.24')"
                  :showTooltip="true"
                  :description="$t('dashboard.nps')"
                  :icon="'bi-megaphone-fill'"
                  :detailsOpened="state.detailsOpened"
                  >
                  <template v-slot:details>
                    <AttentionNPSDetails
                      :show="toggles['dashboard.attention-nps-avg.view']"
                      :min="+state.calculatedSurveyMetricsYear.minNPS || 0"
                      :max="+state.calculatedSurveyMetricsYear.maxNPS || 0"
                      :score="state.npsScore || []"
                      :distribution="state.npsDistribution"
                      :count="+state.calculatedSurveyMetricsYear.countNPS || 0"
                      :limit="10"
                    >
                    </AttentionNPSDetails>
                  </template>
                </DetailsCard>
              </div>
              <div id="attention-comments-avg">
                <DetailsCard
                  :show="toggles['dashboard.attention-comments-avg.view']"
                  :data="parseFloat((+state.calculatedSurveyMetricsYear.avgSentiment || 0).toFixed(2), 2)"
                  :subdata="+state.calculatedSurveyMetricsYear.countSentiment || 0"
                  :title="$t('dashboard.items.attentions.21')"
                  :showTooltip="true"
                  :description="$t('dashboard.sentiment')"
                  :icon="'bi-chat-heart-fill'"
                  :iconStyleClass="'red-icon'"
                  :detailsOpened="state.detailsOpened"
                  >
                  <template v-slot:details>
                    <AttentionCommentsDetails
                      :show="toggles['dashboard.attention-comments-avg.view']"
                      :messages="undefined"
                      :min="+state.calculatedSurveyMetricsYear.minSentiment"
                      :max="+state.calculatedSurveyMetricsYear.maxSentiment"
                      :distribution="state.sentimentDistribution"
                      :limit="5"
                    >
                    </AttentionCommentsDetails>
                  </template>
                </DetailsCard>
              </div>
            </div>
            <!--surveys-consolidated-nps-evolution -->
            <div v-if="state.graphs['surveys-consolidated-nps-evolution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
              <div v-if="toggles['dashboard.surveys-consolidated-nps-evolution.view']" class="col d-flex align-items-stretch">
                <div class="card col metric-card-graph centered">
                  <div class="metric-card-title">
                    <span> {{ $t('dashboard.items.attentions.graph.8') }} </span>
                  </div>
                  <div class="row">
                    <LineChart class="centered" v-bind="surveysConsolidatedNPSEvolutionProps" />
                    <div class="metric-conclusion mt-3">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <Message
                :icon="'bi-graph-up-arrow'"
                :title="$t('dashboard.items.attentions.graph.8')"
                :content="$t('dashboard.message.2.content')" />
            </div>
            <!--surveys-consolidated-csat-evolution -->
            <div v-if="state.graphs['surveys-consolidated-csat-evolution']" class="row row-cols-1 row-cols-md-1 g-2 mx-2">
              <div v-if="toggles['dashboard.surveys-consolidated-csat-evolution.view']" class="col d-flex align-items-stretch">
                <div class="card col metric-card-graph centered">
                  <div class="metric-card-title">
                    <span> {{ $t('dashboard.items.attentions.graph.9') }} </span>
                  </div>
                  <div class="row">
                    <LineChart class="centered" v-bind="surveysConsolidatedCSATEvolutionProps" />
                    <div class="metric-conclusion mt-3">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <Message
                :icon="'bi-graph-up-arrow'"
                :title="$t('dashboard.items.attentions.graph.9')"
                :content="$t('dashboard.message.2.content')" />
            </div>
          </div>
          <PDFFooter
            :show="toggles['dashboard.reports.surveys-consolidated']"
          ></PDFFooter>
        </div>
      </div>
    </div>
    <div v-else>
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.2.title')"
        :content="$t('dashboard.message.2.content')" />
    </div>
  </div>
  <div v-if="showSurveyConsolidated === true && !toggles['dashboard.surveys-consolidated.view']">
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
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  font-weight: 700;
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
}
.metric-card-graph {
  background-color: var(--color-background);
  padding: 1.5rem;
  margin-top: .5rem;
  margin-bottom: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
</style>