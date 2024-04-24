<script>
import { getContactResultTypes } from '../../../../shared/utils/data';
import { getDate } from '../../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';

export default {
  name: 'OutcomeDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    outcome: { type: Object, default: undefined },
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
      const textToCopy = jsonToCsv([this.outcome]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyDaysSinceComment() {
      return 'bi-qr-code blue-icon';
    },
    clasifyDaysSinceBooking() {
      return 'bi-calendar-fill blue-icon';
    },
    async getAttentionProducts() {
      try {
        this.loading = true;
        this.productConsumptions = await getProductsConsumptionsDetails(undefined, undefined, this.page, this.limit, this.asc, undefined, undefined, this.outcome.outcomeId);
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
      <div class="col-4 centered fw-bold">
        {{ Number(outcome.paymentAmount).toLocaleString("de-DE") }}
        <span v-if="outcome.type" :class="`badge bg-secondary metric-keyword-tag mx-1 fw-bold ${outcome.type === 'PRODUCT_REPLACEMENT' ? 'bg-success' : '' }`"> {{ outcome.type === 'PRODUCT_REPLACEMENT' ? 'R' : '' }}</span>
      </div>
      <div class="col-4 centered fw-bold date-title" v-if="outcome && outcome.title">
        {{ outcome.title || 'N/I' }}
      </div>
      <div class="col-4 centered date-title">
        {{ getDate(outcome.paymentDate) }}
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
        <div class="row m-1 centered">
          <div class="col">
            <div class="" v-if="outcome.paid !== undefined && outcome.paid === true">
              <div class="">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="outcome.paid">
                <span v-if="outcome.type" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.outcomeType') }} </span>
                  {{ $t(`outcomeTypes.${outcome.type}`) }}
                </span>
                <span v-if="outcome.productName" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.outcomeProduct') }} </span>
                  {{ outcome.productName }}
                </span>
                <span v-if="outcome.beneficiary" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.outcomeBeneficiary') }} </span>
                  {{ outcome.beneficiary }}</span>
                <span v-if="outcome.amount" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.productQuantity') }} </span>
                  {{ outcome.amount }}</span>
                <span v-if="outcome.paymentFiscalNote" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentFiscalNote') }} </span>
                  {{ $t(`paymentFiscalNotes.${outcome.paymentFiscalNote}`) }}</span>
                <span v-if="outcome.paymentType" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentType') }} </span>
                  {{ $t(`paymentTypes.${outcome.paymentType}`) }}</span>
                <span v-if="outcome.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentMethod') }} </span>
                  {{ $t(`paymentClientMethods.${outcome.paymentMethod}`) }}</span>
                <span v-if="outcome.paymentAmount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentAmount') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ outcome.paymentAmount }}</span>
              </div>
              <hr>
            </div>
            <div class="row centered">
              <div class="col-1 mx-1">
                <a class="btn copy-icon"
                  @click="copyAttention()">
                  <i class="bi bi-file-earmark-spreadsheet"></i>
                </a>
              </div>
              <div class="col">
                <div class="col">
                  <span v-if="outcome.user" class="badge mx-1 detail-data-badge">
                    <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
                     {{ outcome.user }}
                  </span>
                  <span v-if="outcome.commerceName && outcome.commerceTag" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.commerceData') }} </span>
                    {{ outcome.commerceName }} - {{ outcome.commerceTag }}</span><br><br>
                  <span class="metric-card-details mx-1"><strong>Id:</strong> {{ outcome.id }}</span>
                  <span class="metric-card-details"><strong>Date:</strong> {{ getDate(outcome.paymentDate) }}</span>
                </div>
              </div>
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