<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'ProductConsumptionDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    product: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      asc: false
    }
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.product]);
      navigator.clipboard.writeText(textToCopy);
    },
    scorePercentage(total, score){
      return parseFloat((score * 100 / total).toFixed(2), 2) || 0;
    },
    productScoreBarStyle(product) {
      const level = this.scorePercentage(product.replacementAmount, product.replacementActualLevel ? product.replacementActualLevel : 0);
      if (level <= 0) {
        return 'red-area';
      } else {
        return 'green-area';
      }
    },
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
    <div class="row metric-card">
      <div class="col centered fw-bold date-title" v-if="product && product.consumptionAmount">
       {{ product.productName }} - {{ product.consumptionAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
        <i v-if="product.comsumptionAttentionId" class="bi bi-qr-code mx-1"></i>
        <i v-else class="bi bi-person-fill blue-icon mx-1"></i>
      </div>
      <div class="col centered date-title" v-if="product && product.consumptionDate">
        <i class="bi bi-calendar-fill blue-icon mx-1"></i> {{ getDate(product.consumptionDate) }}
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered">
        <span
          href="#"
          @click.prevent="showDetails()">
          <span class="details-title">{{ $t("dashboard.details") }}</span>
          <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
        </span>
      </div>
      <Spinner :show="loading"></Spinner>
      <div
        :class="{ show: extendedEntity }"
        class="detailed-data transition-slow">
        <div class="row centered">
          <div class="col-1 mx-1">
            <a class="btn copy-icon"
              @click="copyAttention()">
              <i class="bi bi-file-earmark-spreadsheet"></i>
            </a>
          </div>
          <div class="col">
            <div class="">
              <span v-if="product.consumptionAmount" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-eyedropper mx-1"></i> {{ product.consumptionAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}</span>
              <span v-if="product.consumedBy" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-person-fill mx-1"> </i> {{ product.consumedBy }}</span>
              <span v-if="product.consumptionDate" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ product.consumptionDate }}</span>
              <span v-if="product.comsumptionAttentionId" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-qr-code mx-1"> </i> {{ product.comsumptionAttentionId }}</span><br><br>
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ product.productId }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(product.createdDate || product.createdAt) }}</span>
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
  margin-bottom: 0;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.6rem;
}
.show {
  padding: 10px;
  max-height: 1200px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: .7rem;
  color: var(--color-text);
}
.metric-card-title {
  margin: .2rem;
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: .7rem;
  font-weight: 400;
}
.bar-label {
  font-size: .7rem !important;
  line-height: .7rem !important;
  font-weight: 500;
}
</style>