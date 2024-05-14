<script>
import { getDate } from '../../shared/utils/date';

export default {
  name: 'AttentionDetailsNumber',
  props: {
    type: { type: String, default: 'primary' },
    number: { type: Number, default: 0 },
    data: { type: Object, default: {} },
    attention: { type: Object, default: {}},
    showData: { type: Boolean, default: true },
    toList: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    }
  },
  methods: {
    hasData() {
      return Object.keys(this.data).length > 0 || false;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    colorNumberToShow() {
      return this.type === 'primary' ? 'color-primary' : this.type === 'no-device' ? 'color-nodevice' : 'color-secondary'
    },
    colorDetailToShow() {
      return this.type === 'primary' ? 'color-primary-reverse' : this.type === 'no-device' ? 'color-nodevice-reverse' : 'color-secondary-reverse'
    },
    identifier() {
      return this.data.name
        || this.data.idNumber
        || undefined
    },
    getDate(date) {
      return getDate(date);
    }
  }
}
</script>

<template>
  <div class="justify-content-center">
    <span
      :class="`${toList ? 'attention-identifier-list' : 'attention-identifier'} ${colorDetailToShow()}`"
      v-if="identifier() !== undefined">
      <i class="bi bi-people-fill"></i> {{ identifier() }}
    </span>
    <div :class="`${toList ? 'attention-number-list' : 'attention-number'} ${colorNumberToShow()}`">
      <div class="row metric-card sub-details">
        <div v-if="attention.servicesDetails" class="idNumber-title lefted">
          <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge service-badge bg-primary p-1"> {{ serv.name }} </span>
          <span v-if="attention.packageId" class="badge bg-secondary service-badge"> <i class="bi bi-box-fill"></i> <span> {{ attention.packageProcedureNumber }} </span> </span>
        </div>
        <div class="col-7 card-client-title lefted fw-bold mt-1" v-if="attention && attention.userName">
          {{ attention.userName?.trim().toUpperCase() || '' }} {{ attention.userLastName?.trim().toUpperCase() || '' }}
          <span v-if="attention.termsConditionsAcceptedCode"> <i class="bi bi-person-fill-check mx-1"></i> </span>
          <i v-if="attention.surveyId" class="bi bi-star-fill mx-1 yellow-icon"> </i>
          <i v-if="attention.paid !== undefined && attention.paid === true" class="bi bi-coin mx-1 blue-icon"> </i>
          <i v-if="attention.productCounter > 0" class="bi bi-eyedropper"> </i>
        </div>
        <div class="col-1 centered fw-bold">
          <span></span>
        </div>
        <div class="col-4 righted date-title">
          {{ getDate(attention.createdDate) }}
        </div>
      </div>
      <div
        v-if="number"
        :class="`${toList ? 'attention-number-list' : 'attention-number'}`">
        {{ number }}
      </div>
    </div>
    <div :class="`details-arrow ${colorDetailToShow()}`" v-if="showData && hasData()">
      <span
        data-bs-toggle="collapse"
        :href="`#user-data-${number}`"
        @click.prevent="showDetails()">
        <i class="dark fw-bold" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
      </span>
      <div
        :id="`#user-data-${number}`"
        :class="`collapse ${extendedEntity ? 'show' : ''} detailed-data`">
        <div class="row m-0">
          <div class="d-block col-12 col-md-6">
            <div class="col-12 centered fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ attention.userName || 'N/I' }} {{ attention.userLastName || '' }} <a class="btn copy-icon"
                @click="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
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
                <span v-for="serv in attention.servicesDetails" :key="serv.id" class="badge bg-primary mx-1"> {{ serv.name }} </span>
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
.attention-identifier {
  width: 60%;
  padding: .1rem 1rem;
  margin: 0;
  border-radius: .6rem;
  font-weight: 700;
  font-size: .8rem;
}
.attention-identifier-list {
  margin-bottom: -2rem;
  padding: 0rem 1.5rem 0rem 1.5rem;
  border-radius: .6rem;
  font-weight: 700;
  font-size: .7rem;
}
.attention-number {
  margin-left: .3rem;
  margin-right: .3rem;
  padding: .5rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 2.8rem;
  line-height: 2rem;
}
.attention-number-list {
  margin-left: .3rem;
  margin-right: .3rem;
  padding: .3rem;
  padding-bottom: .5rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 1.8rem;
  line-height: 1.5rem;
}
.color-primary {
  color: var(--verde-tu);
  background-color: var(--color-background);
  border: 1.5px solid var(--verde-tu);
}
.color-secondary {
  color: var(--gris-default);
  background-color: var(--color-background);
  border: 1.5px solid var(--gris-default);
}
.color-nodevice {
  color: var(--orange-no-device);
  background-color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}
.color-primary-reverse {
  background-color: var(--verde-tu);
  color: var(--color-text);
  border: 1.5px solid var(--verde-tu);
}
.color-secondary-reverse {
  color: var(--color-text);
  background-color: var(--gris-default);
  border: 1.5px solid var(--gris-default);
}
.color-nodevice-reverse {
  background-color: var(--orange-no-device);
  color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  border-bottom-left-radius: 2rem;
  border-bottom-right-radius: 2rem;
  border-top-left-radius: .5rem;
  border-top-right-radius: .5rem;
}
.details-arrow {
  margin-left: 1.2rem;
  margin-right: 1.2rem;
  margin-top: 0;
  padding: .01rem;
  border-bottom-left-radius: 2rem;
  border-bottom-right-radius: 2rem;
  line-height: 1rem;
  border-top: 0;
}
.show {
  padding: .5rem;
  max-height: 800px !important;
  overflow-y: auto;
}
.details-title {
  font-size: .8rem;
  color: var(--color-text);
}
.details-data {
  margin-left: 1rem;
  font-size: .7rem;
  color: var(--color-text);
  text-align: left;
}
.sub-details {
  color: var(--color-text) !important;
  font-weight: 500 !important;
}
</style>