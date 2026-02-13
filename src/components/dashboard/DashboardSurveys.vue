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
    DashboardSurveysConsolidated,
  },
  emits: ['subsection-changed'],
  props: {
    showSurvey: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    return {
      loading: false,
      detailsOpened: false,
      showSurveyResults: true,
      showSurveyConsolidated: false,
    };
  },
  mounted() {
    // Emit initial subsection state
    if (this.showSurveyResults) {
      this.$emit('subsection-changed', 'results');
    } else if (this.showSurveyConsolidated) {
      this.$emit('subsection-changed', 'consolidated');
    }
  },
  methods: {
    showSurveysResults() {
      this.showSurveyResults = true;
      this.showSurveyConsolidated = false;
      this.$emit('subsection-changed', 'results');
    },
    showSurveysConsolidated() {
      this.showSurveyResults = false;
      this.showSurveyConsolidated = true;
      this.$emit('subsection-changed', 'consolidated');
    },
  },
};
</script>

<template>
  <div>
    <!-- Expose filters slot for desktop - forward from child components -->
    <DashboardSurveysResult
      v-if="filtersLocation === 'slot' && showSurveyResults"
      :show-survey-results="false"
      :calculated-metrics="calculatedMetrics"
      :toggles="toggles"
      :start-date="startDate"
      :end-date="endDate"
      :commerce="commerce"
      :queues="queues"
      filters-location="slot"
    >
      <template #filters-exposed="filterProps">
        <slot name="filters-exposed" v-bind="filterProps"></slot>
      </template>
    </DashboardSurveysResult>
    <DashboardSurveysConsolidated
      v-if="filtersLocation === 'slot' && showSurveyConsolidated"
      :show-survey-consolidated="false"
      :toggles="toggles"
      :start-date="startDate"
      :end-date="endDate"
      :commerce="commerce"
      :queues="queues"
      filters-location="slot"
    >
      <template #filters-exposed="filterProps">
        <slot name="filters-exposed" v-bind="filterProps"></slot>
      </template>
    </DashboardSurveysConsolidated>

    <div id="surveys" class="row" v-if="showSurvey === true">
      <div>
        <hr />
        <div class="row col m-1 mb-2">
          <div class="col-6 centered">
            <button
              class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
              :class="showSurveyResults ? 'btn-selected' : ''"
              @click="showSurveysResults()"
              :disabled="false"
            >
              {{ $t('dashboard.resume') }}
            </button>
          </div>
          <div class="col-6 centered">
            <button
              class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-4"
              :class="showSurveyConsolidated ? 'btn-selected' : ''"
              @click="showSurveysConsolidated()"
              :disabled="false"
            >
              {{ $t('dashboard.consolidated') }}
            </button>
          </div>
        </div>
        <div>
          <DashboardSurveysResult
            :show-survey-results="showSurveyResults"
            :calculated-metrics="calculatedMetrics"
            :toggles="toggles"
            :start-date="startDate"
            :end-date="endDate"
            :commerce="commerce"
            :queues="queues"
            :filters-location="filtersLocation"
          >
          </DashboardSurveysResult>
          <DashboardSurveysConsolidated
            :show-survey-consolidated="showSurveyConsolidated"
            :toggles="toggles"
            :start-date="startDate"
            :end-date="endDate"
            :commerce="commerce"
            :queues="queues"
            :filters-location="filtersLocation"
          >
          </DashboardSurveysConsolidated>
        </div>
      </div>
    </div>
    <!-- Permission check removed - surveys should be accessible -->
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.9rem;
  font-weight: 600;
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
.metric-card-score {
  font-size: 0.8rem;
  font-weight: 500;
}
</style>
