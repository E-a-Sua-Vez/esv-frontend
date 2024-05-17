<script>
import { contactClient } from '../../../application/services/client';
import { globalStore } from '../../../stores';
import { getAttentionsDetails, getClientContactsDetailsByClientId, getPatientHistoryDetails, getBookingsDetails } from '../../../application/services/query-stack';
import { getPatientHistoryItemByCommerce  } from '../../../application/services/patient-history-item';
import { getFormsByClient  } from '../../../application/services/form';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import { getPermissions } from '../../../application/services/permissions';
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import ClientAttentionsManagement from '../domain/ClientAttentionsManagement.vue';
import ClientContactsManagement from '../domain/ClientContactsManagement.vue';
import PatientHistoryManagement from '../../patient-history/domain/PatientHistoryManagement.vue';
import ClientBookingsManagement from '../domain/ClientBookingsManagement.vue';
import ClientDataManagement from '../domain/ClientDataManagement.vue';

export default {
  name: 'ClientDetailsCard',
  components: { Popper, Spinner, ClientAttentionsManagement, ClientContactsManagement, PatientHistoryManagement, ClientBookingsManagement, ClientDataManagement },
  props: {
    show: { type: Boolean, default: true },
    client: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    queues: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    services: { type: Array, default: undefined },
    management: { type: Boolean, default: true },
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      asc: false,
      store,
      userType: undefined,
      user: undefined,
      attentions: [],
      bookings: [],
      clientContacts: [],
      patientHistoryItems: [],
      patientForms: [],
      patientHistory: {},
      togglesClient: {},
      showClientData: false,
      contactResultTypes: [
        { id: 'INTERESTED', name: 'INTERESTED' },
        { id: 'CONTACT_LATER', name: 'CONTACT_LATER' },
        { id: 'REJECTED', name: 'REJECTED' }
      ]
    }
  },
  methods: {
    async getAttentions() {
      try {
        this.loading = true;
        this.attentions = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.attentions = await getAttentionsDetails(this.commerce.id, this.startDate, this.endDate, commerceIds,
          this.page, this.limit, this.daysSinceType, undefined, undefined, undefined,
          this.searchText, this.queueId, this.survey, false, undefined);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getBookings() {
      try {
        this.loading = true;
        this.bookings = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.bookings = await getBookingsDetails(this.commerce.id, this.startDate, this.endDate, commerceIds,
          this.page, this.limit, this.searchText, this.queueId, false);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    getClientData() {
      this.showClientData = true;
    },
    async getClientContacts() {
      try {
        this.loading = true;
        this.clientContacts = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.clientContacts = await getClientContactsDetailsByClientId(
          this.commerce.id, this.startDate, this.endDate, commerceIds, this.client.id,
          this.page, this.limit, this.daysSinceContacted, this.searchText, false, this.contactResultType);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getPatientHistory() {
      try {
        this.loading = true;
        const result = await getPatientHistoryDetails(this.client.id);
        if (result && result.length > 0) {
          this.patientHistory = result[0];
        }
        const items = await getPatientHistoryItemByCommerce(this.commerce.id);
        if (items && items.length > 0) {
          this.patientHistoryItems = items;
        }
        const forms = await getFormsByClient(this.commerce.id, this.client.id);
        if (forms && forms.length > 0) {
          this.patientForms = forms;
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
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
      let url = `/interno/negocio/commerce/${commerceKeyName}/filas`;
      if (this.userType === 'collaborator') {
        url = `/interno/commerce/${commerceKeyName}/filas`;
      }
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
    clasifyDaysContacted(score){
      if (score === undefined || !score) {
        return 'bi-chat-left-dots-fill gray-icon';
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
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
      this.togglesClient = await getPermissions('client', 'admin');
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    closeModal() {
      const modalCloseButton = document.getElementById(`close-modal-patient-history-${this.client.id}`);
      modalCloseButton.click();
    },
    closeDataModal() {
      const modalCloseButton = document.getElementById(`close-modal-client-edit-${this.client.id}`);
      modalCloseButton.click();
      this.showClientData = false;
    }
  },
  computed: {
    visible() {
      const { showClientData } = this;
      return showClientData;
    }
  },
  watch: {
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      }
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card fw-bold">
      <div class="idNumber-title lefted" v-if="client && client.userName" >
        <i class="bi bi-person-circle"></i>
        <span class="mx-1">{{ client.userName?.trim().toUpperCase() || '' }} {{ client.userLastName?.trim().toUpperCase() || '' }}</span>
      </div>
      <div class="col-7 card-client-title lefted">
        {{ formatIdNumber(client.userIdNumber) || 'N/I' }}
        <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold"> {{ client.attentionsCounter || 0 }} </span>
        <i v-if="client.surveyId" class="bi bi-star-fill mx-1 yellow-icon"> </i>
        <i v-if="client.firstAttentionForm === true" class="bi bi-clipboard2-pulse-fill mx-1 blue-icon"> </i>
      </div>
      <div class="col-2 centered card-client-title">
        <i :class="`bi ${clasifyDaysSinceComment(client.daysSinceAttention || 0)} mx-1`"></i> {{ client.daysSinceAttention || 0 }}
      </div>
      <div class="col-3 centered card-client-title">
        <i v-if="client.contacted === true || checked === true" :class="`bi ${clasifyContactResult(client.contactResult || undefined)}`"> </i>
        <i :class="`bi ${clasifyDaysContacted(client.daysSinceContactedClient || 0)} mx-1`"> </i> {{ client.daysSinceContactedClient || 0 }}
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
              <i class="bi bi-person-circle mx-1"></i> {{ client.userName || 'N/I' }} {{ client.userLastName || '' }} <a class="btn copy-icon"
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
              <i class="bi bi-person-vcard mx-1"></i> {{ formatIdNumber(client.userIdNumber) || 'N/I' }}
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
              <i class="bi bi-person-vcard mx-1"></i> {{ formatIdNumber(client.userIdNumber) || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row centered my-2" v-if="management && !loading">
          <div class="col-5">
            <button
              @click="getAttentions()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#attentionsModal-${this.client.id}`">
              {{ $t('dashboard.attentions')}} <br> <i class="bi bi-qr-code"></i>
            </button>
          </div>
          <div class="col-3">
            <button
              @click="getBookings()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#bookingsModal-${this.client.id}`">
              {{ $t('dashboard.bookings')}} <br>
              <i v-if="client.pendingBookings > 0" class="bi bi-circle-fill green-icon"> </i> <i class="bi bi-calendar-fill mx-1"></i>
            </button>
          </div>
          <div class="col-4">
            <button
              @click="getPatientHistory()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#patientHistoryModal-${this.client.id}`">
              {{ $t('dashboard.patientHistory')}} <br>
              <i v-if="client.pendingControls > 0" class="bi bi-circle-fill yellow-icon"> </i><i class="bi bi-file-medical-fill mx-1"></i>
            </button>
          </div>
        </div>
        <hr>
        <div class="row centered my-2" v-if="management && !loading">
          <div class="col-4">
            <button
              @click="getClientData()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#editModal-${this.client.id}`">
              {{ $t('dashboard.edit')}} <i class="bi bi-pencil-fill"></i>
            </button>
          </div>
          <div class="col-4">
            <button
              @click="getClientContacts()"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              data-bs-toggle="modal"
              :data-bs-target="`#contactModal-${this.client.id}`">
              {{ $t('dashboard.contact')}} <i class="bi bi-chat-left-dots-fill"></i>
            </button>
          </div>
          <div class="col-4">
            <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill card-action"
              @click="goToCreateBooking()">
              {{ $t('dashboard.schedule')}} <i class="bi bi-calendar-check-fill mx-1"></i>
            </button>
          </div>
        </div>
        <hr>
        <div class="row m-1 centered">
          <div class="col">
            <div v-if="client.rating || client.nps">
              <div class="mb-2">
                <i class="bi bi-star-fill mx-1"> </i> <span class="mb-1">{{ $t("dashboard.surveyData") }}</span>
              </div>
              <span class="badge mx-1 detail-data-badge">
                CSAT <i class="bi bi-star-fill yellow-icon"></i>  {{ client.rating || 'N/I' }} </span>
              <span class="badge mx-1 detail-data-badge">
                NPS <i class="bi bi-emoji-smile-fill blue-icon"></i>  {{ client.nps || 'N/I' }}
              </span>
              <hr>
            </div>
            <div class="mt-2" v-if="client.queueName || client.collaboratorName || (client.commerceName && client.commerceTag)">
              <div class="mb-2">
                <i class="bi bi-qr-code mx-1"> </i> <span class="mb-1">{{ $t("dashboard.attentionData") }}</span>
              </div>
              <span v-if="client.queueName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.queueData') }} </span>
                {{ client.queueName }}</span>
              <span v-if="client.collaboratorName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.userData') }} </span>
                <i class="bi bi-person-fill"> </i> {{ client.collaboratorName }}</span>
              <span v-if="client.commerceName && client.commerceTag" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('dashboard.commerceData') }} </span>
                {{ client.commerceName }} - {{ client.commerceTag }}</span>
              <span v-if="client.packageId && client.packageName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.package') }} </span>
                  {{ client.packageName }}
                  <span class="badge mx-1 bg-secondary">{{ client.packageProcedureNumber }} / {{ client.packageProceduresTotalNumber }}</span>
                  <i class="bi bi-check-circle-fill green-icon" v-if="client.packagePaid"> </i>
              </span>
              <span v-if="client.servicesDetails" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('paymentData.service') }} </span>
                <span v-for="serv in client.servicesDetails" :key="serv.id" class="badge bg-primary mx-1"> {{ serv.name }}</span>
              </span>
              <span v-if="client.attentionCreatedDate" class="badge mx-1 detail-data-badge">
                <i class="bi bi-calendar-fill"> </i> {{ getDate(client.attentionCreatedDate) }}
              </span><br>
              <hr>
            </div>
            <div class="mt-2" v-if="client.userBirthday || client.userOrigin || client.userAddressCode || client.userCode1">
              <div class="mb-2">
                <i class="bi bi-person-fill mx-1"> </i> <span class="mb-1">{{ $t("dashboard.personalData") }}</span>
              </div>
              <span v-if="client.userBirthday" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.birthday') }} </span>
                <i class="bi bi-cake-fill"></i> {{ getDate(client.userBirthday) }}
              </span>
              <span v-if="client.healthAgreementName" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.healthAgreementText') }} </span>
                {{ client.healthAgreementName }}
              </span>
              <span v-if="client.userOrigin" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.origin') }} </span>
                {{ $t(`origin.${client.userOrigin}`) }}</span>
              <span v-if="client.userAddressCode" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.addressCode') }} </span>
                <i class="bi bi-geo-alt-fill red-icon"></i> {{ client.userAddressCode }}</span>
              <span v-if="client.userAddressText" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.addressText') }} </span>
                {{ client.userAddressText }}</span>
              <span v-if="client.userAddressComplement" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.addressComplement') }} </span>
                {{ client.userAddressComplement }}</span>
              <span v-if="client.userCode1" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.code1') }} </span>
                {{ client.userCode1 }}</span>
              <span v-if="client.userCode2" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.code2') }} </span>
                {{ client.userCode2 }}</span>
              <span v-if="client.userCode3" class="badge mx-1 detail-data-badge">
                <span class="fw-bold detail-data-badge-title"> {{ $t('commerceQueuesView.code3') }} </span>
                {{ client.userCode3 }}</span>
            </div>
            <div class="mt-2">
              <span class="metric-card-details mx-1"><strong>Id:</strong> {{ client.id }}</span>
              <span class="metric-card-details"><strong>Date:</strong> {{ getDate(client.attentionCreatedDate || client.clientCreatedDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Attentions -->
    <div class="modal fade" :id="`attentionsModal-${this.client.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-qr-code"></i> {{ $t("dashboard.attentionsOf") }} {{ client.userName || client.userIdNumber || client.userEmail }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="text-center mb-0">
            <ClientAttentionsManagement
              :showClientAttentionsManagement="true"
              :toggles="toggles"
              :attentionsIn="attentions"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              :services="services"
            >
            </ClientAttentionsManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Bookings -->
    <div class="modal fade" :id="`bookingsModal-${this.client.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-calendar-fill"></i> {{ $t("dashboard.bookingsOf") }} {{ client.userName || client.userIdNumber || client.userEmail }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="text-center mb-0">
            <ClientBookingsManagement
              :showClientBookingsManagement="true"
              :toggles="toggles"
              :bookingsIn="bookings"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              :services="services"
            >
            </ClientBookingsManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
     <!-- Modal Edit -->
     <div class="modal fade" :id="`editModal-${this.client.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-pencil-fill"></i> {{ $t("dashboard.dataOf") }} {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }} </h5>
            <button :id="`close-modal-client-edit-${this.client.id}`" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <ClientDataManagement
              :showClientDataManagement="visible"
              :toggles="togglesClient"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :closeModal="closeDataModal"
            >
            </ClientDataManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Contact -->
    <div class="modal fade" :id="`contactModal-${this.client.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-chat-left-dots-fill"></i> {{ $t("dashboard.contactsOf") }} {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <ClientContactsManagement
              :showClientAttentionsManagement="true"
              :toggles="toggles"
              :clientContactsIn="clientContacts"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              @getClientContacts="getClientContacts"
            >
            </ClientContactsManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Patient History -->
    <div class="modal fade" :id="`patientHistoryModal-${this.client.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-medical-fill"></i> {{ $t("dashboard.patientHistoryOf") }} {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }} </h5>
            <button :id="`close-modal-patient-history-${this.client.id}`" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="patient-history-component">
            <PatientHistoryManagement
              :showPatientHistoryManagement="true"
              :client="client"
              :commerce="commerce"
              :patientHistoryIn="patientHistory"
              :patientHistoryItems="patientHistoryItems"
              :patientForms="patientForms"
              @getPatientHistory="getPatientHistory"
              @closeModal="closeModal"
            >
            </PatientHistoryManagement>
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