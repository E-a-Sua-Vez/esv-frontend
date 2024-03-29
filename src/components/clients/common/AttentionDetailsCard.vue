<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { contactUser } from '../../../application/services/user';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'AttentionDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      checked: false
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
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    async check() {
      try {
        this.loading = true;
        if (this.attention && this.attention.userId) {
          const user = await contactUser(this.attention.userId);
          this.checked = user.contacted;
        }
        this.loading = false;
      } catch (error) {
        this.checked = false;
        this.loading = false;
        this.alertError = error.message;
      }
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 30) {
        return 'bi-qr-code green-icon';
      } else if (score <= 90) {
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
      <div class="col-6 centered fw-bold" v-if="attention && attention.userName">
        <i class="bi bi-person-circle mx-1"></i> {{ attention.userName.split(' ')[0] || attention.userIdNumber || 'N/I' }}
        <i v-if="attention.surveyId" class="bi bi-star-fill mx-1 yellow-icon"> </i>
        <i v-if="attention.paid !== undefined && attention.paid === true" class="bi bi-coin mx-1 blue-icon"> </i>
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
        <div class="row m-1 centered">
          <div class="col">
            <div class="" v-if="attention.paid !== undefined && attention.paid === true">
              <div class="">
                <i class="bi bi-check-circle-fill mx-1"> </i> <span class="mb-1">{{ $t("collaboratorBookingsView.paymentData") }}</span>
              </div>
              <div v-if="attention.paid">
                <span v-if="attention.paymentType" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentTypes.${attention.paymentType}`) }}</span>
                <span v-if="attention.paymentMethod" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ $t(`paymentClientMethods.${attention.paymentMethod}`) }}</span>
                <span v-if="attention.paymentAmount" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentAmount }}</span>
                <span v-if="attention.paymentCommission" class="badge rounded-pill yellow-5-area metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-coin mx-1"> </i> {{ attention.paymentCommission }}</span>
                <span v-if="attention.paymentDate" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ getDate(attention.paymentDate) }}</span>
              </div>
              <hr>
            </div>
            <div v-if="attention.rating || attention.nps">
              <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">
                CSAT <i class="bi bi-star-fill yellow-icon"></i>  {{ attention.rating || 'N/I' }} </span>
              <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">
                NPS <i class="bi bi-emoji-smile-fill blue-icon"></i>  {{ attention.nps || 'N/I' }}
              </span>
            </div>
            <div class="mt-2">
              <span v-if="attention.queueName" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ attention.queueName }}</span>
              <span v-if="attention.collaboratorName" class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> <i class="bi bi-person-fill"> </i> {{ attention.collaboratorName }}</span><br>
              <span v-if="attention.commerceName && attention.commerceTag" class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ attention.commerceName }} - {{ attention.commerceTag }}</span><br>
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
.date-title {
  font-size: .8rem
}
</style>