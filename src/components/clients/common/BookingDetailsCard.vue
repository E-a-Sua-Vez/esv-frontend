<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'BookingDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    booking: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      extendedEntity: false
    }
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyBooking() {
      const textToCopy = jsonToCsv([this.booking]);
      navigator.clipboard.writeText(textToCopy);
    },
    clasifyStatus(status) {
      if (status === undefined) {
        return 'bi-calendar-fill blue-icon';
      } else if (status === 'PENDING') {
        return 'bi-clock-fill yellow-icon';
      } else if (status === 'CONFIRMED') {
        return 'bi-check-circle-fill green-icon';
      } else if (status === 'PROCESSED') {
        return 'bi-qr-code green-icon';
      } else {
        return 'bi-calendar-fill red-icon';
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
      <div v-if="booking.servicesDetails" class="idNumber-title lefted">
        <span v-for="serv in booking.servicesDetails" :key="serv.id" class="badge service-badge bg-primary p-1"> {{ serv.name }} </span>
        <span v-if="booking.packageId" class="badge bg-secondary service-badge"> <i class="bi bi-box-fill"></i> <span> {{ booking.packageProcedureNumber }} </span> </span>
      </div>
      <div class="col-6 card-client-title lefted fw-bold" v-if="booking && booking.userName">
        {{ booking.userName?.trim().toUpperCase() || '' }} {{ booking.userLastName?.trim().toUpperCase() || '' }}
        <i v-if="booking.paid !== undefined && booking.paid === true" class="bi bi-coin mx-1 blue-icon"> </i>
      </div>
      <div class="col-2 centered fw-bold">
        <i :class="`bi ${clasifyStatus(booking.status)} mx-1`"></i>
      </div>
      <div class="col-4 centered date-title">
        {{ getDate(booking.date) }}
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
              <i class="bi bi-person-circle mx-1"></i> {{ booking.userName || 'N/I' }} {{ booking.userLastName || '' }} <a class="btn copy-icon"
                @click="copyBooking()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+booking.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ booking.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+booking.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ booking.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ booking.userIdNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+booking.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ booking.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+booking.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ booking.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ booking.userIdNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row m-1 centered">
          <div class="col">
            <div class="" v-if="booking.paid !== undefined && booking.paid === true">
              <div class="mb-2">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="booking.paid">
                <span v-if="booking.paymentType" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentType') }} </span>
                  {{ $t(`paymentTypes.${booking.paymentType}`) }}</span>
                <span v-if="booking.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentMethod') }} </span>
                  {{ $t(`paymentClientMethods.${booking.paymentMethod}`) }}</span>
                <span v-if="booking.paymentAmount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentAmount') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ booking.paymentAmount }}</span>
                <span v-if="booking.paymentCommission" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentCommission') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ booking.paymentCommission }}</span>
                <span v-if="booking.packageId && booking.packageName" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.package') }} </span>
                  {{ booking.packageName }}
                  <span class="badge mx-1 bg-secondary">{{ booking.packageProcedureNumber }} / {{ booking.packageProceduresTotalNumber }}</span>
                  <i class="bi bi-check-circle-fill green-icon" v-if="booking.packagePaid"> </i>
                </span>
              </div>
              <hr>
            </div>
            <div v-if="booking.rating || booking.nps">
              <div class="mb-2">
                <i class="bi bi-star-fill mx-1"> </i> <span class="mb-1">{{ $t("dashboard.surveyData") }}</span>
              </div>
              <span class="badge mx-1 detail-data-badge">
                CSAT <i class="bi bi-star-fill yellow-icon"></i>  {{ booking.rating || 'N/I' }} </span>
              <span class="badge mx-1 detail-data-badge">
                NPS <i class="bi bi-emoji-smile-fill blue-icon"></i>  {{ booking.nps || 'N/I' }}
              </span>
            </div>
            <div class="mt-2">
              <div class="mb-2">
                <i class="bi bi-qr-code mx-1"> </i> <span class="mb-1">{{ $t("dashboard.attData") }}</span>
              </div>
              <span v-if="booking.queueName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.queueData') }} </span>
                {{ booking.queueName }}</span>
              <span v-if="booking.commerceName && booking.commerceTag" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.commerceData') }} </span>
                {{ booking.commerceName }} - {{ booking.commerceTag }}</span>
              <span v-if="booking.servicesDetails" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.service') }} </span>
                <span v-for="serv in booking.servicesDetails" :key="serv.id" class="badge bg-primary mx-1"> {{ serv.name }} </span>
              </span>
              <br><br>
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ booking.bookingId }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(booking.createdDate) }}</span>
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
  max-height: 400px !important;
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