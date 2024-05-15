<script>

export default {
  name: 'AttentionClientContactDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distributionType: { type: Object, default: {} },
    distributionResult: { type: Object, default: {} }
  },
  data() {
    return {
    }
  },
  methods: {
    distributionTypePercentage(total, tag){
      return parseFloat((this.distributionType[tag] * 100 / total).toFixed(2), 2) || 0;
    },
    distributionResultPercentage(total, tag){
      return parseFloat((this.distributionResult[tag] * 100 / total).toFixed(2), 2) || 0;
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div v-if="Object.keys(distributionType).length > 0">
      <div>
        <span class="fw-bold metric-card-subtitle"> {{ $t('dashboard.contactType') }} </span>
        <hr>
      </div>
      <div class="row mx-2" v-for="(origin, index) in Object.keys(distributionType)" :key="origin">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi bi-${index+1}-circle-fill`"></i>
          <span class="col-4"> {{ $t(`contactTypes.${origin}`) }} </span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ distributionTypePercentage(count, origin) }}% </span>
          <div class="progress col">
            <div class="progress-bar" role="progressbar" :style="`width: ${distributionTypePercentage(count, origin)}%`" aria-valuemin="0" aria-valuemax="100">
              <span class="fw-bold"> {{ distributionType[origin] || 'N/I' }} </span>
            </div>
          </div>
        </div>
        <hr>
      </div>
    </div>
    <div v-if="Object.keys(distributionResult).length > 0" class="mt-2">
      <div>
        <span class="fw-bold metric-card-subtitle"> {{ $t('dashboard.contactResult') }} </span>
        <hr>
      </div>
      <div class="row mx-2" v-for="(origin, index) in Object.keys(distributionResult)" :key="origin">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi bi-${index+1}-circle-fill`"></i>
          <span class="col-4"> {{ $t(`contactResultTypes.${origin}`) }} </span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ distributionResultPercentage(count, origin) }}% </span>
          <div class="progress col">
            <div class="progress-bar" role="progressbar" :style="`width: ${distributionResultPercentage(count, origin)}%`" aria-valuemin="0" aria-valuemax="100">
              <span class="fw-bold"> {{ distributionResult[origin] || 'N/I' }} </span>
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
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>