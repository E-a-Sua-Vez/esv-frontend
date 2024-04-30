<script>

export default {
  name: 'OutcomesCollectionDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 'No Data' },
    distribution: { type: Object, default: {} },
    distributionPayment: { type: Object, default: {} },
    distributionType: { type: Object, default: {} },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true }
  },
  data() {
    return {
      showAttentionCollection: true,
      showBookingCollection: false,
      extendedEntity: false
    }
  },
  methods: {
    scorePercentage(total, tag){
      return parseFloat((tag * 100 / total).toFixed(2), 2) || 0;
    },
    onShowAttentionCollection() {
      this.showAttentionCollection = true;
      this.showBookingCollection = false;
    },
    onShowBookingCollection() {
      this.showAttentionCollection = false;
      this.showBookingCollection = true;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    distributionTypePercentage(total, tag){
      return parseFloat((this.distributionType[tag].count * 100 / total).toFixed(2), 2) || 0;
    },
    classifyOutcomeStatus(status) {
      if (status === 'CONFIRMED') {
        return 'bg-success';
      } else if (status === 'PENDING') {
        return 'bg-warning';
      } else if (status === 'PENDING') {
        return 'bg-danger';
      } else {
        return 'bg-primary';
      }
    }
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      }
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      }
    }
  },
}
</script>

<template>
  <div v-if="show">
    <div v-if="count">
      <div class="row">
        <div class="col-6 col-md-6">
          <div class="metric-card-title centered fw-bold">
            <i class="bi bi-cash-coin h4 blue-icon fw-bold m-1"></i>
          </div>
          <div class="metric-card-title centered">
            {{ $t('dashboard.payments') }}
          </div>
          <div class="centered">
            <span class="h5 fw-bold m-1">{{ count ? count : 0 }}</span>
          </div>
        </div>
        <div class="col-6 col-md-6">
          <div class="metric-card-title centered">
            <i class="bi bi-arrow-up-circle-fill h4 red-icon fw-bold m-1"></i>
          </div>
          <div class="metric-card-title centered">
            {{ $t('dashboard.outcomes') }}
          </div>
          <div class="centered">
            <span class="h5 fw-bold m-1">{{ distribution.paymentAmountSum ? Number(distribution.paymentAmountSum).toLocaleString("de-DE") : 0 }}</span>
          </div>
        </div>
      </div>
      <div class="details-arrow" v-if="showDetailsSection">
        <div class="centered">
          <span
            href="#"
            @click.prevent="showDetails()">
            <span class="details-title">{{ $t("dashboard.details") }}</span>
            <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </span>
        </div>
        <div
          :class="{ show: extendedEntity }"
          class="detailed-data transition-slow">
          <div>
            <div v-if="Object.keys(distributionPayment).length > 0" class="mt-2">
              <div>
                <span class="fw-bold metric-card-subtitle"> {{ $t('dashboard.paymentStatus') }} </span>
                <hr>
              </div>
              <div class="row mx-2" v-for="(origin) in Object.keys(distributionPayment)" :key="origin">
                <div class="metric-card-title">
                  <span class="col-4"> {{ $t(`incomeStatus.${origin}`) }} </span>
                  <span class="col-4 badge rounded-pill metric-card-subtitle m-1" :class="classifyOutcomeStatus(origin)">{{ distributionPayment[origin].count || 'N/I' }} </span>
                </div>
                <hr>
              </div>
            </div>
            <div v-if="Object.keys(distributionType).length > 0" class="mt-2">
              <div>
                <span class="fw-bold metric-card-subtitle"> {{ $t('dashboard.paymentType') }} </span>
                <hr>
              </div>
              <div class="row mx-2" v-for="(origin) in Object.keys(distributionType)" :key="origin">
                <div class="metric-card-title">
                  <span class="col-4"> {{ origin }} </span>
                  <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ distributionTypePercentage(count, origin) }}% </span>
                  <div class="progress col">
                    <div class="progress-bar" role="progressbar" :style="`width: ${distributionTypePercentage(count, origin)}%`" aria-valuemin="0" aria-valuemax="100">
                      <span class="fw-bold"> {{ distributionType[origin].count || 'N/I' }} </span>
                    </div>
                  </div>
                </div>
                <hr>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="row centered">
        <div class="col">
          <div class="py-1">
            <i class="bi bi-cash-coin blue-icon h4 fw-bold m-1"></i>
            <span class="col-8 fw-bold"> {{ 'No Data' }} </span>
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
.sub-menu-card {
  text-decoration: underline;
  margin: .2rem;
  text-align: right;
  font-size: .7rem;
  font-weight: 500;
  line-height: .8rem;
  cursor: pointer;
}
.details-arrow {
  margin: 0 !important;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  border: none !important;
  border-top: 0;
}
.details-title {
  cursor: pointer;
  text-decoration: underline;
  font-size: .7rem;
  color: var(--color-text);
}
.show {
  padding: 10px;
  max-height: 800px !important;
  overflow-y: auto;
}
</style>