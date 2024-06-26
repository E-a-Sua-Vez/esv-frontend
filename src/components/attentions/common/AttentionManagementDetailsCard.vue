<script>
import { getContactResultTypes } from '../../../shared/utils/data';
import { getDate } from '../../../shared/utils/date';
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';


export default {
  name: 'AttentionManagementDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      contactResultTypes: []
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
      <div v-if="attention.servicesDetails" class="idNumber-title lefted">
        <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge service-badge bg-primary p-1"> {{ serv.name }} </span>
        <span v-if="attention.packageId" class="badge bg-secondary service-badge"> <i class="bi bi-box-fill"></i> <span> {{ attention.packageProcedureNumber }} </span> </span>
      </div>
      <div class="col-6 lefted fw-bold card-client-title mt-1" v-if="attention && attention.userName">
        {{ attention.userName?.trim().toUpperCase() || '' }} {{ attention.userLastName?.trim().toUpperCase() || '' }}
        <i v-if="attention.surveyId" class="bi bi-star-fill mx-1 yellow-icon"> </i>
        <i v-if="attention.paid !== undefined && attention.paid === true" class="bi bi-coin mx-1 blue-icon"> </i>
        <i v-if="attention.productCounter > 0" class="bi bi-eyedropper"> </i>
      </div>
      <div class="col-2 centered fw-bold card-client-title">
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
            <div class="col-12 centered fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ attention.userName || 'N/I' }} {{ attention.userLastName || '' }}
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
        <div class="row m-1 centered">
          <div class="col">
            <div class="" v-if="attention.paid !== undefined && attention.paid === true">
              <div class="mb-2">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="attention.paid">
                <span v-if="attention.paymentType" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentType') }} </span>
                  {{ $t(`paymentTypes.${attention.paymentType}`) }}</span>
                <span v-if="attention.paymentMethod" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentMethod') }} </span>
                  {{ $t(`paymentClientMethods.${attention.paymentMethod}`) }}</span>
                <span v-if="attention.paymentAmount" class="badge mx-1 detail-data-badge bg-warning">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentAmount') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ attention.paymentAmount }}</span>
                <span v-if="attention.paymentCommission" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.paymentCommission') }} </span>
                  <i class="bi bi-coin mx-1"> </i> {{ attention.paymentCommission }}</span>
                <span v-if="attention.packageId && attention.packageName" class="badge mx-1 detail-data-badge">
                  <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.package') }} </span>
                    {{ attention.packageName }}
                    <span class="badge mx-1 bg-secondary">{{ attention.packageProcedureNumber }} / {{ attention.packageProceduresTotalNumber }}</span>
                    <i class="bi bi-check-circle-fill green-icon" v-if="attention.packagePaid"> </i>
                </span>
              </div>
              <hr>
            </div>
            <div v-if="attention.rating || attention.nps">
              <div class="mb-2">
                <i class="bi bi-star-fill mx-1"> </i> <span class="mb-1">{{ $t("dashboard.surveyData") }}</span>
              </div>
              <span class="badge mx-1 detail-data-badge">
                CSAT <i class="bi bi-star-fill yellow-icon"></i>  {{ attention.rating || 'N/I' }} </span>
              <span class="badge mx-1 detail-data-badge">
                NPS <i class="bi bi-emoji-smile-fill blue-icon"></i>  {{ attention.nps || 'N/I' }}
              </span>
              <hr>
            </div>
            <div class="mt-2">
              <div class="mb-2">
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
                {{ attention.commerceName }} - {{ attention.commerceTag }}</span>
              <span v-if="attention.servicesDetails" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.service') }} </span>
                <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge bg-primary mx-1"> {{ serv.name }}</span>
              </span>
              <span v-if="attention.termsConditionsToAcceptedAt" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.termsAccepted') }} </span>
                <span> {{ getDate(attention.termsConditionsToAcceptedAt) }} </span>
              </span>
              <br><br>
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ attention.attentionId }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(attention.createdDate) }}</span>
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
  border: 1px solid var(--gris-default);
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