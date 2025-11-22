<script>
import { getContactResultTypes } from '../../../../shared/utils/data';
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
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
      limit: 10,
    };
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
        this.productConsumptions = await getProductsConsumptionsDetails(
          undefined,
          undefined,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined,
          this.outcome.outcomeId
        );
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    clasifyOutcomeStatus(status) {
      if (status === 'PENDING') {
        return 'bi-clock-fill icon yellow-icon';
      } else if (status === 'CONFIRMED') {
        return 'bi-check-circle-fill icon green-icon';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill icon red-icon';
      } else {
        return 'bi-asteric icon blue-icon';
      }
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="row metric-card">
      <div class="idNumber-title lefted fw-bold" v-if="outcome && outcome.type">
        <span class="badge service-badge bg-primary p-1">{{ outcome.outcomesTypesName }} </span>
      </div>
      <div class="col-5 card-client-title lefted fw-bold" v-if="outcome && outcome.beneficiary">
        {{ outcome.beneficiary }}
      </div>
      <div class="col-4 centered fw-bold date-title fw-bold">
        {{ Number(outcome.amount).toLocaleString('de-DE') }}
        <i v-if="outcome.status" :class="`bi ${clasifyOutcomeStatus(outcome.status)} mx-1`"> </i>
      </div>
      <div class="col-3 centered date-title">
        {{ getDate(outcome.paymentDate) }}
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered">
        <span href="#" @click.prevent="showDetails()">
          <span class="details-title">{{ $t('dashboard.details') }}</span>
          <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
        </span>
      </div>
      <div :class="{ show: extendedEntity }" class="detailed-data transition-slow">
        <div class="row m-1 centered">
          <div class="col">
            <div class="">
              <div class="mb-2">
                <i class="bi bi-check-circle-fill mx-1"> </i>
                <span class="mb-1">{{ $t('collaboratorBookingsView.paymentData') }}</span>
              </div>
              <div>
                <span v-if="outcome.title" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.outcomeTitle') }}
                  </span>
                  {{ outcome.title }}
                </span>
                <span v-if="outcome.outcomesTypesName" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.outcomeType') }}
                  </span>
                  {{ outcome.outcomesTypesName }}
                </span>
                <span v-if="outcome.beneficiary" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.outcomeBeneficiary') }}
                  </span>
                  {{ outcome.beneficiary }}</span
                >
                <span v-if="outcome.amount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentAmount') }}
                  </span>
                  <i class="bi bi-coin mx-1"> </i> {{ outcome.amount }}</span
                >
                <span v-if="outcome.paymentFiscalNote" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentFiscalNote') }}
                  </span>
                  {{ $t(`paymentFiscalNotes.${outcome.paymentFiscalNote}`) }}</span
                >
                <span v-if="outcome.paymentType" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentType') }}
                  </span>
                  {{ $t(`paymentTypes.${outcome.paymentType}`) }}</span
                >
                <span v-if="outcome.productName" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.outcomeProduct') }}
                  </span>
                  {{ outcome.productName }}
                </span>
                <span v-if="outcome.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentMethod') }}
                  </span>
                  {{ $t(`paymentClientMethods.${outcome.paymentMethod}`) }}</span
                >
                <span v-if="outcome.quantity" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.productQuantity') }}
                  </span>
                  {{ outcome.quantity }}</span
                >
                <span v-if="outcome.code" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.code') }}
                  </span>
                  {{ outcome.code }}
                </span>
              </div>
              <hr />
            </div>
            <div class="col centered">
              <div class="col">
                <div class="col">
                  <span v-if="outcome.user" class="badge mx-1 detail-data-badge">
                    <span class="fw-bold detail-data-badge-title">
                      {{ $t('dashboard.userData') }}
                    </span>
                    {{ outcome.user }}
                  </span>
                  <span
                    v-if="outcome.commerceName && outcome.commerceTag"
                    class="badge mx-1 detail-data-badge"
                  >
                    <span class="fw-bold detail-data-badge-title">
                      {{ $t('dashboard.commerceData') }}
                    </span>
                    {{ outcome.commerceName }} - {{ outcome.commerceTag }}</span
                  ><br /><br />
                  <span class="metric-card-details mx-1"
                    ><strong>Id:</strong> {{ outcome.id }}</span
                  >
                  <span class="metric-card-details"
                    ><strong>Date:</strong> {{ getDate(outcome.paymentDate) }}</span
                  >
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
  padding: 0.1rem;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
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
  font-size: 0.7rem;
  color: var(--color-text);
}
.metric-card-title {
  margin: 0.2rem;
  font-size: 0.8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 0.7rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: 0.7rem;
  font-weight: 400;
}
</style>
