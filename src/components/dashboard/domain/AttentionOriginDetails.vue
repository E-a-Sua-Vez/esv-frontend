<script>

export default {
  name: 'AttentionOriginDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distribution: { type: Object, default: {} }
  },
  data() {
    return {
    }
  },
  methods: {
    npsScorePercentage(total, tag){
      return parseFloat((this.distribution[tag] * 100 / total), 2) || 0;
    },
    getPercentage(avg) {
      return parseFloat((avg).toFixed(2), 2) || 0;
    },
  },
}
</script>

<template>
  <div v-if="show">
    <hr>
    <div v-if="Object.keys(distribution).length > 0">
      <div class="row mx-2" v-for="(origin, index) in Object.keys(distribution)" :key="origin">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi bi-${index+1}-circle-fill`"></i>
          <span class="col-4"> {{ $t(`origin.${origin}`) }} </span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ npsScorePercentage(count, origin) }}% </span>
          <div class="progress col">
            <div class="progress-bar" role="progressbar" :style="`width: ${npsScorePercentage(count, origin)}%`" aria-valuemin="0" aria-valuemax="100">
              <span class="fw-bold"> {{ distribution[origin] || 'N/I' }} </span>
            </div>
          </div>
        </div>
        <hr>
      </div>
    </div>
    <div v-else>
      <div class="row">
        <div class="col">
          <div class="metric-card-title">
            <span class="col-8"> {{ 'No Data' }} </span>
          </div>
        </div>
      </div>
    </div>
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
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
}
</style>