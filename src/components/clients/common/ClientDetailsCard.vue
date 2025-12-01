<script>
import { contactClient } from '../../../application/services/client';
import { globalStore } from '../../../stores';
import {
  getAttentionsDetails,
  getClientContactsDetailsByClientId,
  getPatientHistoryDetails,
  getBookingsDetails,
} from '../../../application/services/query-stack';
import { getPatientHistoryItemByCommerce } from '../../../application/services/patient-history-item';
import { getFormsByClient } from '../../../application/services/form';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import { getPermissions } from '../../../application/services/permissions';
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ClientAttentionsManagement from '../domain/ClientAttentionsManagement.vue';
import ClientContactsManagement from '../domain/ClientContactsManagement.vue';
import PatientHistoryManagement from '../../patient-history/domain/PatientHistoryManagement.vue';
import ClientBookingsManagement from '../domain/ClientBookingsManagement.vue';
import ClientDataManagement from '../domain/ClientDataManagement.vue';

export default {
  name: 'ClientDetailsCard',
  components: {
    Popper,
    Spinner,
    SimpleDownloadCard,
    ClientAttentionsManagement,
    ClientContactsManagement,
    PatientHistoryManagement,
    ClientBookingsManagement,
    ClientDataManagement,
  },
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
      page: 1,
      limit: 10,
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
        { id: 'REJECTED', name: 'REJECTED' },
      ],
    };
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
        this.attentions = await getAttentionsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.page,
          this.limit,
          this.daysSinceType,
          undefined,
          undefined,
          undefined,
          this.searchText,
          this.queueId,
          this.survey,
          false,
          undefined
        );
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
        this.bookings = await getBookingsDetails(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.page,
          this.limit,
          this.searchText,
          this.queueId,
          false
        );
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
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.client.id,
          this.page,
          this.limit,
          this.daysSinceContacted,
          this.searchText,
          false,
          this.contactResultType
        );
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
      const query = {};
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
    handleExportCSV() {
      if (this.$refs.attentionsManagementRef && this.$refs.attentionsManagementRef.exportToCSV) {
        this.$refs.attentionsManagementRef.exportToCSV();
      }
    },
    handleExportBookingsCSV() {
      if (this.$refs.bookingsManagementRef && this.$refs.bookingsManagementRef.exportToCSV) {
        this.$refs.bookingsManagementRef.exportToCSV();
      }
    },
    handleExportContactsCSV() {
      if (this.$refs.contactsManagementRef && this.$refs.contactsManagementRef.exportToCSV) {
        this.$refs.contactsManagementRef.exportToCSV();
      }
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
    clasifyDaysContacted(score) {
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
    clasifyContactResult(result) {
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
    getCardTypeClass() {
      const daysSince = this.client?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'client-card-success';
      if (daysSince <= 180) return 'client-card-warning';
      return 'client-card-error';
    },
    getStatusIconClass() {
      const daysSince = this.client?.daysSinceAttention || 0;
      if (daysSince <= 90) return 'icon-success';
      if (daysSince <= 180) return 'icon-warning';
      return 'icon-error';
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
      const modalCloseButton = document.getElementById(
        `close-modal-patient-history-${this.client.id}`
      );
      modalCloseButton.click();
    },
    closeDataModal() {
      const modalCloseButton = document.getElementById(`close-modal-client-edit-${this.client.id}`);
      modalCloseButton.click();
      this.showClientData = false;
    },
  },
  computed: {
    visible() {
      const { showClientData } = this;
      return showClientData;
    },
    clientFullName() {
      if (!this.client) return '';
      const name = this.client.userName?.trim() || '';
      const lastName = this.client.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim().toUpperCase() || 'N/I';
    },
  },
  watch: {
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
  },
};
</script>

<template>
  <div v-if="show">
    <!-- Ultra Compact Client Row - Clickable -->
    <div class="client-row-card" :class="getCardTypeClass()" @click="showDetails()">
      <div class="client-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow hover>
          <template #content>
            <div>{{ $t('dashboard.clientCard.tooltip.status') }}</div>
          </template>
          <div class="client-icon-mini" :class="getStatusIconClass()" @click.stop>
        <i class="bi bi-person-circle"></i>
      </div>
        </Popper>

        <!-- Client Info - Horizontal -->
        <div class="client-info-inline">
          <div class="client-name-inline">
            <span class="client-name-text">{{ clientFullName }}</span>
            <Popper :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.copy') }}</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyAttention()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
      </div>
          <div class="client-meta-inline">
            <span class="client-id-inline">{{ formatIdNumber(client.userIdNumber) || 'N/I' }}</span>
            <Popper :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.attentions') }}</div>
              </template>
              <span class="badge-mini attentions" @click.stop>
                <i class="bi bi-qr-code"></i>{{ client.attentionsCounter || 0 }}
        </span>
            </Popper>
            <Popper v-if="client.surveyId" :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.survey') }}</div>
              </template>
              <i class="bi bi-star-fill icon-mini-separated yellow-icon" @click.stop></i>
            </Popper>
            <Popper v-if="client.firstAttentionForm === true" :class="'dark'" arrow hover>
              <template #content>
                <div>{{ $t('dashboard.clientCard.tooltip.form') }}</div>
              </template>
              <i class="bi bi-clipboard2-pulse-fill icon-mini-separated blue-icon" @click.stop></i>
            </Popper>
      </div>
            </div>

        <!-- Status Indicators - Inline -->
        <div class="status-inline">
          <Popper :class="'dark'" arrow hover>
            <template #content>
              <div>{{ $t('dashboard.clientCard.tooltip.daysSinceAttention') }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <i :class="`bi ${clasifyDaysSinceComment(client.daysSinceAttention || 0)}`"></i>
              <span>{{ client.daysSinceAttention || 0 }}</span>
          </div>
          </Popper>
          <Popper :class="'dark'" arrow hover>
            <template #content>
              <div>{{ $t('dashboard.clientCard.tooltip.daysSinceContact') }}</div>
            </template>
            <div class="status-badge-inline" @click.stop>
              <Popper v-if="client.contacted === true || checked === true" :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.contactResult') || 'Resultado del contacto' }}</div>
                </template>
                <i :class="`bi ${clasifyContactResult(client.contactResult || undefined)}`" @click.stop></i>
              </Popper>
              <i :class="`bi ${clasifyDaysContacted(client.daysSinceContactedClient || 0)}`"></i>
              <span>{{ client.daysSinceContactedClient || 0 }}</span>
            </div>
          </Popper>
            </div>

        <!-- Collapse Icon -->
        <div class="collapse-icon-wrapper">
          <i
            class="bi collapse-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
            </div>
          </div>
            </div>

    <!-- Expandable Details Section -->
    <div class="details-expandable-section">
      <Spinner :show="loading"></Spinner>
      <Transition name="details-expand">
        <div v-if="extendedEntity" class="detailed-data">
          <!-- Action Buttons Section - First, No Title -->
          <div v-if="management && !loading" class="info-section">
            <div class="action-buttons-grid">
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewAttentions') }}</div>
                </template>
            <button
              @click.stop="getAttentions()"
                  class="action-btn"
              data-bs-toggle="modal"
              :data-bs-target="`#attentionsModal-${this.client.id}`"
            >
              <i class="bi bi-qr-code"></i>
                  <span>{{ $t('dashboard.attentions') }}</span>
            </button>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewBookings') }}</div>
                </template>
            <button
              @click.stop="getBookings()"
                  class="action-btn"
              data-bs-toggle="modal"
              :data-bs-target="`#bookingsModal-${this.client.id}`"
            >
                  <i class="bi bi-calendar-fill"></i>
                  <span>{{ $t('dashboard.bookings') }}</span>
                  <i v-if="client.pendingBookings > 0" class="bi bi-circle-fill notification-dot green"></i>
            </button>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewHistory') }}</div>
                </template>
            <button
              @click.stop="getPatientHistory()"
                  class="action-btn"
              data-bs-toggle="modal"
              :data-bs-target="`#patientHistoryModal-${this.client.id}`"
            >
                  <i class="bi bi-file-medical-fill"></i>
                  <span>{{ $t('dashboard.patientHistory') }}</span>
                  <i v-if="client.pendingControls > 0" class="bi bi-circle-fill notification-dot yellow"></i>
            </button>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.editClient') }}</div>
                </template>
            <button
              @click.stop="getClientData()"
                  class="action-btn"
              data-bs-toggle="modal"
              :data-bs-target="`#editModal-${this.client.id}`"
            >
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('dashboard.edit') }}</span>
            </button>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.viewContacts') }}</div>
                </template>
            <button
              @click.stop="getClientContacts()"
                  class="action-btn"
              data-bs-toggle="modal"
              :data-bs-target="`#contactModal-${this.client.id}`"
            >
                  <i class="bi bi-chat-left-dots-fill"></i>
                  <span>{{ $t('dashboard.contact') }}</span>
            </button>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.schedule') }}</div>
                </template>
                <button class="action-btn" @click.stop="goToCreateBooking()">
                  <i class="bi bi-calendar-check-fill"></i>
                  <span>{{ $t('dashboard.schedule') }}</span>
            </button>
              </Popper>
          </div>
        </div>

          <!-- Contact Information Section - Second, Standardized -->
          <div class="info-section compact-section">
            <div class="info-section-header-compact">
              <i class="bi bi-telephone-fill"></i>
              <span class="info-section-title-compact">{{ $t('dashboard.clientCard.contactInfo') || $t('dashboard.contactInfo') || 'Contacto' }}</span>
            </div>
            <div class="contact-data-grid">
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.whatsapp') }}</div>
                </template>
                <a
                  class="data-item-compact whatsapp"
                  :href="'https://wa.me/' + client.userPhone"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{ $t('dashboard.clientCard.label.whatsapp') || 'WhatsApp' }}</span>
                  <div class="data-value">
                    <i class="bi bi-whatsapp"></i>
                    <span>{{ client.userPhone || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.email') }}</div>
                </template>
                <a
                  class="data-item-compact email"
                  :href="'mailto:' + client.userEmail"
                  target="_blank"
                  @click.stop
                >
                  <span class="data-label">{{ $t('dashboard.clientCard.label.email') || 'Email' }}</span>
                  <div class="data-value">
                    <i class="bi bi-envelope"></i>
                    <span>{{ client.userEmail || 'N/I' }}</span>
                  </div>
                </a>
              </Popper>
              <Popper :class="'dark'" arrow hover>
                <template #content>
                  <div>{{ $t('dashboard.clientCard.tooltip.idNumber') }}</div>
                </template>
                <div class="data-item-compact" @click.stop>
                  <span class="data-label">{{ $t('dashboard.clientCard.label.id') || 'ID' }}</span>
                  <div class="data-value">
                    <i class="bi bi-person-vcard"></i>
                    <span>{{ formatIdNumber(client.userIdNumber) || 'N/I' }}</span>
                  </div>
                </div>
              </Popper>
            </div>
          </div>

          <!-- Survey Data Section -->
          <div v-if="client.rating || client.nps" class="info-section">
            <div class="info-section-header">
              <i class="bi bi-star-fill"></i>
              <span class="info-section-title">{{ $t('dashboard.surveyData') }}</span>
              </div>
            <div class="info-badges">
              <span class="info-badge">
                <i class="bi bi-star-fill yellow-icon"></i>
                <span class="badge-label">CSAT</span>
                <span class="badge-value">{{ client.rating || 'N/I' }}</span>
              </span>
              <span class="info-badge">
                <i class="bi bi-emoji-smile-fill blue-icon"></i>
                <span class="badge-label">NPS</span>
                <span class="badge-value">{{ client.nps || 'N/I' }}</span>
              </span>
            </div>
          </div>

          <!-- Attention Data Section -->
            <div
              v-if="
                client.queueName ||
                client.collaboratorName ||
              (client.commerceName && client.commerceTag) ||
              client.packageId ||
              client.servicesDetails ||
              client.attentionCreatedDate
            "
            class="info-section"
          >
            <div class="info-section-header">
              <i class="bi bi-qr-code"></i>
              <span class="info-section-title">{{ $t('dashboard.attentionData') }}</span>
              </div>
            <div class="info-badges">
              <span v-if="client.queueName" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.queueData') }}</span>
                <span class="badge-value">{{ client.queueName }}</span>
                </span>
              <span v-if="client.collaboratorName" class="info-badge">
                <i class="bi bi-person-fill"></i>
                <span class="badge-label">{{ $t('dashboard.userData') }}</span>
                <span class="badge-value">{{ client.collaboratorName }}</span>
                </span>
              <span v-if="client.commerceName && client.commerceTag" class="info-badge">
                <span class="badge-label">{{ $t('dashboard.commerceData') }}</span>
                <span class="badge-value">{{ client.commerceName }} - {{ client.commerceTag }}</span>
                </span>
              <span v-if="client.packageId && client.packageName" class="info-badge">
                <span class="badge-label">{{ $t('paymentData.package') }}</span>
                <span class="badge-value">{{ client.packageName }}</span>
                <span class="badge-subvalue"
                  >{{ client.packageProcedureNumber }} / {{ client.packageProceduresTotalNumber }}</span
                >
                <i v-if="client.packagePaid" class="bi bi-check-circle-fill green-icon"></i>
                </span>
              <span v-if="client.servicesDetails" class="info-badge services-badge">
                <span class="badge-label">{{ $t('paymentData.service') }}</span>
                <span
                  v-for="serv in client.servicesDetails"
                  :key="serv.id"
                  class="service-tag"
                >
                  {{ serv.name }}
              </span>
              </span>
              <span v-if="client.attentionCreatedDate" class="info-badge">
                <i class="bi bi-calendar-fill"></i>
                <span class="badge-value">{{ getDate(client.attentionCreatedDate) }}</span>
              </span>
            </div>
          </div>

          <!-- Personal Data Section - Third, Standardized -->
          <div
            v-if="
              client.userBirthday ||
              client.userOrigin ||
              client.userAddressCode ||
              client.userCode1 ||
              client.healthAgreementName
            "
            class="info-section compact-section"
          >
            <div class="info-section-header-compact">
              <i class="bi bi-person-fill"></i>
              <span class="info-section-title-compact">{{ $t('dashboard.personalData') }}</span>
            </div>
            <div class="personal-data-grid-compact">
              <div v-if="client.userBirthday" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.birthday') || $t('commerceQueuesView.birthday') || 'Cumpleaños' }}</span>
                <div class="data-value">
                  <i class="bi bi-cake-fill"></i>
                  <span>{{ getDate(client.userBirthday) }}</span>
                </div>
              </div>
              <div v-if="client.healthAgreementName" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.healthAgreement') || $t('commerceQueuesView.healthAgreementText') || 'Convenio' }}</span>
                <div class="data-value">
                  <i class="bi bi-heart-pulse-fill"></i>
                  <span>{{ client.healthAgreementName }}</span>
                </div>
              </div>
              <div v-if="client.userOrigin" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.origin') || $t('commerceQueuesView.origin') || 'Origen' }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ $t(`origin.${client.userOrigin}`) }}</span>
                </div>
              </div>
              <div v-if="client.userAddressText" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.address') || 'Endereço' }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill red-icon"></i>
                  <span>{{ client.userAddressText }}</span>
                </div>
              </div>
              <div v-if="client.userAddressCode" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.addressCode') || $t('commerceQueuesView.addressCode') || 'Código' }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ client.userAddressCode }}</span>
                </div>
              </div>
              <div v-if="client.userAddressComplement" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.addressComplement') || $t('commerceQueuesView.addressComplement') || 'Complemento' }}</span>
                <div class="data-value">
                  <i class="bi bi-geo-alt-fill"></i>
                  <span>{{ client.userAddressComplement }}</span>
                </div>
              </div>
              <div v-if="client.userCode1" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.code1') || $t('commerceQueuesView.code1') || 'Código 1' }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode1 }}</span>
                </div>
              </div>
              <div v-if="client.userCode2" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.code2') || $t('commerceQueuesView.code2') || 'Código 2' }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode2 }}</span>
                </div>
              </div>
              <div v-if="client.userCode3" class="data-item-compact">
                <span class="data-label">{{ $t('dashboard.clientCard.label.code3') || $t('commerceQueuesView.code3') || 'Código 3' }}</span>
                <div class="data-value">
                  <i class="bi bi-tag-fill"></i>
                  <span>{{ client.userCode3 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata Section - Compact, Same Line -->
          <div class="info-section metadata-section">
            <div class="metadata-item-compact">
              <span class="metadata-label">ID:</span>
              <span class="metadata-value">{{ client.id }}</span>
              <span class="metadata-separator">•</span>
              <span class="metadata-label">{{ $t('dashboard.clientCard.date') || $t('dashboard.date') || 'Fecha' }}:</span>
              <span class="metadata-value">{{
                getDate(client.attentionCreatedDate || client.clientCreatedDate)
              }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Modal Attentions - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      :id="`attentionsModal-${this.client.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-10"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-qr-code"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('dashboard.attentionsOf') }}
                </h5>
                <p class="modern-modal-client-name">
                  {{ client.userName || client.userIdNumber || client.userEmail }}
                </p>
              </div>
            </div>
            <button
              class="btn-close modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body modern-modal-body-content">
            <ClientAttentionsManagement
              ref="attentionsManagementRef"
              :show-client-attentions-management="true"
              :toggles="toggles"
              :attentions-in="attentions"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              :services="services"
            >
            </ClientAttentionsManagement>
          </div>
          <div class="modal-footer border-0 modern-modal-footer">
            <div class="d-flex align-items-center justify-content-between w-100 gap-3">
              <div class="flex-grow-1">
                <SimpleDownloadCard
                  :download="toggles['dashboard.reports.attentions-management']"
                  :title="$t('dashboard.reports.attentions-management.title')"
                  :show-tooltip="true"
                  :description="$t('dashboard.reports.attentions-management.description')"
                  :icon="'bi-file-earmark-spreadsheet'"
                  @download="handleExportCSV"
                  :can-download="toggles['dashboard.reports.attentions-management'] === true"
                ></SimpleDownloadCard>
              </div>
              <button
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-check-lg"></i> {{ $t('notificationConditions.action') || $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
    <!-- Modal Bookings - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      :id="`bookingsModal-${this.client.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-10"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-calendar-fill"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('dashboard.bookingsOf') }}
                </h5>
                <p class="modern-modal-client-name">
                  {{ client.userName || client.userIdNumber || client.userEmail }}
                </p>
              </div>
            </div>
            <button
              class="btn-close modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body modern-modal-body-content">
            <ClientBookingsManagement
              ref="bookingsManagementRef"
              :show-client-bookings-management="true"
              :toggles="toggles"
              :bookings-in="bookings"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              :services="services"
            >
            </ClientBookingsManagement>
          </div>
          <div class="modal-footer border-0 modern-modal-footer">
            <div class="d-flex align-items-center justify-content-between w-100 gap-3">
              <div class="flex-grow-1">
                <SimpleDownloadCard
                  :download="toggles['dashboard.reports.bookings-management']"
                  :title="$t('dashboard.reports.bookings-management.title')"
                  :show-tooltip="true"
                  :description="$t('dashboard.reports.bookings-management.description')"
                  :icon="'bi-file-earmark-spreadsheet'"
                  @download="handleExportBookingsCSV"
                  :can-download="toggles['dashboard.reports.bookings-management'] === true"
                ></SimpleDownloadCard>
              </div>
              <button
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-check-lg"></i> {{ $t('notificationConditions.action') || $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
    <!-- Modal Edit - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      :id="`editModal-${this.client.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-pencil-fill"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('dashboard.dataOf') }}
                </h5>
                <p class="modern-modal-client-name">
                  {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                </p>
              </div>
            </div>
            <button
              :id="`close-modal-client-edit-${this.client.id}`"
              class="btn-close modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body modern-modal-body-content">
            <ClientDataManagement
              :show-client-data-management="visible"
              :toggles="togglesClient"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :close-modal="closeDataModal"
            >
            </ClientDataManagement>
          </div>
          <div class="modal-footer border-0 modern-modal-footer">
            <button
              class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-check-lg"></i> {{ $t('close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
    <!-- Modal Contact - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      :id="`contactModal-${this.client.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-chat-left-dots-fill"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('dashboard.contactsOf') }}
                </h5>
                <p class="modern-modal-client-name">
                  {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                </p>
              </div>
            </div>
            <button
              class="btn-close modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body modern-modal-body-content">
            <ClientContactsManagement
              ref="contactsManagementRef"
              :show-client-attentions-management="true"
              :toggles="toggles"
              :client-contacts-in="clientContacts"
              :client="client"
              :commerce="commerce"
              :commerces="commerces"
              :queues="queues"
              @getClientContacts="getClientContacts"
            >
            </ClientContactsManagement>
          </div>
          <div class="modal-footer border-0 modern-modal-footer">
            <div class="d-flex align-items-center justify-content-between w-100 gap-3">
              <div class="flex-grow-1">
                <SimpleDownloadCard
                  :download="toggles['dashboard.reports.contacts-management']"
                  :title="$t('dashboard.reports.contacts-management.title')"
                  :show-tooltip="true"
                  :description="$t('dashboard.reports.contacts-management.description')"
                  :icon="'bi-file-earmark-spreadsheet'"
                  @download="handleExportContactsCSV"
                  :can-download="toggles['dashboard.reports.contacts-management'] === true"
                ></SimpleDownloadCard>
              </div>
              <button
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-check-lg"></i> {{ $t('notificationConditions.action') || $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
    <!-- Modal Patient History - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      :id="`patientHistoryModal-${this.client.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-file-earmark-medical-fill"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">
                  {{ $t('dashboard.patientHistoryOf') }}
                </h5>
                <p class="modern-modal-client-name">
                  {{ this.client.userName || this.client.userIdNumber || this.client.userEmail }}
                </p>
              </div>
            </div>
            <button
              :id="`close-modal-patient-history-${this.client.id}`"
              class="btn-close modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body modern-modal-body-content">
            <PatientHistoryManagement
              :show-patient-history-management="true"
              :client="client"
              :commerce="commerce"
              :patient-history-in="patientHistory"
              :patient-history-items="patientHistoryItems"
              :patient-forms="patientForms"
              @getPatientHistory="getPatientHistory"
              @closeModal="closeModal"
            >
            </PatientHistoryManagement>
          </div>
          <div class="modal-footer border-0 modern-modal-footer">
            <button
              class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-check-lg"></i> {{ $t('notificationConditions.action') || $t('close') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Ultra Compact Client Row */
.client-row-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.625rem;
  margin: 0.25rem 0.375rem;
  margin-bottom: 0;
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-bottom: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: visible;
  cursor: pointer;
  z-index: 1;
}

.client-row-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}


/* Card Type Variations - Ultra Compact */
.client-row-card.client-card-success {
  border-left: 2px solid #00c2cb;
}

.client-row-card.client-card-success:hover {
  background: rgba(0, 194, 203, 0.03);
}

.client-row-card.client-card-warning {
  border-left: 2px solid #f9c322;
}

.client-row-card.client-card-warning:hover {
  background: rgba(249, 195, 34, 0.03);
}

.client-row-card.client-card-error {
  border-left: 2px solid #a52a2a;
}

.client-row-card.client-card-error:hover {
  background: rgba(165, 42, 42, 0.03);
}

/* Client Row Content - Ultra Compact Horizontal Layout */
.client-row-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.client-icon-mini {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.client-icon-mini i {
  font-size: 0.9375rem;
}

.client-row-card:hover .client-icon-mini {
  transform: scale(1.05);
}

.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
}

.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.client-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.client-name-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.1875rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.75rem;
}

.client-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
}

.client-id-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.badge-mini {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.1875rem;
  cursor: help;
  line-height: 1.2;
}

.badge-mini i {
  font-size: 0.625rem;
}

.icon-mini {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
}

.icon-mini-separated {
  font-size: 0.6875rem;
  cursor: help;
  line-height: 1;
  margin-left: 0.25rem;
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.collapse-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease;
  cursor: pointer;
}

.client-row-card:hover .collapse-icon {
  color: rgba(0, 0, 0, 0.7);
}

.client-row-card[class*='extended'] .collapse-icon,
.client-row-card:hover .collapse-icon {
  transform: scale(1.1);
}

/* Status Inline - Ultra Compact */
.status-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-badge-inline {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.1875rem 0.4375rem;
  background: rgba(169, 169, 169, 0.08);
  border-radius: 9999px;
  cursor: help;
  transition: all 0.2s ease;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.status-badge-inline:hover {
  background: rgba(169, 169, 169, 0.15);
  border-color: rgba(169, 169, 169, 0.2);
}

.status-badge-inline i {
  font-size: 0.75rem;
}

.status-badge-inline span {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

/* Responsive adjustments for ultra compact */
@media (max-width: 768px) {
  .client-row-content {
    gap: 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: rgba(245, 246, 247, 0.4);
  border: 1px solid rgba(169, 169, 169, 0.1);
  border-top: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 1;
}

.detailed-data {
  padding: 0.625rem;
  max-height: 800px;
  overflow-y: auto;
  overflow-x: visible;
  background: rgba(250, 251, 252, 0.4);
  position: relative;
}

/* Info Sections - Ultra Compact */
.info-section {
  margin-bottom: 0.75rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-section-header {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.15);
}

.info-section-header i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.info-section-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Compact Section Styles */
.compact-section {
  margin-bottom: 0.75rem;
}

.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.12);
}

.info-section-header-compact i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.info-section-title-compact {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Standardized Data Items - Compact */
.contact-data-grid,
.personal-data-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.4375rem 0.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 5px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.data-item-compact:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(169, 169, 169, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

.data-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.1;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.2;
}

.data-value i {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

.data-item-compact.whatsapp:hover {
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.whatsapp:hover .data-value {
  color: #25d366;
}

.data-item-compact.whatsapp:hover .data-value i {
  color: #25d366;
}

.data-item-compact.email:hover {
  border-color: rgba(0, 74, 173, 0.3);
}

.data-item-compact.email:hover .data-value {
  color: #004aad;
}

.data-item-compact.email:hover .data-value i {
  color: #004aad;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.375rem 0.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.contact-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(169, 169, 169, 0.2);
}

.contact-item i {
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.6);
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: inherit;
  flex: 1;
}

.contact-link.whatsapp:hover {
  color: #25d366;
}

.contact-link.whatsapp:hover i {
  color: #25d366;
}

.contact-link.email:hover {
  color: #004aad;
}

.contact-link.email:hover i {
  color: #004aad;
}

/* Action Buttons - Uniform Style */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1875rem;
  padding: 0.25rem 0.375rem;
  min-height: 40px;
  width: 100%;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.05) 100%);
  color: #004aad;
  border: 1.5px solid rgba(0, 74, 173, 0.2);
}

.action-btn:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.1);
}

.action-btn i {
  font-size: 0.9375rem;
}

.action-btn span {
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.action-btn .notification-dot {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  font-size: 0.5rem;
}

.notification-dot {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.5rem;
}

.notification-dot.green {
  color: #00c2cb;
}

.notification-dot.yellow {
  color: #f9c322;
}

/* Info Badges */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.info-badge:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-badge i {
  font-size: 0.875rem;
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-value {
  font-weight: 600;
  color: #000000;
}

.badge-subvalue {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.25rem;
}

.services-badge {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.service-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.25rem;
  margin-top: 0.25rem;
}

/* Personal Data Section - Improved Readability */
.personal-data-section {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  padding: 0.875rem;
  border: 1px solid rgba(169, 169, 169, 0.1);
}

.personal-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.875rem;
}

.personal-data-item {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.1);
  transition: all 0.2s ease;
}

.personal-data-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.personal-data-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.personal-data-label i {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
}

.personal-data-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #000000;
  line-height: 1.4;
  word-break: break-word;
}

.address-item {
  grid-column: 1 / -1;
}

.address-value {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.address-code {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  background: rgba(169, 169, 169, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.address-complement {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

/* Metadata Section */
.metadata-section {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
  margin-top: 0.5rem;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0;
  font-size: 0.6875rem;
  flex-wrap: wrap;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  font-weight: 300;
  margin: 0 0.125rem;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  font-size: 0.75rem;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.metadata-value {
  color: rgba(0, 0, 0, 0.8);
}

/* Icon Colors */
.green-icon {
  color: var(--verde-tu);
}

.yellow-icon {
  color: var(--amarillo-star);
}

.red-icon {
  color: var(--rojo-warning);
}

.blue-icon {
  color: var(--azul-turno);
}

.gray-icon {
  color: #a9a9a9;
}

/* Transition */
.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.details-expand-enter-to,
.details-expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

/* Responsive - Ultra Compact */
@media (max-width: 768px) {
  .client-row-card {
    padding: 0.4375rem 0.5rem;
  }

  .client-icon-mini {
    width: 24px;
    height: 24px;
  }

  .client-icon-mini i {
    font-size: 0.8125rem;
  }

  .client-name-text {
    font-size: 0.75rem;
  }

  .status-inline {
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .action-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .client-row-card {
    padding: 0.375rem 0.4375rem;
    margin: 0.1875rem 0.25rem;
    margin-bottom: 0;
  }

  .client-name-text {
    font-size: 0.6875rem;
  }

  .action-buttons-grid {
    grid-template-columns: 1fr;
  }

  .info-badges {
    flex-direction: column;
  }

  .info-badge {
    width: 100%;
  }

  .client-row-content {
    gap: 0.4375rem;
  }
}

/* Tooltip z-index improvements - Ensure tooltips appear above all content */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.client-row-card {
  overflow: visible;
}

.details-expandable-section {
  overflow: visible;
}

/* Keep scroll for content but allow tooltips to show */
.detailed-data {
  overflow-y: auto;
  overflow-x: visible;
}

/* Ensure tooltip containers don't clip */
.info-section,
.action-buttons-grid,
.contact-data-grid,
.personal-data-grid-compact {
  position: relative;
  overflow: visible;
}

/* Modern Modal Styles - Compact, beautiful, matching dashboard design */
:deep(.modern-modal-wrapper) {
  margin: 0;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

:deep(.modern-modal-container) {
  border: none;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

/* Modern Header - Compact with icon and title */
:deep(.modern-modal-header) {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0.75rem 0.75rem 0 0;
  min-height: auto;
  position: relative;
}

:deep(.modern-modal-header-inner) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

:deep(.modern-modal-icon-wrapper) {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:deep(.modern-modal-icon-wrapper i) {
  font-size: 1.125rem;
  color: #ffffff;
}

:deep(.modern-modal-title-wrapper) {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

:deep(.modern-modal-title) {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

:deep(.modern-modal-client-name) {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.modern-modal-close-btn) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

:deep(.modern-modal-close-btn i) {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

:deep(.modern-modal-close-btn:hover) {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

:deep(.modern-modal-close-btn:focus) {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

/* Modern Body - Compact with proper spacing */
:deep(.modern-modal-body-content) {
  padding: 1rem;
  background: #ffffff;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Modern Footer - Clean and minimal */
:deep(.modern-modal-footer) {
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 0 0 0.75rem 0.75rem;
}

:deep(.modern-modal-footer .d-flex) {
  align-items: center;
}

:deep(.modern-modal-close-button) {
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

:deep(.modern-modal-close-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

:deep(.modern-modal-close-button:active) {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 768px) {
  :deep(.modern-modal-wrapper) {
    margin: 0;
    max-width: 100vw;
    height: 100vh;
  }

  :deep(.modern-modal-header) {
    padding: 0.625rem 0.875rem;
  }

  :deep(.modern-modal-icon-wrapper) {
    width: 2rem;
    height: 2rem;
  }

  :deep(.modern-modal-icon-wrapper i) {
    font-size: 1rem;
  }

  :deep(.modern-modal-title) {
    font-size: 0.9375rem;
  }

  :deep(.modern-modal-client-name) {
    font-size: 0.6875rem;
  }

  :deep(.modern-modal-body-content) {
    padding: 0.75rem;
    max-height: calc(100vh - 9rem);
  }

  :deep(.modern-modal-footer) {
    padding: 0.625rem 0.875rem;
  }
}

</style>
