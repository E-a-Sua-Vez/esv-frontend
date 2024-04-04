<script>
import Popper from "vue3-popper";
import AttentionCollectionDetails from './AttentionCollectionDetails.vue';

export default {
  name: 'CollectionDetails',
  components: { AttentionCollectionDetails, Popper },
  props: {
    show: { type: Boolean, default: true },
    calculatedMetrics: { type: Object, default: {} },
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
    }
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.detailsOpened === true) {
          this.showAttentionCollection = true;
          this.showBookingCollection = true;
        } else {
          this.showAttentionCollection = true;
          this.showBookingCollection = false;
        }
      }
    }
  },
}
</script>

<template>
  <div v-if="show">
    <div class="metric-card h4">
      <div class="metric-card-title">
        <div class="col-6 col-md-6 centered">
        </div>
        <div class="col-6 col-md-6 sub-menu-card">
          <span v-if="showAttentionCollection" @click="onShowBookingCollection()">{{ $t("dashboard.bookings") }}<i class="bi bi-arrow-right-circle-fill mx-1"></i> </span>
          <span v-else @click="onShowAttentionCollection()">{{ $t("dashboard.attentions") }}<i class="bi bi-arrow-right-circle-fill mx-1"></i> </span>
        </div>
      </div>
      <Transition name="flip">
        <div v-if="showAttentionCollection">
          <div class="metric-card-title">
            <span class="px-2"> {{ $t('dashboard.items.attentions.34') }} </span>
            <Popper
              :class="'dark px-2'"
              arrow
              disableClickAway
              :content="$t('dashboard.collection')">
              <i class='bi bi-info-circle-fill h7'></i>
            </Popper>
          </div>
          <AttentionCollectionDetails
            :show="show"
            :distribution="calculatedMetrics['attention.created'].paymentData"
            :count="calculatedMetrics['attention.created']['paymentData'].paymentCounter || 0"
            :distributionType="calculatedMetrics['attention.created'].paymentTypeDistribution"
            :distributionMethod="calculatedMetrics['attention.created'].paymentMethodDistribution"
            :detailsOpened="detailsOpened"
            :showDetailsSection="showDetailsSection"
          >
          </AttentionCollectionDetails>
        </div>
      </Transition>
      <Transition name="flip">
        <div v-if="showBookingCollection">
          <div class="metric-card-title">
            <span class="px-2"> {{ $t('dashboard.items.attentions.36') }} </span>
            <Popper
              :class="'dark px-2'"
              arrow
              disableClickAway
              :content="$t('dashboard.collection')">
              <i class='bi bi-info-circle-fill h7'></i>
            </Popper>
          </div>
          <AttentionCollectionDetails
            :show="show"
            :distribution="calculatedMetrics['booking.created'].paymentData"
            :count="calculatedMetrics['booking.created']['paymentData'].paymentCounter || 0"
            :distributionType="calculatedMetrics['booking.created'].paymentTypeDistribution"
            :distributionMethod="calculatedMetrics['booking.created'].paymentMethodDistribution"
            :detailsOpened="detailsOpened"
            :showDetailsSection="showDetailsSection"
          >
          </AttentionCollectionDetails>
        </div>
      </Transition>
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
.sub-menu-card {
  text-decoration: underline;
  margin-bottom: .5rem;
  text-align: right;
  font-size: .7rem;
  font-weight: 500;
  line-height: .8rem;
  cursor: pointer;
}
.details-title {
  cursor: pointer;
  text-decoration: underline;
  font-size: .7rem;
  color: var(--color-text);
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
}
.show {
  padding: 10px;
  max-height: 800px !important;
  overflow-y: auto;
}
</style>