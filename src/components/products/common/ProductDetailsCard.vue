<script>
import { globalStore } from '../../../stores';
import { getDate } from '../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import ProductReplacementManagement from '../domain/ProductReplacementManagement.vue';
import { getProductsReplacementDetails } from '../../../application/services/query-stack';

export default {
  name: 'ProductDetailsCard',
  components: { Popper, Spinner, ProductReplacementManagement },
  props: {
    show: { type: Boolean, default: true },
    product: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
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
      productReplacements: []
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
        this.attentions = await getAttentionsDetails(this.commerce.id, this.startDate, this.endDate, commerceIds,
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
        this.productReplacements = await getProductsReplacementDetails(this.product.productId, this.page, this.limit, this.asc, this.startDate, this.endDate);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getProductConsuptions() {

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
        <i class="bi bi-eyedropper mx-1"></i> {{ product.productName }}
      </div>
      <div class="col-6 centered fw-bold">
        <i :class="`bi ${clasifyProductStatus(product.productStatus)} mx-2 h5`"></i>
        <i :class="`bi ${clasifyExpired(product.daysSinceExpired)} mx-2 h6`"></i>
        <i :class="`bi ${clasifyReplacement(product.daysSinceNextReplacement)} mx-2 h6`"></i>
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
              :data-bs-target="`#consuptionsModal-${this.product.id}`">
              {{ $t('businessProductStockAdmin.consuptions')}} <br> <i class="bi bi-arrow-up-circle-fill"></i>
            </button>
          </div>
          <div class="col-6">
            <button
              @click="getProductReplacements()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#replacementModal-${this.product.id}`">
              {{ $t('businessProductStockAdmin.replacements')}} <br> <i class="bi bi-arrow-down-circle-fill"></i>
            </button>
          </div>
        </div>
        <hr>
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
    <div class="modal fade" :id="`consuptionsModal-${this.product.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-arrow-up-circle-fill"></i> {{ $t("businessProductStockAdmin.consuptionsOf") }} {{ product.productName }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">

          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-toggle="modal" data-bs-target="#detailsQuestionModal">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Reemplazos -->
    <div class="modal fade" :id="`replacementModal-${this.product.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
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
              :startDate="startDate"
              :endDate="endDate"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              @getProductReplacements="getProductReplacements"
            >
            </ProductReplacementManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-toggle="modal" data-bs-target="#detailsQuestionModal">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
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
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  font-size: .8rem;
}
.details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: 1.1rem;
  border: 1.5px solid var(--gris-default);
  border-top: 0;
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
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.metric-card-detail-subtitle {
  font-size: .72rem;
  font-weight: 400;
  line-height: .7rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .5rem;
}
.act-icon {
  color: var(--azul-es);
  cursor: pointer;
  margin: .5rem;
}
.whatsapp-link {
  color: var(--color-text);
  cursor: pointer;
  text-decoration: underline;
}
.whatsapp-link:hover {
  color: var(--gris-default);
  cursor: pointer;
  text-decoration: underline;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: .7rem;
  font-weight: 400;
}
.active-name {
  background-color: var(--azul-turno);
  color: var(--color-background);
  font-weight: 700;
  font-size: .9rem;
}
.card-action {
  font-size: .7rem !important;
  line-height: .8rem !important;
  font-weight: 600;
}
.bar-label {
  font-size: .7rem !important;
  line-height: .7rem !important;
  font-weight: 500;
}
</style>