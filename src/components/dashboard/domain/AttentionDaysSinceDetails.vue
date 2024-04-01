<script>
import Popper from "vue3-popper";

export default {
  name: 'AttentionDaysSinceDetails',
  components: { Popper },
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
    scorePercentage(total, tag){
      return parseFloat((tag * 100 / total).toFixed(2), 2) || 0;
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="metric-card h4">
      <div class="metric-card-title centered">
        <span class="px-2"> {{ $t('dashboard.items.attentions.33') }} </span>
        <span v-if="count >= 0" class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ count || 0 }} </span>
        <Popper
          :class="'dark px-2'"
          arrow
          disableClickAway
          :content="$t('dashboard.daysSince')">
          <i class='bi bi-info-circle-fill h7'></i>
        </Popper>
      </div>
      <div class="row m-1" v-if="count">
        <div class="col-4 col-md-4">
          <div class="metric-card-title centered fw-bold">
            <i class="bi bi-qr-code red-icon h4 fw-bold m-1"></i>
            {{ $t('dashboard.late') }}
          </div>
          <div class="centered">
            <span class="h5 fw-bold m-1">{{ distribution.LATE ? distribution.LATE : 0 }}</span>
            <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ scorePercentage(count, distribution.LATE ? distribution.LATE : 0) }} % </span>
          </div>
        </div>
        <div class="col-4 col-md-4">
          <div class="metric-card-title centered fw-bold">
            <i class="bi bi-qr-code yellow-icon h4 fw-bold m-1"></i>
            {{ $t('dashboard.medium') }}
          </div>
          <div class="centered">
            <span class="h5 fw-bold m-1">{{ distribution.MEDIUM ? distribution.MEDIUM : 0 }}</span>
            <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ scorePercentage(count, distribution.MEDIUM ? distribution.MEDIUM : 0) }} % </span>
          </div>
        </div>
        <div class="col-4 col-md-4">
          <div class="metric-card-title centered fw-bold">
            <i class="bi bi-qr-code green-icon h4 fw-bold m-1"></i>
            {{ $t('dashboard.early') }}
          </div>
          <div class="centered">
            <span class="h5 fw-bold m-1">{{ distribution.EARLY ? distribution.EARLY : 0 }}</span>
            <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ scorePercentage(count, distribution.EARLY ? distribution.EARLY : 0) }} % </span>
          </div>
        </div>
      </div>
      <div v-else>
        <div class="row centered">
          <div class="col">
            <div class="py-1">
              <i class="bi bi-qr-code blue-icon h4 fw-bold m-1"></i>
              <span class="col-8 fw-bold"> {{ 'No Data' }} </span>
            </div>
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