<script>

export default {
  name: 'AttentionQuestionRatingTo5',
  props: {
    show: { type: Boolean, default: true },
    question: { type: Object, default: {} }
  },
  data() {
    return {
    }
  },
  methods: {
    getPercentage(avg) {
      return parseFloat((avg * 100).toFixed(2), 2) || 0;
    },
    getOptions(obj) {
      return Object.keys(obj).sort((a,b) => b - a);
    },
  },
}
</script>

<template>
  <div v-if="show && question">
    <div class="row mt-3 centered">
      <div class="col-12 col-md-5 mb-3">
        <div class="row">
          <vue3-star-ratings
            v-model="question.avg"
            starColor="#f9c322"
            inactiveColor="#a9a9a9"
            :showControl="false"
            starSize="18"
          />
        </div>
        <div class="row">
          <div class="col centered">
            <span class="metric-card-number">{{ parseFloat(question.avg.toFixed(2), 2) }}</span>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-7">
        <div class="row centered" v-for="(option, ind) in getOptions(question['distribution'])" :key="`option.${ind}`">
          <div class="col-4 centered">
            <span class="h6 fw-bold"> {{ option }} <i class="bi bi-star-fill yellow-icon"></i> </span>
          </div>
          <div class="col-2 centered">
            <span class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ question['distribution'][option].counter }} </span>
          </div>
          <div class="col-4 centered">
            <span class="badge rounded-pill bg-primary metric-card-subtitle"> {{ getPercentage(question['distribution'][option].avg) }} % </span>
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
.vue3-star-ratings__wrapper {
  display: block;
  margin: 0px !important;
  text-align: center;
  padding-top: .5rem !important;
  padding-bottom: .1rem !important;
}
</style>