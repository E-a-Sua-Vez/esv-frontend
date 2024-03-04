<script>
import Spinner from '../common/Spinner.vue';
import { DoughnutChart, BarChart } from 'vue-chart-3';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import { getAttentionsDetails } from '../../application/services/query-stack';
import AttentionDetailsCard from './common/AttentionDetailsCard.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';

export default {
  name: 'DashboardAttentionsManagement',
  components: { DoughnutChart, BarChart, Message, SimpleDownloadCard, Spinner, AttentionDetailsCard },
  props: {
    showAttentionManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Object, default: undefined }
  },
  data() {
    return {
      loading: false,
      counter: 0,
      attentions: undefined,
      totalPages: 0,
      daysSinceType: undefined,
      daysSinceContacted: undefined,
      contacted: undefined,
      contactable: undefined,
      survey: undefined,
      showKeyWordsOptions: false,
      showFilterOptions: false,
      searchText: undefined,
      queueId: undefined,
      page: 1,
      limit: 15
    }
  },
  async beforeMount() {
    try {
      this.loading = true;
      await this.refresh();
      this.loading = false;
    } catch (error) {
      this.loading = false;
    }
  },
  methods: {
    async refresh() {
      try {
        this.loading = true;
        this.attentions = await getAttentionsDetails(this.commerce.id, this.startDate, this.endDate,
          this.page, this.limit, this.daysSinceType, this.daysSinceContacted, this.contactable, this.contacted,
          this.keyWord, this.searchText, this.queueId, this.survey);
        if (this.attentions && this.attentions.length > 0) {
          const { counter } = this.attentions[0];
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
    },
    clear() {
      this.daysSinceType = undefined;
      this.daysSinceContacted = undefined;
      this.survey = undefined
      this.contactable = undefined;
      this.contacted = undefined;
      this.searchText = undefined;
      this.queueId = undefined;
    },
    async checkContactable(event) {
      if (event.target.checked) {
        this.contactable = true;
      } else {
        this.contactable = false;
      }
    },
    async checkContacted(event) {
      if (event.target.checked) {
        this.contacted = true;
      } else {
        this.contacted = false;
      }
    },
    async checkSurvey(event) {
      if (event.target.checked) {
        this.survey = true;
      } else {
        this.survey = false;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        const result = await getAttentionsDetails(this.commerce.id, this.startDate, this.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `attentions-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
        a.href = blobURL;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    }
  },
  computed: {
    changeData() {
      const { page, daysSinceType, daysSinceContacted, contactable, contacted, survey, searchText, queueId } = this;
      return {
        page, daysSinceType, daysSinceContacted, contactable, contacted, survey, searchText, queueId
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
          (oldData.daysSinceType !== newData.daysSinceType ||
          oldData.daysSinceContacted !== newData.daysSinceContacted ||
          oldData.contactable !== newData.contactable ||
          oldData.contacted !== newData.contacted ||
          oldData.survey !== newData.survey ||
          oldData.queueId !== newData.queueId)
        ) {
          this.page = 1;
        }
        this.refresh();
      }
    },
    searchText: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.searchText) {
          this.searchText = this.searchText.toUpperCase();
          if (this.searchText.length > 5) {
            this.page = 1;
            this.refresh();
          }
        }
      }
    }
  }
}
</script>

<template>
  <div id="attentions-management" class="row" v-if="showAttentionManagement === true && toggles['dashboard.attentions-management.view']">
    <div class="col">
      <div id="attention-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div>
            <SimpleDownloadCard
              :download="toggles['dashboard.reports.attentions-management']"
              :title="$t('dashboard.reports.attentions-management.title')"
              :showTooltip="true"
              :description="$t('dashboard.reports.attentions-management.description')"
              :icon="'bi-file-earmark-spreadsheet'"
              @download="exportToCSV"
              :canDownload="toggles['dashboard.reports.attentions-management'] === true"
            ></SimpleDownloadCard>
            <div class="my-2 row metric-card">
              <div class="col-12">
                <span class="metric-card-subtitle">
                  <span class="form-check-label metric-keyword-subtitle" @click="showFilters()"> <i class="bi bi-funnel-fill"></i> {{ $t("dashboard.aditionalFilters") }}  <i :class="`bi ${showFilterOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                </span>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                  @click="clear()">
                  <span><i class="bi bi-eraser-fill"></i></span>
                </button>
              </div>
              <div v-if="showFilterOptions">
                <div class="col-12 col-md my-1 filter-card" v-if="queues && queues.length > 1">
                  <label class="metric-card-subtitle mx-2" for="select-queue"> {{ $t("dashboard.queue") }} </label>
                  <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="queueId">
                    <option v-for="queue in queues" :key="queue.name" :value="queue.id" id="select-queue">{{ queue.name }}</option>
                  </select>
                </div>
                <div class="col-12 m-1">
                  <div class="col-12 col-md">
                    <input
                      min="1"
                      max="50"
                      type="text"
                      class="form-control"
                      v-model="searchText"
                      :placeholder="$t('dashboard.search')">
                  </div>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceType" value="EARLY" name="daysSince-type" id="early-since" autocomplete="off">
                  <label class="btn" for="early-since"> <i :class="`bi bi-qr-code green-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceType" value="MEDIUM" name="daysSince-type" id="medium-since" autocomplete="off">
                  <label class="btn" for="medium-since"> <i :class="`bi bi-qr-code yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceType" value="LATE" name="daysSince-type" id="late-since" autocomplete="off">
                  <label class="btn" for="late-since"> <i :class="`bi bi-qr-code red-icon`"></i> </label>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="EARLY" name="daysContacted-type" id="early-contacted" autocomplete="off">
                  <label class="btn" for="early-contacted"> <i :class="`bi bi-chat-left-dots-fill green-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="MEDIUM" name="daysContacted-type" id="medium-contacted" autocomplete="off">
                  <label class="btn" for="medium-contacted"> <i :class="`bi bi-chat-left-dots-fill yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="daysSinceContacted" value="LATE" name="daysContacted-type" id="late-contacted" autocomplete="off">
                  <label class="btn" for="late-contacted"> <i :class="`bi bi-chat-left-dots-fill red-icon`"></i> </label>
                </div>
                <div class="row">
                  <div class="col-12 col-md-6">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="contactable === false ? 'bg-danger' : ''" type="checkbox" name="contactable" id="contactable" v-model="contactable" @click="checkContactable($event)">
                      <label class="form-check-label metric-card-subtitle" for="contactable">{{ $t("dashboard.contactable") }}</label>
                    </div>
                  </div>
                  <div class="col-12 col-md-6">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="contacted === false ? 'bg-danger' : ''" type="checkbox" name="contacted" id="contacted"  v-model="contacted" @click="checkContacted($event)">
                      <label class="form-check-label metric-card-subtitle" for="contacted">{{ $t("dashboard.contacted") }}</label>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-12 col-md-12">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="survey === false ? 'bg-danger' : ''" type="checkbox" name="survey" id="survey" v-model="survey" @click="checkSurvey($event)">
                      <label class="form-check-label metric-card-subtitle" for="survey">{{ $t("dashboard.survey") }}</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="my-3">
              <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ this.counter }} </span>
              <span class="badge bg-secondary px-3 py-2 m-1"> {{ $t("page") }} {{ this.page }} {{ $t("of") }} {{ this.totalPages }} </span>
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
                      <select class="btn btn-md btn-light fw-bold text-dark select" v-model="page" :disabled="totalPages === 0">
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
            <div v-if="attentions && attentions.length > 0">
              <div class="row" v-for="(attention, index) in attentions" :key="`attention-${index}`">
                <AttentionDetailsCard
                  :show="true"
                  :attention="attention"
                >
                </AttentionDetailsCard>
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
                      <select class="btn btn-md btn-light fw-bold text-dark select" v-model="page" :disabled="totalPages === 0">
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
  <div v-if="showAttentionManagement === true && !toggles['dashboard.attentions-management.view']">
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
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
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
  border: 1px solid var(--gris-default);
}
</style>