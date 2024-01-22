<script>
import Spinner from '../common/Spinner.vue';
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Message from '../common/Message.vue';
import DashboardSurveysResult from '../../components/dashboard/DashboardSurveysResult.vue';
import DashboardSurveysConsolidated from '../../components/dashboard/DashboardSurveysConsolidated.vue';

export default {
  name: 'DashboardSurveys',
  components: {
    Spinner,
    SimpleCard,
    DetailsCard,
    Message,
    DashboardSurveysResult,
    DashboardSurveysConsolidated
  },
  props: {
    showSurvey: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      showSurveyResults: true,
      showSurveyConsolidated: false
    }
  },
  methods: {
    showSurveysResults() {
      this.showSurveyResults = true;
      this.showSurveyConsolidated = false;
    },
    showSurveysConsolidated() {
      this.showSurveyResults = false;
      this.showSurveyConsolidated = true;
    }
  }
}
</script>

<template>
  <div id="surveys" class="row" v-if="showSurvey === true && toggles['dashboard.surveys.view']">
    <div>
      <hr>
      <div class="row col m-1 mb-2">
        <div class="col-6 centered">
          <button
            class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
            :class="showSurveyResults ? 'btn-selected' : ''"
            @click="showSurveysResults()"
            :disabled="!toggles['dashboard.surveys.view']">
            {{ $t("dashboard.resume") }}
          </button>
        </div>
        <div class="col-6 centered">
          <button
            class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
            :class="showSurveyConsolidated ? 'btn-selected' : ''"
            @click="showSurveysConsolidated()"
            :disabled="!toggles['dashboard.surveys-consolidated.view']">
            {{ $t("dashboard.consolidated") }}
          </button>
        </div>
      </div>
      <div>
        <DashboardSurveysResult
          :showSurveyResults="showSurveyResults"
          :calculatedMetrics="calculatedMetrics"
          :toggles="toggles"
          :startDate="startDate"
          :endDate="endDate"
          :commerce="commerce"
          :queues="queues"
        >
        </DashboardSurveysResult>
        <DashboardSurveysConsolidated
          :showSurveyConsolidated="showSurveyConsolidated"
          :toggles="toggles"
          :startDate="startDate"
          :endDate="endDate"
          :commerce="commerce"
          :queues="queues"
        >
        </DashboardSurveysConsolidated>
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
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
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