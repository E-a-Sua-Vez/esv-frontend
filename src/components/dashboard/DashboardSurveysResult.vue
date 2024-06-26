<script>
import Spinner from '../../components/common/Spinner.vue';
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import html2pdf from "html2pdf.js";
import PDFHeader from '../reports/PDFHeader.vue';
import PDFFooter from '../reports/PDFFooter.vue';
import AttentionRatingDetails from './domain/AttentionRatingDetails.vue';
import AttentionNPSDetails from './domain/AttentionNPSDetails.vue';
import AttentionQuestionRatingTo5 from './domain/AttentionQuestionRatingTo5.vue';
import AttentionQuestionRatingTo10 from './domain/AttentionQuestionRatingTo10.vue';
import AttentionQuestionYesOrNot from './domain/AttentionQuestionYesOrNot.vue';
import AttentionQuestionChooseOption from './domain/AttentionQuestionChooseOption.vue';
import AttentionQuestionOpenOptions from './domain/AttentionQuestionOpenOptions.vue';
import AttentionQuestionOpenWriting from './domain/AttentionQuestionOpenWriting.vue';
import AttentionQuestionKeyWords from './domain/AttentionQuestionKeyWords.vue';
import { getPersonalizedSurveyDetails, getSurveyMetrics } from '../../application/services/query-stack';

export default {
  name: 'DashboardSurveysResult',
  components: {
    Spinner,
    SimpleCard,
    DetailsCard,
    Message,
    html2pdf,
    SimpleDownloadCard,
    PDFHeader,
    PDFFooter,
    AttentionRatingDetails,
    AttentionNPSDetails,
    AttentionQuestionRatingTo5,
    AttentionQuestionRatingTo10,
    AttentionQuestionYesOrNot,
    AttentionQuestionChooseOption,
    AttentionQuestionOpenOptions,
    AttentionQuestionOpenWriting,
    AttentionQuestionKeyWords
  },
  props: {
    showSurveyResults: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined }
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      surveys: [],
      queueId: undefined,
      showFilterOptions: false,
      metrics: {}
    }
  },
  async beforeMount() {
    try {
      this.loading = true;
      this.metrics = this.calculatedMetrics;
      this.loading = false;
    } catch (error) {
      this.loading = false;
    }
  },
  methods: {
    async refresh() {
      try {
        this.loading = true;
        this.surveys = await getPersonalizedSurveyDetails(undefined, this.commerce.id, undefined, this.startDate, this.endDate, this.queueId, 10);
        const result = await getSurveyMetrics(this.commerce.id, this.queueId, this.startDate, this.endDate);
        if (result && result['calculatedMetrics']) {
          this.metrics = result['calculatedMetrics'];
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    clear() {
      this.queueId = undefined;
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    exportToPDF() {
      this.loading = true;
      this.detailsOpened = true;
      const filename = `surveys-${this.commerce.name}-${this.commerce.tag}-${this.startDate}-${this.endDate}.pdf`;
      const options = {
				margin: .5,
  			filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};
      let doc = document.getElementById("survey-component");
      document.getElementById("pdf-header").style.display = "block";
      document.getElementById("pdf-footer").style.display = "block";
      setTimeout(() => {
        html2pdf().set(options).from(doc).save().then(() => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          this.detailsOpened = false;
          this.loading = false;
          doc = undefined;
        }).catch(error => {
          document.getElementById("pdf-header").style.display = "none";
          document.getElementById("pdf-footer").style.display = "none";
          this.detailsOpened = false;
          this.loading = false;
          doc = undefined;
        });
      }, 1000);
    }
  },
  computed: {
    changeData() {
      const { queueId } = this;
      return {
        queueId
      }
    }
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler() {
        this.refresh();
      }
    }
  }
}
</script>

<template>
  <div id="surveys-result" class="row" v-if="showSurveyResults === true && toggles['dashboard.surveys.view']">
    <div>
      <SimpleDownloadCard
        :download="toggles['dashboard.reports.surveys'] && surveys.length > 0"
        :title="$t('dashboard.reports.surveys.title')"
        :showTooltip="true"
        :description="$t('dashboard.reports.surveys.description')"
        :icon="'bi-file-earmark-pdf'"
        @download="exportToPDF"
        :canDownload="toggles['dashboard.reports.surveys'] === true"
      ></SimpleDownloadCard>
      <Spinner :show="loading"></Spinner>
      <div class="my-2 row metric-card" v-if="queues && queues.length >= 1">
        <div class="col-12">
          <span class="metric-card-subtitle">
            <span class="form-check-label metric-keyword-subtitle mx-1" @click="showFilters()"> <i class="bi bi-search"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
          </span>
          <button
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
            @click="clear()">
            <span><i class="bi bi-eraser-fill"></i></span>
          </button>
        </div>
        <div v-if="showFilterOptions">
          <div class="col-12 col-md my-1 filter-card" v-if="queues && queues.length >= 1">
            <label class="metric-card-subtitle mx-2" for="select-queue"> {{ $t("dashboard.queue") }} </label>
            <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="queueId">
              <option v-for="queue in queues" :key="queue.name" :value="queue.id" id="select-queue">{{ queue.name }}</option>
            </select>
          </div>
        </div>
      </div>
      <div id="survey-component">
        <PDFHeader
          :show="toggles['dashboard.reports.surveys']"
          :title="$t('dashboard.reports.surveys.title')"
          :startDate="startDate"
          :endDate="endDate"
          :commerce="commerce"
        >
        </PDFHeader>
        <div v-if="surveys && surveys.length > 0">
          <div id="csat-view" class="row">
            <div class="col">
              <DetailsCard
                :show="toggles['dashboard.attention-rating-avg.view']"
                :data="metrics['survey.created'].prom_rating || 0"
                :subdata="metrics['survey.created'].count_rating || 0"
                :title="$t('dashboard.items.attentions.3')"
                :showTooltip="true"
                :description="$t('dashboard.rating')"
                :icon="'bi-star-fill'"
                :iconStyleClass="'yellow-icon'"
                :detailsOpened="detailsOpened"
                >
                <template v-slot:details>
                  <AttentionRatingDetails
                    :show="toggles['dashboard.attention-rating-avg.view']"
                    :count="metrics['survey.created'].count_rating || 0"
                    :min="metrics['survey.created']['min'].rating || 0"
                    :max="metrics['survey.created']['max'].rating || 0"
                    :messages="metrics['survey.created']['messages']"
                    :score="metrics['survey.created']['csatScore'] || []"
                    :limit="5"
                  >
                  </AttentionRatingDetails>
                </template>
              </DetailsCard>
            </div>
          </div>
          <div id="nps-view" class="row">
            <div class="col">
              <DetailsCard
                :show="toggles['dashboard.attention-nps-avg.view']"
                :data="metrics['survey.created'].nps"
                :subdata="metrics['survey.created'].count_nps"
                :title="$t('dashboard.items.attentions.24')"
                :showTooltip="true"
                :description="$t('dashboard.nps')"
                :icon="'bi-megaphone-fill'"
                :iconStyleClass="'orange-icon'"
                :detailsOpened="detailsOpened"
                >
                <template v-slot:details>
                  <AttentionNPSDetails
                    :show="toggles['dashboard.attention-nps-avg.view']"
                    :min="metrics['survey.created']['min'].nps"
                    :max="metrics['survey.created']['max'].nps"
                    :score="metrics['survey.created']['npsScore']"
                    :distribution="metrics['survey.created']['npsDistribution']"
                    :count="metrics['survey.created'].count_nps"
                    :limit="10"
                  >
                  </AttentionNPSDetails>
                </template>
              </DetailsCard>
            </div>
          </div>
          <div id="keywords-view" class="row">
            <div class="col">
              <AttentionQuestionKeyWords
                :calculatedMetrics="metrics"
                :show="true">
              </AttentionQuestionKeyWords>
            </div>
          </div>
          <div id="questions-view" v-for="(question, index) in surveys" :key="`question.${index}`" class="metric-card">
            <span class="metric-card-title">
              {{ question.title }}
              <span class="badge bg-dark metric-card-subtitle mx-2"> {{ question.counter }} </span>
            </span>
            <div v-if="question.type === 'RATING_TO_5'">
              <AttentionQuestionRatingTo5
                :question="question"
                :show="true">
              </AttentionQuestionRatingTo5>
            </div>
            <div v-else-if="question.type === 'RATING_TO_10'">
              <AttentionQuestionRatingTo10
                :question="question"
                :show="true">
              </AttentionQuestionRatingTo10>
            </div>
            <div v-else-if="question.type === 'YES_OR_NOT'">
              <AttentionQuestionYesOrNot
                :question="question"
                :show="true">
              </AttentionQuestionYesOrNot>
            </div>
            <div v-else-if="question.type === 'CHOOSE_OPTION'">
              <AttentionQuestionChooseOption
                :question="question"
                :show="true">
              </AttentionQuestionChooseOption>
            </div>
            <div v-else-if="question.type === 'OPEN_OPTIONS'">
              <AttentionQuestionOpenOptions
                :question="question"
                :show="true">
              </AttentionQuestionOpenOptions>
            </div>
            <div v-else-if="question.type === 'OPEN_WRITING'">
              <AttentionQuestionOpenWriting
                :show="true"
                :question="question"
                :startDate="startDate"
                :endDate="endDate"
                :detailsOpened="detailsOpened"
                :toggles="toggles"
                :commerce="commerce">
              </AttentionQuestionOpenWriting>
            </div>
          </div>
        </div>
        <div v-else>
          <Message
            :icon="'bi-graph-up-arrow'"
            :title="$t('dashboard.message.2.title')"
            :content="$t('dashboard.message.2.content')" />
        </div>
        <PDFFooter
          :show="toggles['dashboard.reports.surveys']"
        ></PDFFooter>
      </div>
    </div>
  </div>
  <div v-if="showSurveyResults === true && !toggles['dashboard.surveys.view']">
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
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
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
.metric-card-score {
  font-size: .8rem;
  font-weight: 500;
}
</style>