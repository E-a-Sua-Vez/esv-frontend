<script>
import { globalStore } from '../../../stores';
import { getDate } from '../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import ProductReplacementManagement from '../domain/ProductReplacementManagement.vue';
import { getProductsReplacementDetails, getProductsConsumptionsDetails } from '../../../application/services/query-stack';
import ProductConsumptionManagement from '../domain/ProductConsumptionManagement.vue';

export default {
  name: 'ProductDetailsCard',
  components: { Popper, Spinner, ProductReplacementManagement, ProductConsumptionManagement },
  props: {
    show: { type: Boolean, default: true },
    product: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    management: { type: Boolean, default: true },
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      asc: false,
      store,
      userType: undefined,
      user: undefined,
      limit: 10,
      page: 1,
      productReplacements: [],
      productConsumptions: []
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
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    clasifyProductStatus(score) {
      if (score === undefined) {
        return 'bi-battery-full blue-icon';
      } else if (score === 'GOOD') {
        return 'bi-battery-full green-icon';
      } else if (score === 'MEDIUM') {
        return 'bi-battery-half yellow-icon';
      } else {
        return 'bi-battery red-icon';
      }
    },
    clasifyReplacement(score) {
      if (!score) {
        return 'bi-battery-charging blue-icon';
      } else if (score < -30) {
        return 'bi-battery-charging green-icon';
      } else if (score > -30) {
        return 'bi-battery-charging yellow-icon';
      } else if (score >= 0) {
        return 'bi-battery-charging red-icon';
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
      const level = this.scorePercentage(product.maximumLevel, product.actualLevel ? product.actualLevel : 0);
      const minimunLevel = this.scorePercentage(product.maximumLevel, product.replacementLevel ? product.replacementLevel : 0);
      const optimumLevel = this.scorePercentage(product.maximumLevel, product.optimumLevel ? product.optimumLevel : 0);
      if (level <= minimunLevel) {
        return 'red-area';
      } else if (level <= optimumLevel) {
        return 'yellow-area';
      } else {
        return 'green-area';
      }
    },
    async getAttentionConsuptions() {
      try {
        this.loading = true;
        this.attentions = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.attentions = await getAttentionsDetails(this.commerce.id, undefined, undefined, commerceIds,
          this.page, this.limit, this.daysSinceType, undefined, undefined, undefined,
          this.searchText, this.queueId, this.survey, this.asc, undefined);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getProductReplacements() {
      try {
        this.loading = true;
        this.productReplacements = await getProductsReplacementDetails(this.product.productId, this.page,
          this.limit, this.asc, undefined, undefined);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getProductConsuptions() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        this.productConsumptions = await getProductsConsumptionsDetails(commerceIds, this.product.productId,
          this.page, this.limit, this.asc, undefined, undefined);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    }
  },
  watch: {
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      }
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card fw-bold">
      <div class="col-6 centered" v-if="product && product.productName">
        {{ product.productName }}
      </div>
      <div class="col-6 centered">
        <i :class="`bi ${clasifyProductStatus(product.productStatus)} mx-1 h5`"> </i>
        <i :class="`bi ${clasifyExpired(product.daysSinceExpired)} mx-2 h6`"></i>
        <i :class="`bi ${clasifyReplacement(product.daysSinceNextReplacement)} mx-2 h6`"></i>
      </div>
      <div class="lefted">
      <div class="progress col-12 col-md-6" style="height: 3px;">
        <div
          :class="`progress-bar ${productScoreBarStyle(product)}`"
          role="progressbar"
          :style="`height: 3px; width: ${scorePercentage(product.maximumLevel, product.actualLevel ? product.actualLevel : 0)}%`"
          aria-valuemin="0" aria-valuemax="100">
        </div>
      </div>
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
        <div class="row m-0">
          <div class="d-block col-12 col-md-6">
            <div class="my-1">
              <div class="row bar-label">
                <span class="col lefted m-1"> <i class="bi bi-caret-down-fill"></i> {{ product.minimumLevel || 0 }}</span>
                <span class="col centered m-1 badge bg-dark"> {{ product.actualLevel || 0 }}</span>
                <span class="col righted m-1"> {{ product.maximumLevel }} <i class="bi bi-caret-down-fill"></i></span>
              </div>
              <div class="progress" style="height: 20px;">
                <div
                  :class="`progress-bar ${productScoreBarStyle(product)}`"
                  role="progressbar"
                  :style="`height: 20px; width: ${scorePercentage(product.maximumLevel, product.actualLevel ? product.actualLevel : 0)}%`"
                  aria-valuemin="0" aria-valuemax="100">
                </div>
              </div>
              <span class="fw-bold m-2"> {{ scorePercentage(product.maximumLevel, product.actualLevel ? product.actualLevel : 0) }}% </span>
            </div>
          </div>
          <div class="col-12 col-md-6 my-2">
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.actualLevel") }} </span> {{ product.actualLevel }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
            </div>
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.optimumLevel") }} </span> {{ product.optimumLevel }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
            </div>
            <div class="centered">
              <span class="fw-bold mx-1"> {{ $t("businessProductStockAdmin.replacementLevel") }} </span> {{ product.replacementLevel }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
            </div>
          </div>
        </div>
        <div class="row centered my-2" v-if="management && !loading">
          <div class="col-6">
            <button
              @click="getProductConsuptions()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#consumptionsModal-${this.product.productId}`">
              {{ $t('businessProductStockAdmin.consuptions')}} <br> <i class="bi bi-arrow-up-circle-fill"></i>
            </button>
          </div>
          <div class="col-6">
            <button
              @click="getProductReplacements()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#replacementModal-${this.product.productId}`">
              {{ $t('businessProductStockAdmin.replacements')}} <br> <i class="bi bi-arrow-down-circle-fill"></i>
            </button>
          </div>
        </div>
        <hr>
        <div class="row centered">
          <div class="col-12">
            <div v-if="product.lastReplacementAmount" class="col">
              <div class="mb-2">
                <span v-if="product.lastReplacementAmount" class="mx-1">
                  <i class="bi bi bi-arrow-down-circle-fill mb-2"></i> {{ $t('businessProductStockAdmin.lastReplacement')}}
                </span>
              </div>
              <span v-if="product.lastReplacementAmount" class="badge mx-1 detail-data-badge bg-warning">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productQuantity') }} </span>
                <i class="bi bi-eyedropper mx-1"></i> {{ product.lastReplacementAmount }} {{ $t(`productMeasuresTypesShort.${product.productMeasureType}`) }}
              </span>
              <span v-if="product.lastReplacementDate" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.lastReplacementDate') }} </span>
                {{ product.lastReplacementDate }}</span>
              <span v-if="product.lastReplacementExpirationDate" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productExpiration') }} </span>
                <i class="bi bi-heart-pulse-fill mx-1"> </i> {{ product.lastReplacementExpirationDate }}</span>
              <span v-if="product.nextReplacementDate" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productNext') }} </span>
                <i class="bi bi-calendar-fill mx-1"> </i> {{ product.nextReplacementDate }}</span>
              <span v-if="product.lastReplacementBy" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.user') }} </span>
                <i class="bi bi-person-fill mx-1"> </i> {{ product.lastReplacementBy }}</span><br>
            </div>
          </div>
        </div>
        <div class="row m-1 centered">
          <div class="col">
            <div class="mt-2">
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ product.productId }}  <strong>Code:</strong> {{ product.productCode || '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Consumos -->
    <div class="modal fade" :id="`consumptionsModal-${this.product.productId}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-arrow-up-circle-fill"></i> {{ $t("businessProductStockAdmin.consuptionsOf") }} {{ product.productName }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">
            <ProductConsumptionManagement
              :showProductConsumptionManagement="true"
              :toggles="toggles"
              :productConsumptionsIn="productConsumptions"
              :product="product"
              :commerce="commerce"
              :commerces="commerces"
              @getProductConsuptions="getProductConsuptions"
            >
            </ProductConsumptionManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Reemplazos -->
    <div class="modal fade" :id="`replacementModal-${this.product.productId}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-arrow-down-circle-fill"></i> {{ $t("businessProductStockAdmin.replacementsOf") }} {{ this.product.productName }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <ProductReplacementManagement
              :showProductReplacementManagement="true"
              :toggles="toggles"
              :productReplacementsIn="productReplacements"
              :product="product"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              @getProductReplacements="getProductReplacements"
            >
            </ProductReplacementManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
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
  border: 1px solid var(--gris-default);
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
.metric-keyword-tag {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
}
</style>