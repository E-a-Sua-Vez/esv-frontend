<script>
import { getContactResultTypes } from '../../../../shared/utils/data';
import { getDate } from '../../../../shared/utils/date';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';
import { formatIdNumber } from '../../../../shared/utils/idNumber';
import { confirmPendingIncome } from '../../../../application/services/income';
import AreYouSure from '../../../common/AreYouSure.vue';

export default {
  name: 'IncomeDetailsCard',
  components: { Popper, Spinner, AreYouSure },
  props: {
    show: { type: Boolean, default: true },
    toggles: { type: Object, default: undefined },
    income: { type: Object, default: undefined },
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
      goToConfirm: false,
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
      const textToCopy = jsonToCsv([this.income]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyIncomeStatus(status) {
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
    clasifyDaysSinceBooking() {
      return 'bi-calendar-fill blue-icon';
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    goConfirm() {
      this.goToConfirm = !this.goToConfirm;
    },
    cancelConfirm() {
      this.goToConfirm = false;
    },
    async confirmPayment() {
      try {
        this.loading = true;
        await confirmPendingIncome(this.income.id);
        setTimeout(() => {
          this.$emit('refresh');
        }, 3000);
        this.goToConfirm = false;
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    manualIncome() {
      return ['STANDARD', 'FUND_INCREASE'].includes(this.income.type);
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
    <div class="row metric-card" v-if="manualIncome()">
      <div class="idNumber-title lefted fw-bold" v-if="income && income.incomeInfo.user">
        <i class="bi bi-hand-index-fill"></i>
        <span class="mx-1">{{ income.incomeInfo?.user.trim().toUpperCase() || '' }}</span>
      </div>
      <div class="col-5 card-client-title lefted fw-bold">
        {{ income.incomeInfo?.title.trim().toUpperCase() || '' }}
      </div>
      <div class="col-4 centered fw-bold date-title fw-bold">
        {{ Number(income.amount).toLocaleString('de-DE') }}
        <i v-if="income.status" :class="`bi ${clasifyIncomeStatus(income.status)} mx-1`"> </i>
      </div>
      <div class="col-3 centered date-title">
        {{ getDate(income.paidAt || income.paymentDate) }}
      </div>
    </div>
    <div class="row metric-card" v-else>
      <div class="idNumber-title lefted fw-bold" v-if="income && income.userName">
        <i class="bi bi-person-circle"></i>
        <span class="mx-1"
          >{{ income.userName?.trim().toUpperCase() || '' }}
          {{ income.userLastName?.trim().toUpperCase() || '' }}</span
        >
      </div>
      <div class="col-5 card-client-title lefted fw-bold">
        {{ formatIdNumber(income.userIdNumber) || 'N/I' }}
        <span v-if="income.type === 'INSTALLMENT'" class="badge bg-primary mx-1">
          {{ income.installmentNumber }}</span
        >
        <span v-if="income.type === 'FIRST_PAYMENT'" class="badge bg-success mx-1"> I </span>
        <span v-if="income.type === 'UNIQUE'" class="badge bg-success mx-1"> U </span>
      </div>
      <div class="col-4 centered fw-bold date-title fw-bold">
        {{ Number(parseFloat(income.amount).toFixed(2)).toLocaleString('de-DE') }}
        <i v-if="income.status" :class="`bi ${clasifyIncomeStatus(income.status)} mx-1`"> </i>
      </div>
      <div class="col-3 centered date-title">
        {{ getDate(income.paidAt || income.paymentDate) }}
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
        <div class="row m-0" v-if="!manualIncome()">
          <div class="d-block col-12 col-md-6">
            <div class="col-12 centered fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ income.userName || 'N/I' }}
              {{ income.userLastName || '' }}
              <a class="btn copy-icon" @click="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/' + income.userPhone"
                target="_blank"
              >
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ income.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:' + income.userEmail"
                target="_blank"
              >
                <i class="bi bi-envelope mx-1"></i> {{ income.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ income.userIdNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/' + income.userPhone"
                target="_blank"
              >
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ income.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:' + income.userEmail"
                target="_blank"
              >
                <i class="bi bi-envelope mx-1"></i> {{ income.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ income.userIdNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row mx-1 mt-3 centered" v-if="income.status === 'PENDING'">
          <div class="col-12" v-if="toggles['financial.incomes.confirm']">
            <button
              @click="goConfirm()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
            >
              {{ $t('collaboratorBookingsView.confirmPayment') }} <br />
              <i class="bi bi-coin"></i>
            </button>
            <AreYouSure
              :show="goToConfirm"
              :yes-disabled="toggles['financial.incomes.confirm']"
              :no-disabled="toggles['financial.incomes.confirm']"
              @actionYes="confirmPayment()"
              @actionNo="cancelConfirm()"
            >
            </AreYouSure>
          </div>
        </div>
        <hr />
        <div class="row m-1 centered">
          <div class="col">
            <div class="">
              <div class="mb-2">
                <i class="bi bi-check-circle-fill mx-1"> </i>
                <span class="mb-1">{{ $t('collaboratorBookingsView.paymentData') }}</span>
              </div>
              <div class="col">
                <span
                  v-if="income.installmentNumber"
                  class="badge mx-1 detail-data-badge bg-warning"
                >
                  {{ income.installmentNumber }}
                </span>
                <span
                  v-if="income.installments && income.installments"
                  class="badge mx-1 detail-data-badge"
                >
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.installments') }}
                  </span>
                  {{ income.installments }}
                </span>
                <span v-if="income.fiscalNote" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentFiscalNote') }}
                  </span>
                  {{ $t(`paymentFiscalNotes.${income.fiscalNote}`) }}
                </span>
                <span v-if="income.type" class="badge mx-1 detail-data-badge bg-success">
                  {{ $t(`incomeTypes.${income.type}`) }}
                </span>
                <span v-if="income.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentMethod') }}
                  </span>
                  {{ $t(`paymentClientMethods.${income.paymentMethod}`) }}
                </span>
                <span v-if="income.amount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentAmount') }}
                  </span>
                  <i class="bi bi-coin mx-1"> </i>
                  {{ Number(parseFloat(income.amount).toFixed(2)).toLocaleString('de-DE') }}
                </span>
                <span v-if="income.totalAmount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.totalAmount') }}
                  </span>
                  <i class="bi bi-coin mx-1"> </i>
                  {{ Number(parseFloat(income.totalAmount).toFixed(2)).toLocaleString('de-DE') }}
                </span>
                <span v-if="income.paymentCommission" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.paymentCommission') }}
                  </span>
                  <i class="bi bi-coin mx-1"> </i> {{ income.paymentCommission }}
                </span>
                <span v-if="income.createdBy" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('dashboard.userData') }}
                  </span>
                  <i class="bi bi-person-fill"> </i> {{ income.createdBy }}
                </span>
              </div>
              <hr />
            </div>
            <div class="mt-2">
              <div class="mb-2">
                <i class="bi bi-qr-code mx-1"> </i>
                <span class="mb-1">{{ $t('dashboard.attData') }}</span>
              </div>
              <div class="m-0 mt-2" v-if="income.bookingServicesDetails">
                <span
                  v-for="serv in income.bookingServicesDetails"
                  :key="serv.id"
                  class="badge mx-1 detail-data-badge"
                >
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.service') }}
                  </span>
                  {{ serv.name }}
                </span>
              </div>
              <div class="m-0 mt-2" v-if="income.attentionServicesDetails">
                <span
                  v-for="serv in income.attentionServicesDetails"
                  :key="serv.id"
                  class="badge mx-1 detail-data-badge"
                >
                  <span class="fw-bold detail-data-badge-title">
                    {{ $t('paymentData.service') }}
                  </span>
                  {{ serv.name }}
                </span>
              </div>
              <span
                v-if="income.packageId && income.packageName"
                class="badge mx-1 detail-data-badge"
              >
                <span class="fw-bold detail-data-badge-title">
                  {{ $t('paymentData.package') }}
                </span>
                {{ income.packageName }}
                <span class="badge mx-1 bg-secondary"> {{ income.proceduresAmount }}</span>
                <i class="bi bi-check-circle-fill green-icon" v-if="income.packagePaid"> </i>
              </span>
              <span
                v-if="income.commerceName && income.commerceTag"
                class="badge mx-1 detail-data-badge"
              >
                <span class="fw-bold detail-data-badge-title">
                  {{ $t('dashboard.commerceData') }}
                </span>
                {{ income.commerceName }} - {{ income.commerceTag }}</span
              >
              <br /><br />
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ income.id }}</span>
              <span class="metric-card-details"
                ><strong>Date:</strong> {{ getDate(income.paymentDate) }}</span
              >
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
