<script>
import { getContactResultTypes } from '../../../../shared/utils/data';
import { getDate } from '../../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../../shared/utils/jsonToCsv';
import Spinner from '../../../common/Spinner.vue';

export default {
  name: 'IncomeDetailsCard',
  components: { Popper, Spinner },
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
      const textToCopy = jsonToCsv([this.income]);
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
        this.productConsumptions = await getProductsConsumptionsDetails(undefined, undefined, this.page, this.limit, this.asc, undefined, undefined, this.income.incomeId);
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
        {{ Number(income.paymentAmount).toLocaleString("de-DE") }}
        <span v-if="income.paymentType" :class="`badge bg-secondary metric-keyword-tag mx-1 fw-bold ${income.paymentType === 'PARTIAL' ? 'bg-warning' : 'bg-success' }`"> {{ income.paymentType === 'PARTIAL' ? 'P' : 'T' }}</span>
      </div>
      <div class="col-4 centered fw-bold date-title" v-if="income && income.userName">
        {{ income.userName.split(' ')[0] || income.userIdNumber || 'N/I' }}
        <i v-if="income.attentionId" :class="`bi ${clasifyDaysSinceComment()} mx-1`"></i>
        <i v-if="!income.attentionId && income.bookingId" :class="`bi ${clasifyDaysSinceBooking()} mx-1`"></i>
      </div>
      <div class="col-4 centered date-title">
        {{ getDate(income.paymentDate) }}
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
            <div class="col-12 centered fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ income.userName || 'N/I' }} {{ income.userLastName || '' }}
              <a class="btn copy-icon"
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
                :href="'https://wa.me/'+income.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ income.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+income.userEmail"
                target="_blank">
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
                :href="'https://wa.me/'+income.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ income.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+income.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ income.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ income.userIdNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <hr>
        <div class="row m-1 centered">
          <div class="col">
            <div class="" v-if="income.paid !== undefined && income.paid === true">
              <div class="mb-1">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="income.paid" class="col">
                <span v-if="income.proceduresTotalNumber && income.procedureNumber" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.procedures') }} </span>
                  {{ income.procedureNumber }} {{ $t('collaboratorBookingsView.procedureNumber')}} {{ income.proceduresTotalNumber }}
                </span>
                <span v-if="income.paymentFiscalNote" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentFiscalNote') }} </span>
                  {{ $t(`paymentFiscalNotes.${income.paymentFiscalNote}`) }}
                </span>
                <span v-if="income.paymentType" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentType') }} </span>
                  {{ $t(`paymentTypes.${income.paymentType}`) }}
                </span>
                <span v-if="income.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentMethod') }} </span>
                  {{ $t(`paymentClientMethods.${income.paymentMethod}`) }}
                </span>
                <span v-if="income.paymentAmount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentAmount') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ income.paymentAmount }}
                </span>
                <span v-if="income.paymentCommission" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentCommission') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ income.paymentCommission }}
                </span>
              </div>
              <hr>
            </div>
            <div class="mt-2">
              <div class="">
                <i class="bi bi-qr-code mx-1"> </i> <span class="mb-1">{{ $t("dashboard.attData") }}</span>
              </div>
              <span v-if="income.queueName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.queueData') }} </span>
                {{ income.queueName }}
              </span>
              <span v-if="income.collaboratorName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
                <i class="bi bi-person-fill"> </i> {{ income.collaboratorName }}
              </span>
              <span v-if="income.user" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
                <i class="bi bi-person-fill"> </i> {{ income.user }}
              </span><br><br>
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ income.id }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(income.paymentDate) }}</span>
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