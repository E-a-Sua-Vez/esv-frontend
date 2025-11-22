<script>
export default {
  name: 'AttentionQuestionYesOrNot',
  props: {
    show: { type: Boolean, default: true },
    question: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {
    getPercentage(avg) {
      return parseFloat((avg * 100).toFixed(2), 2) || 0;
    },
    getOptions(obj) {
      return Object.keys(obj).sort((a, b) => b - a);
    },
  },
};
</script>

<template>
  <div v-if="show && question">
    <div class="progress my-3" style="height: 30px">
      <div
        class="progress-bar fw-bold"
        role="progressbar"
        :style="`width: ${getPercentage(question['distribution']['YES'].avg)}%`"
        aria-valuenow="15"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {{ $t('dashboard.items.surveys.yes') }}
      </div>
      <div
        class="progress-bar bg-danger"
        role="progressbar"
        :style="`width: ${getPercentage(question['distribution']['NO'].avg)}%`"
        aria-valuenow="30"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {{ $t('dashboard.items.surveys.no') }}
      </div>
    </div>
    <div class="row centered m-1">
      <div class="col-4 centered">
        <span class="metric-card-title fw-bold"> {{ $t('dashboard.items.surveys.yes') }} </span>
      </div>
      <div class="col-4 centered">
        <span class="badge rounded-pill bg-secondary metric-card-subtitle">
          {{ question['distribution']['YES'].counter }}
        </span>
      </div>
      <div class="col-4 centered">
        <span class="badge rounded-pill bg-primary metric-card-subtitle">
          {{ getPercentage(question['distribution']['YES'].avg) }} %
        </span>
      </div>
    </div>
    <div class="row centered m-1">
      <div class="col-4 centered">
        <span class="metric-card-title fw-bold"> {{ $t('dashboard.items.surveys.no') }} </span>
      </div>
      <div class="col-4 centered">
        <span class="badge rounded-pill bg-secondary metric-card-subtitle">
          {{ question['distribution']['NO'].counter }}
        </span>
      </div>
      <div class="col-4 centered">
        <span class="badge rounded-pill bg-danger metric-card-subtitle">
          {{ getPercentage(question['distribution']['NO'].avg) }} %
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>
