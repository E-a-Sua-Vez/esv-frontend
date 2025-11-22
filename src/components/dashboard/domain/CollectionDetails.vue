<script>
import Popper from 'vue3-popper';
import IncomesCollectionDetails from './IncomesCollectionDetails.vue';
import OutcomesCollectionDetails from './OutcomesCollectionDetails.vue';

export default {
  name: 'CollectionDetails',
  components: { IncomesCollectionDetails, Popper, OutcomesCollectionDetails },
  props: {
    show: { type: Boolean, default: true },
    calculatedMetrics: { type: Object, default: {} },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true },
  },
  data() {
    return {
      showIncomesCollection: true,
      showOutcomesCollection: false,
      extendedEntity: false,
    };
  },
  methods: {
    scorePercentage(total, tag) {
      return parseFloat(((tag * 100) / total).toFixed(2), 2) || 0;
    },
    onShowAttentionCollection() {
      this.showIncomesCollection = true;
      this.showOutcomesCollection = false;
    },
    onShowBookingCollection() {
      this.showIncomesCollection = false;
      this.showOutcomesCollection = true;
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.detailsOpened === true) {
          this.showIncomesCollection = true;
          this.showOutcomesCollection = true;
        } else {
          this.showIncomesCollection = true;
          this.showOutcomesCollection = false;
        }
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="metric-card h4">
      <div class="metric-card-title">
        <div class="col-6 col-md-6 centered"></div>
        <div class="col-6 col-md-6 sub-menu-card">
          <span v-if="showIncomesCollection" @click="onShowBookingCollection()"
            >{{ $t('dashboard.outcomes') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
          </span>
          <span v-else @click="onShowAttentionCollection()"
            >{{ $t('dashboard.incomes') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
          </span>
        </div>
      </div>
      <Transition name="flip">
        <div v-if="showIncomesCollection">
          <div class="metric-card-title">
            <span class="px-2"> {{ $t('dashboard.items.attentions.34') }} </span>
            <Popper
              :class="'dark px-2'"
              arrow
              disable-click-away
              :content="$t('dashboard.collection')"
            >
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <IncomesCollectionDetails
            :show="show"
            :distribution="calculatedMetrics['incomes.created'].paymentData"
            :count="calculatedMetrics['incomes.created']['paymentData'].paymentCounter || 0"
            :distribution-payment="calculatedMetrics['incomes.created'].paymentDistribution"
            :distribution-type="calculatedMetrics['incomes.created'].paymentTypeDistribution"
            :distribution-method="calculatedMetrics['incomes.created'].paymentMethodDistribution"
            :distribution-fiscal-note="
              calculatedMetrics['incomes.created'].paymentFiscalNoteDistribution
            "
            :details-opened="detailsOpened"
            :show-details-section="showDetailsSection"
          >
          </IncomesCollectionDetails>
        </div>
      </Transition>
      <Transition name="flip">
        <div v-if="showOutcomesCollection">
          <div class="metric-card-title">
            <span class="px-2"> {{ $t('dashboard.items.attentions.36') }} </span>
            <Popper
              :class="'dark px-2'"
              arrow
              disable-click-away
              :content="$t('dashboard.collection')"
            >
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </div>
          <OutcomesCollectionDetails
            :show="show"
            :distribution="calculatedMetrics['outcomes.created'].paymentData"
            :distribution-payment="calculatedMetrics['outcomes.created'].paymentDistribution"
            :count="calculatedMetrics['outcomes.created']['paymentData'].paymentCounter || 0"
            :distribution-type="calculatedMetrics['outcomes.created'].paymentTypeDistribution"
            :details-opened="detailsOpened"
            :show-details-section="showDetailsSection"
          >
          </OutcomesCollectionDetails>
        </div>
      </Transition>
    </div>
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
  font-size: 0.8rem;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.sub-menu-card {
  text-decoration: underline;
  margin-bottom: 0.5rem;
  text-align: right;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 0.8rem;
  cursor: pointer;
}
.details-title {
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.7rem;
  color: var(--color-text);
}
.show {
  padding: 10px;
  max-height: 800px !important;
  overflow-y: auto;
}
</style>
