<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'ProductReplacementDetailsCard',
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
    clasifyProductStatus(score) {
      if (score === undefined) {
        return 'bi-battery-full blue-icon';
      } else if (score > 0) {
        return 'bi-battery-full green-icon';
      } else {
        return 'bi-battery red-icon';
      }
    },
    clasifyExpired(score) {
      if (!score) {
        return 'bi-heart-pulse-fill blue-icon';
      } else if (score < -30) {
        return 'bi-heart-pulse-fill green-icon';
      } else if (score > -30) {
        return 'bi-heart-pulse-fill yellow-icon';
      } else if (score >= 0) {
        return 'bi-heart-pulse-fill red-icon';
      }
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
      <div class="col-5 centered fw-bold date-title" v-if="product && product.replacementAmount">
        {{ product.replacementAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
        <i :class="`bi ${clasifyProductStatus(product.replacementActualLevel)} m-1 h5`"></i>
        <span class="badge rounded-pill bg-secondary metric-keyword-tag fw-bold"> {{ scorePercentage(product.replacementAmount, product.replacementActualLevel ? product.replacementActualLevel : 0) }}% </span>
      </div>
      <div class="col-4 centered date-title">
        <i :class="`bi ${clasifyExpired(product.daysSinceExpired)}  mx-1`"> </i> {{ getDate(product.replacementExpirationDate) }}
      </div>
      <div class="col-3 centered date-title">
       {{ getDate(product.replacementDate) }}
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
        <div class="row m-0 centered">
          <div class="d-block col-12 col-md-6">
            <div class="my-1">
              <div class="row bar-label">
                <span class="col lefted m-1"> <i class="bi bi-caret-down-fill"></i> {{ product.minimumLevel || 0 }}</span>
                <span class="col centered m-1 badge bg-dark"> {{ product.replacementActualLevel || 0 }}</span>
                <span class="col righted m-1"> {{ product.replacementAmount }} <i class="bi bi-caret-down-fill"></i></span>
              </div>
              <div class="progress" style="height: 20px;">
                <div
                  :class="`progress-bar ${productScoreBarStyle(product)}`"
                  role="progressbar"
                  :style="`height: 20px; width: ${scorePercentage(product.replacementAmount, product.replacementActualLevel ? product.replacementActualLevel : 0)}%`"
                  aria-valuemin="0" aria-valuemax="100">
                </div>
              </div>
              <span class="fw-bold m-2"> {{ scorePercentage(product.replacementAmount, product.replacementActualLevel ? product.replacementActualLevel : 0) }}% </span>
            </div>
          </div>
          <div class="col-12 col-md-6 my-2">
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.actualLevel") }} </span> {{ product.replacementActualLevel }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
            </div>
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.replacementLevel") }} </span> {{ product.replacementAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
            </div>
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.daysToExpired") }} </span> {{ +product.daysSinceExpired * -1 }}
            </div>
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.daysNextReplacement") }} </span> {{ +product.daysSinceNextReplacement * -1 }}
            </div>
          </div>
        </div>
        <div class="row centered">
          <div class="col-1 mx-1">
            <a class="btn copy-icon"
              @click="copyAttention()">
              <i class="bi bi-file-earmark-spreadsheet"></i>
            </a>
          </div>
          <div class="col">
            <div class="">
              <span v-if="product.replacementAmount" class="badge mx-1 detail-data-badge bg-warning">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productQuantity') }} </span>
                <i class="bi bi-eyedropper mx-1"></i> {{ product.replacementAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
              </span>
              <span v-if="product.price" class="badge mx-1 detail-data-badge bg-warning">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentAmount') }} </span>
                <i class="bi bi-coin mx-1"> </i> {{ product.price }}</span><br>
              <span v-if="product.nextReplacementDate" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productNext') }} </span>
                <i class="bi bi-calendar-fill mx-1"> </i> {{ getDate(product.nextReplacementDate) }}
              </span>
              <span v-if="product.replacedBy" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.user') }} </span>
                <i class="bi bi-person-fill mx-1"> </i> {{ product.replacedBy }}
              </span>
              <span v-if="product.replacementCode" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.code') }} </span>
                {{ product.replacementCode }}
              </span>
              <br><br>
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
  padding: .1rem;
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