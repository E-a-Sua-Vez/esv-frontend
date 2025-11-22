<script>
export default {
  name: 'AttentionQuestionRatingTo10',
  props: {
    show: { type: Boolean, default: true },
    question: { type: Object, default: {} },
  },
  data() {
    return {};
  },
  methods: {
    clasifyNpsComment(score) {
      if (!score) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (score <= 5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (score <= 8) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    },
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
    <div class="row mt-3 centered">
      <div class="col-12 col-md-5 mb-3">
        <div class="row">
          <i :class="`h1 centered bi ${clasifyNpsComment(question.avg)} mb-0`"> </i>
        </div>
        <div class="row">
          <div class="col centered">
            <span class="metric-card-number">{{ parseFloat(question.avg.toFixed(2), 2) }}</span>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-7">
        <div
          class="row centered"
          v-for="(option, ind) in getOptions(question['distribution'])"
          :key="`option.${ind}`"
        >
          <div class="col-4 centered">
            <span class="h6 fw-bold">
              <i :class="`h6 bi ${clasifyNpsComment(option)}  mb-0`"> </i> {{ option }}
            </span>
          </div>
          <div class="col-2 centered">
            <span class="badge rounded-pill bg-secondary metric-card-subtitle">
              {{ question['distribution'][option].counter }}
            </span>
          </div>
          <div class="col-4 centered">
            <span class="badge rounded-pill bg-primary metric-card-subtitle">
              {{ getPercentage(question['distribution'][option].avg) }} %
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>
