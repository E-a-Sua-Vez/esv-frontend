<script>
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ClientContactDetailsCard from '../common/ClientContactDetailsCard.vue';
import AttentionCreationModal from '../../attentions/domain/AttentionCreationModal.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getClientContactsDetailsByClientId } from '../../../application/services/query-stack';
import { contactClient, searchClientByIdNumber } from '../../../application/services/client';
import { getContactResultTypes, getContactTypes } from '../../../shared/utils/data.ts';
import { DateModel } from '../../../shared/utils/date.model';
import { getGroupedQueueByCommerceId } from '../../../application/services/queue';

export default {
  name: 'ClientContactsManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    ClientContactDetailsCard,
    Alert,
    Warning,
    AttentionCreationModal,
  },
  props: {
    showClientAttentionsManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    client: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    clientContactsIn: { type: Array, default: [] },
  },
  emits: ['getClientContacts'],
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      clientContacts: [],
      newClientContacts: [],
      contactTypes: [],
      contactResultTypes: [],
      newContact: {},
      counter: 0,
      totalPages: 0,
      daysSinceContacted: undefined,
      contactResultType: undefined,
      asc: false,
      checked: false,
      showFilterOptions: false,
      showAddOption: false,
      searchText: undefined,
      typeError: false,
      commentError: false,
      resultError: false,
      store,
      userType: undefined,
      user: undefined,
      errorsAdd: [],
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      startDate: undefined,
      endDate: undefined,
      showAttentionCreationModal: false,
      loadedQueues: null,
    };
  },
  beforeMount() {
    this.contactTypes = getContactTypes();
    this.contactResultTypes = getContactResultTypes();
  },
  methods: {
    async setPage(pageIn) {
      this.page = pageIn;
      await this.refresh();
    },
    async clear() {
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.asc = true;
      this.searchText = undefined;
      this.page = 1;
      this.limit = 10;
      this.startDate = undefined;
      this.endDate = undefined;
      await this.refresh();
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    async refresh() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        this.newClientContacts = await getClientContactsDetailsByClientId(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.client.id,
          this.page,
          this.limit,
          this.daysSinceContacted,
          this.searchText,
          this.asc,
          this.contactResultType
        );
        this.updatePaginationData();
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    showAdd() {
      this.showAddOption = !this.showAddOption;
      // ✅ Initialize commerceId with current commerce when showing add form
      if (this.showAddOption && !this.newContact.commerceId && this.commerce?.id) {
        this.newContact.commerceId = this.commerce.id;
      }
    },
    updatePaginationData() {
      if (this.clientContacts && this.clientContacts.length > 0) {
        const { counter } = this.clientContacts[0];
        this.counter = counter;
        const total = counter / this.limit;
        const totalB = Math.trunc(total);
        this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
      } else {
        this.counter = 0;
        this.totalPages = 0;
      }
    },
    validateAdd(newContact) {
      this.errorsAdd = [];
      if (!newContact.type || newContact.type.length === 0) {
        this.typeError = true;
        this.errorsAdd.push('dashboard.validate.type');
      } else {
        this.typeError = false;
      }
      if (!newContact.result || newContact.result.length === 0) {
        this.resultError = true;
        this.errorsAdd.push('dashboard.validate.result');
      } else {
        this.resultError = false;
      }
      if (!newContact.comment || newContact.comment.length <= 10) {
        this.commentError = true;
        this.errorsAdd.push('dashboard.validate.comment');
      } else {
        this.commentError = false;
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add(newContact) {
      // ✅ Ensure commerceId is set if not provided
      if (!newContact.commerceId && this.commerce?.id) {
        newContact.commerceId = this.commerce.id;
      }
      try {
        this.loading = true;
        if (this.validateAdd(newContact)) {
          if (this.userType === 'collaborator') {
            newContact.collaboratorId = this.user.id;
          }
          await contactClient(this.client.id, newContact);
          setTimeout(async () => {
            this.$emit('getClientContacts');
          }, 5000);
          this.showAddOption = false;
          this.newContact = {};
          this.extendedEntity = undefined;
        }
        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    goToCreateBooking() {
      // DEPRECATED: This method is kept for backwards compatibility but is no longer used
      // The modal is opened via openAttentionCreationModal
    },
    async openAttentionCreationModal() {
      if (!this.commerce) {
        console.warn('Cannot open attention creation modal: commerce is not available');
        return;
      }

      // ✅ CRITICAL: Search for client in Firebase using idNumber to get the correct Firebase ID
      // This ensures we have the correct client ID that matches between Firebase and query-stack
      if (this.client?.userIdNumber || this.client?.idNumber) {
        try {
          const idNumber = this.client.userIdNumber || this.client.idNumber;
          const firebaseClient = await searchClientByIdNumber(this.commerce.id, idNumber);
          if (firebaseClient && firebaseClient.id) {
            // Update client with the correct Firebase ID
            // Store the Firebase ID for use in attentionCreationClientData
            this.client._firebaseClientId = firebaseClient.id;
          } else {
            console.warn(
              '⚠️ Client not found in Firebase by idNumber, will let backend handle client lookup',
            );
            this.client._firebaseClientId = undefined;
          }
        } catch (error) {
          console.error('❌ Error searching client in Firebase:', error);
          // Continue anyway, backend will handle client lookup
          this.client._firebaseClientId = undefined;
        }
      }

      // If no queues available, try to load them BEFORE opening the modal
      if (!this.queuesArray || this.queuesArray.length === 0) {
        try {
          if (this.commerce?.id) {
            const groupedQueues = await getGroupedQueueByCommerceId(this.commerce.id);
            // Convert grouped queues object to flat array
            this.loadedQueues = Object.values(groupedQueues).flat();

            // Force Vue to update by waiting for next tick
            await this.$nextTick();

            // Verify queues are now available
            const finalQueuesArray = this.queuesArray;

            if (!finalQueuesArray || finalQueuesArray.length === 0) {
              console.error('Failed to load queues, modal may not work correctly');
            }
          }
        } catch (error) {
          console.error('Error loading queues:', error);
        }
      }


      this.showAttentionCreationModal = true;
    },
    closeAttentionCreationModal() {
      this.showAttentionCreationModal = false;
    },
    handleAttentionCreated(attention) {
      // Handle when attention is successfully created
      // Optionally emit event to parent to refresh data
      this.$emit('attention-created', attention);
    },
    handleAttentionCreationError(errors) {
      console.error('Error creating attention:', errors);
      // Handle errors as needed
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        if (this.client && (this.client.userIdNumber || this.client.userEmail)) {
          this.searchText = this.client.userIdNumber || this.client.userEmail;
        }
        const result = (this.clientContacts = await getClientContactsDetailsByClientId(
          this.commerce.id,
          this.startDate,
          this.endDate,
          commerceIds,
          this.client.id,
          undefined,
          undefined,
          this.daysSinceContacted,
          this.searchText,
          undefined,
          this.contactResultType
        ));
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `client-contacts-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh();
    },
  },
  computed: {
    changeData() {
      const { page, daysSinceContacted, contactResultType, asc, queueId, limit } = this;
      return {
        page,
        daysSinceContacted,
        contactResultType,
        asc,
        queueId,
        limit,
      };
    },
    availableCommerces() {
      // If commerces prop is provided and has items, use it
      if (this.commerces && Array.isArray(this.commerces) && this.commerces.length > 0) {
        return this.commerces;
      }
      // Otherwise, fall back to single commerce if available
      if (this.commerce && this.commerce.id) {
        return [this.commerce];
      }
      // Return empty array if nothing is available
      return [];
    },
    // Computed property to format client data for AttentionCreationModal
    attentionCreationClientData() {
      if (!this.client) return null;

      // ✅ CRITICAL: Use Firebase client ID if available (searched via searchClientByIdNumber)
      // This ensures we use the correct ID that matches between Firebase and query-stack
      // If _firebaseClientId is not available, don't send clientId and let backend search by idNumber/email
      const firebaseClientId = this.client._firebaseClientId;
      const clientData = {
        ...(firebaseClientId && { clientId: firebaseClientId }), // Only include clientId if we have the correct Firebase ID
        userIdNumber: this.client.userIdNumber || this.client.idNumber,
        name: this.client.userName || this.client.name,
        lastName: this.client.userLastName || this.client.lastName,
        email: this.client.userEmail || this.client.email,
        phone: this.client.userPhone || this.client.phone,
        ...(this.client.personalInfo || {}),
      };

      return clientData;
    },
    // Computed property to get queues array from queues prop
    queuesArray() {
      // Priority 1: If loadedQueues is available (dynamically loaded), use it first
      if (this.loadedQueues && Array.isArray(this.loadedQueues) && this.loadedQueues.length > 0) {
        return this.loadedQueues;
      }

      // Priority 2: Check queues prop (only if it has items)
      if (this.queues) {
        if (Array.isArray(this.queues) && this.queues.length > 0) {
          return this.queues;
        }
        // If queues is an object, convert to array
        if (typeof this.queues === 'object' && this.queues !== null) {
          const queues = Object.values(this.queues).flat();
          if (queues.length > 0) return queues;
        }
      }

      // Fallback: return loadedQueues even if empty (for reactivity)
      if (this.loadedQueues && Array.isArray(this.loadedQueues)) {
        return this.loadedQueues;
      }

      return [];
    },
    // Computed property to group queues for the modal
    groupedQueuesForModal() {
      const queues = this.queuesArray;
      if (!queues || queues.length === 0) return {};

      const grouped = {};
      queues.forEach(queue => {
        const type = queue.type || 'STANDARD';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(queue);
      });

      return grouped;
    },
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        if (
          oldData &&
          newData &&
          (oldData.client !== newData.client ||
            oldData.daysSinceContacted !== newData.daysSinceContacted ||
            oldData.contactResultType !== newData.contactResultType ||
            oldData.asc !== newData.asc ||
            oldData.limit !== newData.limit)
        ) {
          this.page = 1;
          this.refresh();
        }
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
    clientContactsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.clientContacts = this.clientContactsIn;
        this.updatePaginationData();
      },
    },
    newClientContacts: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newClientContacts) {
          this.clientContacts = this.newClientContacts;
          this.updatePaginationData();
        }
      },
    },
  },
};
</script>

<template>
  <div>
    <div
      id="clientContacts-management"
      class="row"
      v-if="
        showClientAttentionsManagement === true &&
        toggles['dashboard.client-contacts-management.view']
      "
    >
      <div class="col">
        <div id="attention-management-component">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
          <div v-if="!loading">
            <div>
              <div class="my-2 row metric-card">
                <div class="col-12">
                  <span class="metric-card-subtitle">
                    <span class="form-check-label" @click="showAdd()">
                      <i class="bi bi-chat-left-dots-fill"></i> {{ $t('dashboard.addContact') }}
                      <i
                        :class="`bi ${
                          showAddOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </span>
                  </span>
                </div>
                <div v-if="showAddOption" class="mt-3">
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-4 d-flex align-items-center">
                      <label class="text-label mb-0">
                        {{ $t('dashboard.commerce') }}
                      </label>
                    </div>
                    <div class="col-12 col-md-8">
                      <select
                        class="btn btn-sm btn-light fw-bold text-dark select w-100"
                        v-model="newContact.commerceId"
                      >
                        <option
                          v-for="com in availableCommerces"
                          :key="com.id"
                          :value="com.id"
                          id="select-commerce"
                        >
                          {{ com.tag || com.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-4 d-flex align-items-center">
                      <label class="text-label mb-0">
                        {{ $t('dashboard.type') }}
                      </label>
                    </div>
                    <div class="col-12 col-md-8">
                      <select
                        class="btn btn-sm btn-light fw-bold text-dark select w-100"
                        v-model="newContact.type"
                      >
                        <option
                          v-for="typ in contactTypes"
                          :key="typ.name"
                          :value="typ.id"
                          id="select-type"
                        >
                          {{ $t(`contactTypes.${typ.name}`) }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mb-2">
                    <div class="col-12 col-md-4 d-flex align-items-center">
                      <label class="text-label mb-0">
                        {{ $t('dashboard.result') }}
                      </label>
                    </div>
                    <div class="col-12 col-md-8">
                      <select
                        class="btn btn-sm btn-light fw-bold text-dark select w-100"
                        v-model="newContact.result"
                      >
                        <option
                          v-for="typ in contactResultTypes"
                          :key="typ.name"
                          :value="typ.id"
                          id="select-result"
                        >
                          {{ $t(`contactResultTypes.${typ.name}`) }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="row g-2 mb-2">
                    <div class="col-12">
                      <label class="text-label d-block mb-1">
                        {{ $t('dashboard.comment') || 'Comentario' }}
                      </label>
                      <textarea
                        class="form-control"
                        id="commennt"
                        rows="3"
                        v-model="newContact.comment"
                        :placeholder="$t('dashboard.comment')"
                      ></textarea>
                    </div>
                  </div>
                  <div class="row g-2 mt-3">
                    <div class="col-12 col-md-8">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100 px-4"
                        @click="add(newContact)"
                      >
                        {{ $t('dashboard.add') }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="col-12 col-md-4">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100 px-4"
                        @click="openAttentionCreationModal()"
                      >
                        <i class="bi bi-calendar-check-fill"></i>
                      </button>
                    </div>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="errorsAdd.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in errorsAdd" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                </div>
              </div>
              <div class="my-2 row metric-card">
                <div class="col-12">
                  <span class="metric-card-subtitle">
                    <span
                      class="form-check-label metric-keyword-subtitle mx-1"
                      @click="showFilters()"
                    >
                      <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
                      <i
                        :class="`bi ${
                          showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </span>
                  </span>
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                    @click="clear()"
                  >
                    <span><i class="bi bi-eraser-fill"></i></span>
                  </button>
                </div>
                <div v-if="showFilterOptions">
                  <div class="row my-1">
                    <div class="col-3">
                      <button
                        class="btn btn-dark rounded-pill px-2 metric-filters"
                        @click="getToday()"
                        :disabled="loading"
                      >
                        {{ $t('dashboard.today') }}
                      </button>
                    </div>
                    <div class="col-3">
                      <button
                        class="btn btn-dark rounded-pill px-2 metric-filters"
                        @click="getCurrentMonth()"
                        :disabled="loading"
                      >
                        {{ $t('dashboard.thisMonth') }}
                      </button>
                    </div>
                    <div class="col-3">
                      <button
                        class="btn btn-dark rounded-pill px-2 metric-filters"
                        @click="getLastMonth()"
                        :disabled="loading"
                      >
                        {{ $t('dashboard.lastMonth') }}
                      </button>
                    </div>
                    <div class="col-3">
                      <button
                        class="btn btn-dark rounded-pill px-2 metric-filters"
                        @click="getLastThreeMonths()"
                        :disabled="loading"
                      >
                        {{ $t('dashboard.lastThreeMonths') }}
                      </button>
                    </div>
                  </div>
                  <div class="m-1">
                    <div class="row">
                      <div class="col-5">
                        <input
                          id="startDate"
                          class="form-control metric-controls"
                          type="date"
                          v-model="startDate"
                        />
                      </div>
                      <div class="col-5">
                        <input
                          id="endDate"
                          class="form-control metric-controls"
                          type="date"
                          v-model="endDate"
                        />
                      </div>
                      <div class="col-2">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                          @click="refresh()"
                        >
                          <span><i class="bi bi-search"></i></span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="col-12 col-md my-1 filter-card">
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="daysSinceContacted"
                      value="EARLY"
                      name="daysContacted-type"
                      id="early-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="early-contacted">
                      <i :class="`bi bi-chat-left-dots-fill green-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="daysSinceContacted"
                      value="MEDIUM"
                      name="daysContacted-type"
                      id="medium-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="medium-contacted">
                      <i :class="`bi bi-chat-left-dots-fill yellow-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="daysSinceContacted"
                      value="LATE"
                      name="daysContacted-type"
                      id="late-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="late-contacted">
                      <i :class="`bi bi-chat-left-dots-fill red-icon`"></i>
                    </label>
                    <Popper
                      v-if="true"
                      :class="'dark'"
                      arrow
                      disable-click-away
                      :content="$t(`dashboard.tracing.filters.contact`)"
                    >
                      <i class="bi bi-info-circle-fill h7 m-2"></i>
                    </Popper>
                  </div>
                  <div class="col-12 col-md my-1 filter-card">
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="INTERESTED"
                      name="contactResultType-type"
                      id="interested-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="interested-contacted">
                      <i :class="`bi bi-patch-check-fill green-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="CONTACT_LATER"
                      name="contactResultType-type"
                      id="contact-later-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="contact-later-contacted">
                      <i :class="`bi bi-patch-check-fill yellow-icon`"></i>
                    </label>
                    <input
                      type="radio"
                      class="btn btn-check btn-sm"
                      v-model="contactResultType"
                      value="REJECTED"
                      name="contactResultType-type"
                      id="rejected-contacted"
                      autocomplete="off"
                    />
                    <label class="btn" for="rejected-contacted">
                      <i :class="`bi bi-patch-check-fill red-icon`"></i>
                    </label>
                    <Popper
                      v-if="true"
                      :class="'dark'"
                      arrow
                      disable-click-away
                      :content="$t(`dashboard.tracing.filters.contactResult`)"
                    >
                      <i class="bi bi-info-circle-fill h7 m-2"></i>
                    </Popper>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <div class="form-check form-switch centered">
                        <input
                          class="form-check-input m-1"
                          :class="asc === false ? 'bg-danger' : ''"
                          type="checkbox"
                          name="asc"
                          id="asc"
                          v-model="asc"
                          @click="checkAsc($event)"
                        />
                        <label class="form-check-label metric-card-subtitle" for="asc">{{
                          asc ? $t('dashboard.asc') : $t('dashboard.desc')
                        }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="my-3 text-center">
                <span class="badge bg-secondary px-3 py-2 m-1"
                  >{{ $t('businessAdmin.listResult') }} {{ this.counter }}
                </span>
                <span class="badge bg-secondary px-3 py-2 m-1">
                  {{ $t('page') }} {{ this.page }} {{ $t('of') }} {{ this.totalPages }}
                </span>
                <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="limit">
                  <option v-for="lim in limits" :key="lim" :value="lim" id="select-queue">
                    {{ lim }}
                  </option>
                </select>
              </div>
              <div class="centered mt-2">
                <nav>
                  <ul class="pagination">
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(1)"
                        :disabled="page === 1 || totalPages === 0"
                      >
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Previous"
                        @click="setPage(page - 1)"
                        :disabled="page === 1 || totalPages === 0"
                      >
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    <li>
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select mx-1"
                        v-model="page"
                        :disabled="totalPages === 0"
                      >
                        <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">
                          {{ pag }}
                        </option>
                      </select>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Next"
                        @click="setPage(page + 1)"
                        :disabled="page === totalPages || totalPages === 0"
                      >
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(totalPages)"
                        :disabled="page === totalPages || totalPages === 0"
                      >
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
              <div v-if="this.clientContacts && this.clientContacts.length > 0">
                <div
                  class="row"
                  v-for="(contact, index) in clientContacts"
                  :key="`clientContacts-${index}`"
                >
                  <ClientContactDetailsCard :show="true" :client="contact" :commerce="commerce">
                  </ClientContactDetailsCard>
                </div>
              </div>
              <div v-else>
                <Message
                  :icon="'bi-graph-up-arrow'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="
        showClientAttentionsManagement === true &&
        !toggles['dashboard.client-contacts-management.view']
      "
    >
      <Message
        :icon="'bi-graph-up-arrow'"
        :title="$t('dashboard.message.1.title')"
        :content="$t('dashboard.message.1.content')"
      />
    </div>
    <!-- Attention Creation Modal -->
    <AttentionCreationModal
      v-if="commerce && client"
      :show="showAttentionCreationModal && !!commerce && !!client"
      :commerce="commerce"
      :queues="queuesArray"
      :grouped-queues="groupedQueuesForModal"
      :collaborators="[]"
      :preselected-client="client"
      :client-data="attentionCreationClientData"
      :toggles="toggles || {}"
      creation-type="booking"
      @close="closeAttentionCreationModal"
      @attention-created="handleAttentionCreated"
      @error="handleAttentionCreationError"
    />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: 0.6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  font-size: 0.9rem;
  line-height: 0.9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>
