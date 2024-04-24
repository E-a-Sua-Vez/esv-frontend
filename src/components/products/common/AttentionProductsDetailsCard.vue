<script>
import { getContactResultTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import ProductAttentionManagement from '../domain/ProductAttentionManagement.vue';
import { getProductsConsumptionsDetails } from '../../../application/services/query-stack';

export default {
  name: 'AttentionProductsDetailsCard',
  components: { Popper, Spinner, ProductAttentionManagement },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: [],
      productConsumptions: [],
      page: 1,
      limit: 10
    }
  },
  beforeMount() {
    this.contactResultTypes = getContactResultTypes();
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 90) {
        return 'bi-qr-code green-icon';
      } else if (score <= 180) {
        return 'bi-qr-code yellow-icon';
      } else {
        return 'bi-qr-code red-icon';
      }
    },
    async getAttentionProducts() {
      try {
        this.loading = true;
        this.productConsumptions = await getProductsConsumptionsDetails(undefined, undefined, this.page, this.limit, this.asc, undefined, undefined, this.attention.attentionId);
        this.loading = false;
      } catch (error) {
        this.loading = false;
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
    <div class="row metric-card">
      <div class="col-6 centered fw-bold" v-if="attention && attention.userName">
        {{ attention.userName.split(' ')[0] || attention.userIdNumber || 'N/I' }}
        <i v-if="attention.productCounter > 0" class="bi bi-eyedropper mx-1"> </i>
      </div>
      <div class="col-2 centered fw-bold">
        <i :class="`bi ${clasifyDaysSinceComment(attention.daysSinceAttention || 0)} mx-1`"></i> {{ attention.daysSinceAttention || 0 }}
      </div>
      <div class="col-4 centered date-title">
        {{ getDate(attention.createdDate) }}
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
      <div
        :class="{ show: extendedEntity }"
        class="detailed-data transition-slow">
        <div class="row m-0">
          <div class="d-block col-12 col-md-6">
            <div class="col-12 centered">
              <i class="bi bi-person-circle mx-1"></i> {{ attention.userName || 'N/I' }} {{ attention.userLastName || '' }} <a class="btn copy-icon"
                @click="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+attention.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ attention.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+attention.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ attention.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ attention.userIdNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+attention.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ attention.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+attention.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ attention.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ attention.userIdNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row centered my-2" v-if="!loading">
          <div class="col-12">
            <button
              @click="getAttentionProducts()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action px-4"
              data-bs-toggle="modal"
              :data-bs-target="`#attentionsProductsModal-${attention.attentionId}`">
              {{ $t('businessProductStockAdmin.stock')}} <br> <i class="bi bi-eyedropper"></i>
            </button>
          </div>
        </div>
        <hr>
        <div class="mt-2">
          <div class="">
            <i class="bi bi-qr-code mx-1"> </i> <span class="mb-1">{{ $t("dashboard.attData") }}</span>
          </div>
          <span v-if="attention.queueName" class="badge mx-1 detail-data-badge">
            <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.queueData') }} </span>
            {{ attention.queueName }}</span>
          <span v-if="attention.collaboratorName" class="badge mx-1 detail-data-badge">
            <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
            <i class="bi bi-person-fill"> </i> {{ attention.collaboratorName }}</span>
          <span v-if="attention.commerceName && attention.commerceTag" class="badge mx-1 detail-data-badge">
            <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.commerceData') }} </span>
            {{ attention.commerceName }} - {{ attention.commerceTag }}</span><br><br>
          <span class="metric-card-details mx-1"><strong>Id:</strong> {{ attention.attentionId }}</span>
          <span class="metric-card-details"><strong>Date:</strong> {{ getDate(attention.createdDate) }}</span>
        </div>
      </div>
    </div>
    <!-- Modal Products -->
    <div class="modal fade" :id="`attentionsProductsModal-${attention.attentionId}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-eyedropper"></i> {{ $t("businessProductStockAdmin.attentionProducts") }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">
            <ProductAttentionManagement
              :showProductAttentionManagement="true"
              :toggles="toggles"
              :attention="attention"
              :commerce="commerce"
              :productAttentionsIn="productConsumptions"
              @getProductConsuptions="getAttentionProducts"
            >
            </ProductAttentionManagement>
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
  border: 1.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  line-height: 1.6rem;
}
.show {
  padding: 10px;
  max-height: 1000px !important;
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
</style>