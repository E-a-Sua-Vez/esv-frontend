<script>
import Spinner from '../../common/Spinner.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import { getDocumentsDetails } from '../../../application/services/query-stack';
import { addDocument } from '../../../application/services/document';
import SimpleDocumentCard from '../common/SimpleDocumentCard.vue';
import { DateModel } from '../../../shared/utils/date.model';
import { getDocumentCommerceTypes, getDocumentTypes } from '../../../shared/utils/data';
import Warning from '../../common/Warning.vue';
import Alert from '../../common/Alert.vue';

export default {
  name: 'DocumentsManagement',
  components: { Message, Spinner, Popper, SimpleDocumentCard, Warning, Alert },
  props: {
    showClientManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
  },
  data() {
    return {
      loading: false,
      alertError: '',
      counter: 0,
      totalPages: 0,
      asc: true,
      showFilterOptions: false,
      searchText: undefined,
      type: undefined,
      showAdd: false,
      options: {},
      optionSelected: undefined,
      newDocument: {},
      documentError: false,
      errorsAdd: [],
      documents: [],
      types: [],
      file: undefined,
      page: 1,
      limits: [10, 20, 50, 100],
      limit: 10,
      startDate: undefined,
      endDate: undefined,
    };
  },
  beforeMount() {
    this.types = getDocumentTypes();
    this.commerceTypes = getDocumentCommerceTypes();
  },
  methods: {
    async refresh(page) {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }
        this.page = page ? page : this.page;
        this.documents = await getDocumentsDetails(
          this.startDate,
          this.endDate,
          commerceIds,
          this.page,
          this.limit,
          this.searchText,
          this.asc,
          this.type
        );
        if (this.documents && this.documents.length > 0) {
          const { counter } = this.documents[0];
          this.counter = counter;
          const total = counter / this.limit;
          const totalB = Math.trunc(total);
          this.totalPages = totalB <= 0 ? 1 : counter % this.limit === 0 ? totalB : totalB + 1;
        } else {
          this.counter = 0;
          this.totalPages = 0;
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    setPage(pageIn) {
      this.page = pageIn;
      this.refresh();
    },
    async clear() {
      this.asc = true;
      this.searchText = undefined;
      this.type = undefined;
      this.startDate = undefined;
      this.endDate = undefined;
      this.page = 1;
      await this.refresh(1);
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    showAddModal() {
      this.showAdd = true;
      this.newDocument = {
        commerceId: this.commerce.id,
      };
    },
    validateAdd() {
      this.errorsAdd = [];
      if (this.optionSelected) {
        this.newDocument.type = 'COMMERCE';
        this.newDocument.name = `${this.commerce.id}`;
        this.newDocument.reportType = this.optionSelected;
        this.newDocument.commerceId = this.commerce.id;
        this.optionSelected = undefined;
      } else {
        this.errorsAdd.push('businessDocument.validate.feature');
      }
      if (!this.newDocument.file) {
        this.errorsAdd.push('businessDocument.validate.file');
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    validateDocument(file) {
      this.errorsAdd = [];
      const typesPermitted = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (file.size === 0 || file.size > 5000000) {
        this.errorsAdd.push('businessDocument.validate.fileSize');
      }
      if (!file.type || !typesPermitted.includes(file.type)) {
        this.errorsAdd.push('businessDocument.validate.fileType');
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async add() {
      try {
        this.loading = true;
        if (this.validateAdd()) {
          await addDocument(this.newDocument, this.file);
          setTimeout(async () => {
            this.refresh(1);
          }, 3000);
          this.showAdd = false;
          this.closeAddModal();
          this.newDocument = {};
        }
        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    closeAddModal() {
      const modalCloseButton = document.getElementById('close-modal-document');
      modalCloseButton.click();
    },
    async getFile($event) {
      try {
        this.loading = true;
        const target = $event.target;
        if (target && target.files && target.files.length > 0) {
          const fileUploaded = target.files[0];
          if (this.validateDocument(fileUploaded)) {
            this.file = fileUploaded;
            this.newDocument.file = this.file;
            this.newDocument.format = this.file.type;
          }
        }
        this.loading = false;
      } catch (error) {
        this.alertError = error.response.status || 500;
        this.loading = false;
      }
    },
    async showPopUpFile() {
      document.getElementById('document-fileUpload').click();
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh(1);
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh(1);
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh(1);
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh(1);
    },
  },
  computed: {
    changeData() {
      const { page, asc, type, limit } = this;
      return {
        page,
        asc,
        type,
        limit,
      };
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
          (oldData.asc !== newData.asc ||
            oldData.limit !== newData.limit ||
            oldData.type !== newData.type)
        ) {
          this.page = 1;
        }
        this.refresh();
      },
    },
  },
};
</script>

<template>
  <div
    id="documents-management"
    class="row"
    v-if="showClientManagement === true && toggles['document-commerce.admin.view']"
  >
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div>
            <div class="row my-2">
              <div class="col lefted">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAddModal()"
                  data-bs-toggle="modal"
                  :data-bs-target="`#add-document`"
                  :disabled="!toggles['document-commerce.admin.add']"
                >
                  <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                </button>
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
                        @click="refresh(1)"
                      >
                        <span><i class="bi bi-search"></i></span>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="m-1">
                  <div class="row">
                    <div class="col-10">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="searchText"
                        :placeholder="$t('dashboard.search')"
                      />
                    </div>
                    <div class="col-2">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                        @click="refresh(1)"
                      >
                        <span><i class="bi bi-search"></i></span>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="col-12 col-md my-1 filter-card" v-if="types && types.length > 1">
                  <label class="metric-card-subtitle mx-2" for="select-queue">
                    {{ $t('dashboard.type') }}
                  </label>
                  <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="type">
                    <option v-for="typ in types" :key="typ.name" :value="typ.id" id="select-queue">
                      {{ $t(`documents.types.${typ.name}`) }}
                    </option>
                  </select>
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
            <div class="my-3">
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
            <div v-if="documents && documents.length > 0">
              <div class="row" v-for="(document, index) in documents" :key="`documents-${index}`">
                <SimpleDocumentCard
                  :show="true"
                  :commerce="commerce"
                  :can-update="toggles[`document-commerce.admin.${document.name}`]"
                  :document="document"
                  :show-tooltip="true"
                >
                </SimpleDocumentCard>
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
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-document`"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t('add') }}</h5>
            <button
              id="close-modal-document"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div
              id="add-document"
              class="document-card mb-4"
              v-if="this.showAdd && this.toggles['document-commerce.admin.add']"
            >
              <div class="row g-1">
                <div id="document-feature-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessDocument.feature') }}
                  </div>
                  <div class="col-8">
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-2"
                      v-model="this.optionSelected"
                      id="features"
                    >
                      <option v-for="opt in this.commerceTypes" :key="opt.name" :value="opt.name">
                        {{ $t(`document.commerceTypes.${opt.name}`) }}
                      </option>
                    </select>
                  </div>
                </div>
                <div id="document-file-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessDocument.file') }}
                  </div>
                  <div class="col-8">
                    <input
                      id="document-fileUpload"
                      ref="file"
                      data-cy="document-fileUpload"
                      type="file"
                      hidden
                      @change="getFile($event)"
                    />
                    <button
                      id="document-upload-button"
                      :disabled="!this.toggles['document-commerce.admin.edit']"
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-1 px-4"
                      @click="showPopUpFile()"
                    >
                      {{ $t('businessDocument.upload') }} <i class="bi bi-cloud-upload-fill"></i>
                    </button>
                  </div>
                </div>
                <div class="row g-1" v-if="this.newDocument.file">
                  <div class="col-12 examples mt-2">
                    <span class="">
                      <span class="fw-bold"> File: </span>{{ this.newDocument.file.name }} ({{
                        (this.newDocument.file.size / 1000000).toFixed(2)
                      }}
                      MB)
                    </span>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(this.newDocument)"
                  >
                    {{ $t('businessDocument.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
                <div class="row g-1 errors" id="feedback" v-if="this.errorsAdd.length > 0">
                  <Warning>
                    <template v-slot:message>
                      <li v-for="(error, index) in this.errorsAdd" :key="index">
                        {{ $t(error) }}
                      </li>
                    </template>
                  </Warning>
                </div>
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showClientManagement === true && !toggles['document-commerce.admin.view']">
    <Message
      :icon="'bi-graph-up-arrow'"
      :title="$t('dashboard.message.1.title')"
      :content="$t('dashboard.message.1.content')"
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
  border: 1px solid var(--gris-clear);
}
.examples {
  font-size: 0.8rem;
  line-height: 1rem;
  color: 0.5px solid var(--gris-default);
}
</style>
