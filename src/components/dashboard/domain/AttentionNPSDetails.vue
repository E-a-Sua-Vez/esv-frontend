<script>

export default {
  name: 'AttentionNPSDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    score: { type: Array, default: [] },
    distribution: { type: Object, default: {} },
    limit: { type: Number, default: 10 },
  },
  data() {
    return {
    }
  },
  methods: {
    clasifyNpsComment(score){
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
    npsScorePercentage(total, score){
      return parseFloat((score * 100 / total), 2) || 0;
    },
    getPercentage(avg) {
      return parseFloat((avg).toFixed(2), 2) || 0;
    },
  },
}
</script>

<template>
  <div v-if="show">
    <div class="row">
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-down-circle-fill h4 fw-bold red-icon m-1"></i>
          {{ $t('dashboard.items.attentions.9') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ min || 0 }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-up-circle-fill h4 fw-bold green-icon m-1"></i>
          {{ $t('dashboard.items.attentions.8') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ max || 0 }}</span>
        </div>
      </div>
    </div>
    <hr>
    <div class="my-3">
      <div class="progress" style="height: 30px;">
        <div class="progress-bar red-area" role="progressbar" :style="`height: 30px; width: ${npsScorePercentage(count, distribution.detractors ? distribution.detractors.counter : 0)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ distribution.detractors ? distribution.detractors.counter : 0 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-area" role="progressbar" :style="`height: 30px; width: ${npsScorePercentage(count, distribution.neutrals ? distribution.neutrals.counter : 0)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ distribution.neutrals ? distribution.neutrals.counter : 0 || 'N/I' }}
        </div>
        <div class="progress-bar green-area" role="progressbar" :style="`height: 30px; width: ${npsScorePercentage(count, distribution.promoters ? distribution.promoters.counter : 0)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ distribution.promoters ? distribution.promoters.counter : 0 || 'N/I' }}
        </div>
      </div>
    </div>
    <div class="row m-1">
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-frown-fill red-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.detractor') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.detractors ? distribution.detractors.counter : 0 }}</span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ getPercentage(distribution.detractors ? distribution.detractors.avg : 0) }} % </span>
        </div>
      </div>
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-neutral-fill yellow-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.neutral') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.neutrals ? distribution.neutrals.counter : 0 }}</span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ getPercentage(distribution.neutrals ? distribution.neutrals.avg : 0) }} % </span>
        </div>
      </div>
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-smile-fill green-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.promoter') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.promoters ? distribution.promoters.counter : 0 }}</span>
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ getPercentage(distribution.promoters ? distribution.promoters.avg : 0) }} % </span>
        </div>
      </div>
    </div>
    <hr>
    <div v-if="score.length > 0">
      <div class="row mx-2" v-for="(score) in score.slice(0, limit)" :key="score.nps">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi ${clasifyNpsComment(score.nps)}`">
          </i>
          <span class="col-2"> {{ score.nps }} </span>
          <div class="progress col">
            <div class="progress-bar" role="progressbar" :style="`width: ${npsScorePercentage(count, score.counter)}%`" aria-valuemin="0" aria-valuemax="100">
              {{ score.counter || 'N/I' }}
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