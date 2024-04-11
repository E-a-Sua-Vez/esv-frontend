<script>
import Spinner from '../../../components/common/Spinner.vue';
import Alert from '../../../components/common/Alert.vue';
import Warning from '../../../components/common/Warning.vue';
import Popper from "vue3-popper";
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import ClientContactDetailsCard from '../common/ClientContactDetailsCard.vue';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { globalStore } from '../../../stores';
import { getClientContactsDetailsByClientId } from '../../../application/services/query-stack';
import { contactClient } from '../../../application/services/client';
import { getContactResultTypes, getContactTypes } from '../../../shared/utils/data';

export default {
  name: 'ClientContactsManagement',
  components: { Message, SimpleDownloadCard, Spinner, Popper, ClientContactDetailsCard, Alert, Warning },
  props: {
    showClientAttentionsManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    client: { type: Object, default: {} },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    queues: { type: Array, default: undefined },
    clientContactsIn: { type: Array, default: [] }
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
      asc: true,
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
      limit: 10
    }
  },
  beforeMount() {
    this.contactTypes = getContactTypes();
    this.contactResultTypes = getContactResultTypes();
  },
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    async clear() {
      this.daysSinceContacted = undefined;
      this.contactResultType = undefined;
      this.asc = true;
      this.searchText = undefined;
      this.limit = 10;
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
          this.commerce.id, this.startDate, this.endDate, commerceIds, this.client.id,
          this.page, this.limit, this.daysSinceContacted,
          this.searchText, this.asc, this.contactResultType);
        this.updatePaginationData();
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions
    },
    showAdd() {
      this.showAddOption = !this.showAddOption
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
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add(newContact) {
      try {
        this.loading = true;
        if (this.validateAdd(newContact)) {
          if (this.userType === 'collaborator') {
            newContact.collaboratorId = this.user.id;
          }
          await contactClient(this.client.id, newContact)
          setTimeout(async () => {
            this.$emit('getClientContacts');
          }, 5000)
          this.showAddOption = false;
          this.newContact = {}
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
        const result = this.clientContacts = await getClientContactsDetailsByClientId(
          this.commerce.id, this.startDate, this.endDate, commerceIds, this.client.id,
          undefined, undefined, this.daysSinceContacted,
          this.searchText, undefined, this.contactResultType);
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
  },
  computed: {
    changeData() {
      const { page, daysSinceContacted, contactResultType, asc, queueId, limit } = this;
      return {
        page, daysSinceContacted, contactResultType, asc, queueId, limit
      }
    }
  },
  watch: {
    changeData: {
      immediate: true,
      deep: true,
      async handler(oldData, newData) {
        if (
          (oldData && newData) &&
          (oldData.client !== newData.client ||
          oldData.daysSinceContacted !== newData.daysSinceContacted ||
          oldData.contactResultType !== newData.contactResultType ||
          oldData.asc !== newData.asc ||
          oldData.limit !== newData.limit)
        ) {
          this.page = 1;
          this.refresh();
        }
      }
    },
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      }
    },
    clientContactsIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.clientContacts = this.clientContactsIn;
        this.updatePaginationData();
      }
    },
    newClientContacts: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.newClientContacts && this.newClientContacts.length > 0) {
          this.clientContacts = this.newClientContacts;
          this.updatePaginationData();
        }
      }
    }
  }
}
</script>

<template>
  <div id="clientContacts-management" class="row" v-if="showClientAttentionsManagement === true && toggles['dashboard.client-contacts-management.view']">
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div v-if="!loading">
          <div>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="">
                  <span class="form-check-label" @click="showAdd()">
                    <i class="bi bi-chat-left-dots-fill"></i> {{ $t("dashboard.addContact") }}
                    <i :class="`bi ${showAddOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
              </div>
              <div v-if="showAddOption">
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("dashboard.commerce") }}
                  </div>
                  <div class="col-8">
                    <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="newContact.commerceId">
                      <option v-for="com in commerces" :key="com.id" :value="com.id" id="select-commerce">{{ com.tag }}</option>
                    </select>
                  </div>
                </div>
                <div class="row mt-1">
                  <div class="col-4 text-label">
                    {{ $t("dashboard.type") }}
                  </div>
                  <div class="col-8">
                    <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="newContact.type">
                      <option v-for="typ in contactTypes" :key="typ.name" :value="typ.id" id="select-type">{{ $t(`contactTypes.${typ.name}`) }}</option>
                    </select>
                  </div>
                </div>
                <div class="row m-1">
                  <div class="col-4 text-label">
                    {{ $t("dashboard.result") }}
                  </div>
                  <div class="col-8">
                    <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="newContact.result">
                      <option v-for="typ in contactResultTypes" :key="typ.name" :value="typ.id" id="select-result">{{ $t(`contactResultTypes.${typ.name}`) }}</option>
                    </select>
                  </div>
                </div>
                <div class="row mt-1">
                  <textarea
                    class="form-control mt-2"
                    id="commennt"
                    rows="3"
                    v-model="newContact.comment"
                    :placeholder="$t('dashboard.comment')">
                  </textarea>
                </div>
                <div class="row m-1">
                  <div class="col-8 text-label">
                    <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(newContact)"
                      >
                      {{ $t("dashboard.add") }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                  <div class="col-4 text-label">
                    <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="goToCreateBooking(client)">
                      <i class="bi bi-calendar-check-fill"></i>
                  </button>
                  </div>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="(errorsAdd.length > 0)">
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
            <SimpleDownloadCard
              :download="toggles['dashboard.reports.client-contacts-management']"
              :title="$t('dashboard.reports.client-contacts-management.title')"
              :showTooltip="true"
              :description="$t('dashboard.reports.client-contacts-management.description')"
              :icon="'bi-file-earmark-spreadsheet'"
              @download="exportToCSV"
              :canDownload="toggles['dashboard.reports.client-contacts-management'] === true"
            ></SimpleDownloadCard>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="metric-card-subtitle">
                  <span class="form-check-label metric-keyword-subtitle mx-1" @click="showFilters()"> <i class="bi bi-search"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                  @click="clear()">
                  <span><i class="bi bi-eraser-fill"></i></span>
                </button>
              </div>
              <div v-if="showFilterOptions">
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="EARLY" name="daysContacted-type" id="early-contacted" autocomplete="off">
                  <label class="btn" for="early-contacted"> <i :class="`bi bi-chat-left-dots-fill green-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="MEDIUM" name="daysContacted-type" id="medium-contacted" autocomplete="off">
                  <label class="btn" for="medium-contacted"> <i :class="`bi bi-chat-left-dots-fill yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="LATE" name="daysContacted-type" id="late-contacted" autocomplete="off">
                  <label class="btn" for="late-contacted"> <i :class="`bi bi-chat-left-dots-fill red-icon`"></i> </label>
                  <Popper
                    v-if="true"
                    :class="'dark'"
                    arrow
                    disableClickAway
                    :content="$t(`dashboard.tracing.filters.contact`)">
                    <i class='bi bi-info-circle-fill h7 m-2'></i>
                  </Popper>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="contactResultType" value="INTERESTED" name="contactResultType-type" id="interested-contacted" autocomplete="off">
                  <label class="btn" for="interested-contacted"> <i :class="`bi bi-patch-check-fill green-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="contactResultType" value="CONTACT_LATER" name="contactResultType-type" id="contact-later-contacted" autocomplete="off">
                  <label class="btn" for="contact-later-contacted"> <i :class="`bi bi-patch-check-fill yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="contactResultType" value="REJECTED" name="contactResultType-type" id="rejected-contacted" autocomplete="off">
                  <label class="btn" for="rejected-contacted"> <i :class="`bi bi-patch-check-fill red-icon`"></i> </label>
                  <Popper
                    v-if="true"
                    :class="'dark'"
                    arrow
                    disableClickAway
                    :content="$t(`dashboard.tracing.filters.contactResult`)">
                    <i class='bi bi-info-circle-fill h7 m-2'></i>
                  </Popper>
                </div>
                <div class="row">
                  <div class="col-12">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="asc === false ? 'bg-danger' : ''" type="checkbox" name="asc" id="asc" v-model="asc" @click="checkAsc($event)">
                      <label class="form-check-label metric-card-subtitle" for="asc">{{ asc ? $t("dashboard.asc") :  $t("dashboard.desc") }}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="my-3">
              <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ this.counter }} </span>
              <span class="badge bg-secondary px-3 py-2 m-1"> {{ $t("page") }} {{ this.page }} {{ $t("of") }} {{ this.totalPages }} </span>
              <select class="btn btn-sm btn-light fw-bold text-dark select mx-1" v-model="limit">
                <option v-for="lim in limits" :key="lim" :value="lim" id="select-queue">{{ lim }}</option>
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
                        :disabled="page === 1 || totalPages === 0">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Previous"
                        @click="setPage(page - 1)"
                        :disabled="page === 1 || totalPages === 0">
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    <li>
                      <select class="btn btn-md btn-light fw-bold text-dark select mx-1" v-model="page" :disabled="totalPages === 0">
                        <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">{{ pag }}</option>
                      </select>
                    </li>
                    <li class="page-item">
                      <button class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Next"
                        @click="setPage(page + 1)"
                        :disabled="page === totalPages || totalPages === 0">
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(totalPages)"
                        :disabled="page === totalPages || totalPages === 0">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                      </button>
                    </li>
                  </ul>
                </nav>
            </div>
            <div v-if="this.clientContacts && this.clientContacts.length > 0">
              <div class="row" v-for="(contact, index) in clientContacts" :key="`clientContacts-${index}`">
                <ClientContactDetailsCard
                  :show="true"
                  :client="contact"
                  :commerce="commerce"
                >
              </ClientContactDetailsCard>
              </div>
            </div>
            <div v-else>
              <Message
                :icon="'bi-graph-up-arrow'"
                :title="$t('dashboard.message.2.title')"
                :content="$t('dashboard.message.2.content')" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showClientAttentionsManagement === true && !toggles['dashboard.client-contacts-management.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')" />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: .2rem;
  padding-bottom: .2rem;
  margin: .2rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: .8rem;
  font-weight: 500;
  line-height: .9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: .6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: .6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: .8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
</style>