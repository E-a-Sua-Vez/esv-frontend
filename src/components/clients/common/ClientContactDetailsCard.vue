<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { contactClient } from '../../../application/services/client';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'ClientContactDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    client: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined }
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      asc: false,
      contactResultTypes: [
        { id: 'INTERESTED', name: 'INTERESTED' },
        { id: 'CONTACT_LATER', name: 'CONTACT_LATER' },
        { id: 'REJECTED', name: 'REJECTED' }
      ]
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
      const textToCopy = jsonToCsv([this.client]);
      navigator.clipboard.writeText(textToCopy);
    },
    async check() {
      try {
        this.loading = true;
        if (this.client && this.client.userId) {
          const user = await contactClient(this.client.userId, {});
          this.checked = user.contacted;
        }
        this.loading = false;
      } catch (error) {
        this.checked = false;
        this.loading = false;
        this.alertError = error.message;
      }
    },
    goToCreateBooking() {
      const commerceKeyName = this.commerce.keyName;
      let url = `/interno/commerce/${commerceKeyName}/filas`;
      let resolvedRoute;
      let query = {};
      if (this.client && this.client.id) {
        query['client'] = this.client.id;
      }
      if (Object.keys(query).length === 0) {
        resolvedRoute = this.$router.resolve({ path: url });
      } else {
        resolvedRoute = this.$router.resolve({ path: url, query });
      }
      window.open(resolvedRoute.href, '_blank');
    },
    clasifyDaysContacted(score){
      if (score === undefined) {
        return 'bi-chat-left-dots-fill blue-icon';
      } else if (score <= 90) {
        return 'bi-chat-left-dots-fill green-icon';
      } else if (score <= 180) {
        return 'bi-chat-left-dots-fill yellow-icon';
      } else {
        return 'bi-chat-left-dots-fill red-icon';
      }
    },
    clasifyContactResult(result){
      if (result === undefined) {
        return 'bi-patch-check-fill blue-icon';
      } else if (result === 'INTERESTED') {
        return 'bi-patch-check-fill green-icon';
      } else if (result === 'CONTACT_LATER') {
        return 'bi-patch-check-fill yellow-icon';
      } else {
        return 'bi-patch-check-fill red-icon';
      }
    },
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
      <div class="col-6 card-client-title lefted fw-bold mt-1" v-if="client && client.userName">
        {{ client.userName?.trim().toUpperCase() || '' }} {{ client.userLastName?.trim().toUpperCase() || '' }}
        <i :class="`bi ${clasifyContactResult(client.clientContactResult || undefined)} mx-1`"> </i>
      </div>
      <div class="col-2 centered fw-bold card-client-title">
        <i :class="`bi ${clasifyDaysContacted(client.daysSinceContact || 0)} mx-1`"> </i> {{ client.daysSinceContact || 0 }}
      </div>
      <div class="col-4 centered date-title">
        {{ getDate(client.contactCreatedDate || client.createdAt) }}
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
            <div class="col-12 centered fw-bold">
              <i class="bi bi-person-circle mx-1"></i> {{ client.userName || 'N/I' }} {{ client.userLastName || '' }}
              <a class="btn copy-icon"
                @click="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+client.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ client.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+client.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ client.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ client.userIdNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+client.userPhone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 whatsapp-icon"></i> {{ client.userPhone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto:'+client.userEmail"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ client.userEmail || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ client.userIdNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row my-3 centered" v-if="!loading">
          <div class="col-9">
            <span>{{ client.comment }}</span>
          </div>
          <div class="col-3">
            <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
              @click="goTogoToCreateBookingLink()" >
              <i class="bi bi-calendar-check-fill"></i>
            </button>
          </div>
        </div>
        <hr>
        <div class="row m-1 centered">
          <div class="col">
            <div class="mt-2">
              <div class="mb-2">
                <i class="bi bi-chat-left-dots-fill mx-1"> </i> <span class="mb-1">{{ $t("dashboard.contactData") }}</span>
              </div>
              <span v-if="client.clientContactType" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.contactType') }} </span>
                {{ client.clientContactType }}</span>
              <span v-if="client.clientContactResult" class="badge mx-1 detail-data-badge bg-warning">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.contactResult') }} </span>
                {{ $t(`contactResultTypes.${client.clientContactResult}`) }}</span><br>
              <span v-if="client.collaboratorName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
                <i class="bi bi-person-fill"> </i> {{ client.collaboratorName }}</span>
              <span v-if="client.commerceName && client.commerceTag" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.commerceData') }} </span>
                {{ client.commerceName }} - {{ client.commerceTag }}</span><br><br>
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ client.clientId }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(client.contactCreatedDate || client.createdAt) }}</span>
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