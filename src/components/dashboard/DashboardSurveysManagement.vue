<script>
import SimpleCard from './common/SimpleCard.vue';
import DetailsCard from './common/DetailsCard.vue';
import Spinner from '../common/Spinner.vue';
import { DoughnutChart, BarChart } from 'vue-chart-3';
import Message from '../common/Message.vue';
import SimpleDownloadCard from '../reports/SimpleDownloadCard.vue';
import AttentionRatingDetails from './domain/AttentionRatingDetails.vue';
import AttentionNPSDetails from './domain/AttentionNPSDetails.vue';
import { getSurveysDetails } from '../../application/services/query-stack';
import SurveyDetailsCard from './common/SurveyDetailsCard.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';

export default {
  name: 'DashboardSurveysManagement',
  components: { SimpleCard, DetailsCard, DoughnutChart, BarChart, Message, SimpleDownloadCard, AttentionRatingDetails, AttentionNPSDetails, Spinner, SurveyDetailsCard },
  props: {
    showSurveyManagement: { type: Boolean, default: false },
    calculatedMetrics: { type: Object, default: undefined },
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
      surveys: undefined,
      totalPages: 0,
      ratingType: undefined,
      npsType: undefined,
      contacted: undefined,
      contactable: undefined,
      showKeyWordsOptions: false,
      showFilterOptions: false,
      keyWord: undefined,
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
        this.surveys = await getSurveysDetails(this.commerce.id, this.startDate, this.endDate,
          this.page, this.limit, this.ratingType, this.npsType, this.contactable, this.contacted,
          this.keyWord, this.searchText, this.queueId);
        if (this.surveys && this.surveys.length > 0) {
          const { counter } = this.surveys[0];
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
      this.ratingType = undefined;
      this.npsType = undefined;
      this.contactable = undefined;
      this.contacted = undefined;
      this.keyWord = undefined;
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
    getKeyWords() {
      if (this.calculatedMetrics &&
        this.calculatedMetrics['survey.created'] &&
        this.calculatedMetrics['survey.created'].keyWords
      ) {
        return Object.keys(this.calculatedMetrics['survey.created'].keyWords).sort((a,b) => b - a).slice(0, 10);
      }
    },
    getKeyWordAvg(word) {
      if (this.calculatedMetrics &&
        this.calculatedMetrics['survey.created'] &&
        this.calculatedMetrics['survey.created'].keyWords &&
        this.calculatedMetrics['survey.created'].keyWords[word]
      ) {
        return this.calculatedMetrics['survey.created'].keyWords[word]['scoreAvg'] || 0
      }
      return 0;
    },
    clasifyScoredComment(messageScore) {
      if (!messageScore) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (messageScore < 0.1) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (messageScore < 0.5) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    },
    showKeyWords() {
      this.showKeyWordsOptions = !this.showKeyWordsOptions;
    },
    setKeyWord(keyword) {
      this.keyWord = keyword;
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions
    },
    async exportToCSV() {
      try {
        this.loading = true;
        let csvAsBlob = [];
        const result = await getSurveysDetails(this.commerce.id, this.startDate, this.endDate);
        if (result && result.length > 0) {
          csvAsBlob = jsonToCsv(result);
        }
        const blobURL = URL.createObjectURL(new Blob([csvAsBlob]));
        const a = document.createElement('a');
        a.style = 'display: none';
        a.download = `surveys-details-${this.commerce.tag}-${this.startDate}-${this.endDate}.csv`;
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
      const { page, ratingType, npsType, contactable, contacted, keyWord, queueId } = this;
      return {
        page, ratingType, npsType, contactable, contacted, keyWord, queueId
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
          (oldData.ratingType !== newData.ratingType ||
          oldData.npsType !== newData.npsType ||
          oldData.contactable !== newData.contactable ||
          oldData.keyWord !== newData.keyWord ||
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
          if (this.searchText.length > 3) {
            this.refresh();
          }
        }
      }
    }
  }
}
</script>

<template>
  <div id="surveys-management" class="row" v-if="showSurveyManagement === true && toggles['dashboard.surveys-management.view']">
    <div class="col">
      <div id="survey-management-component">
        <Spinner :show="loading"></Spinner>
        <div v-if="!loading">
          <div>
            <SimpleDownloadCard
              :download="toggles['dashboard.reports.surveys-management']"
              :title="$t('dashboard.reports.surveys-management.title')"
              :showTooltip="true"
              :description="$t('dashboard.reports.surveys-management.description')"
              :icon="'bi-file-earmark-spreadsheet'"
              @download="exportToCSV"
              :canDownload="toggles['dashboard.reports.surveys-management'] === true"
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
                  <input type="radio" class="btn btn-check btn-sm" v-model="ratingType" value="DETRACTOR" name="rating-type" id="detractor-rating" autocomplete="off">
                  <label class="btn" for="detractor-rating"> <i :class="`bi bi-star-fill red-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="ratingType" value="NEUTRO" name="rating-type" id="neutro-rating" autocomplete="off">
                  <label class="btn" for="neutro-rating"> <i :class="`bi bi-star-half yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="ratingType" value="PROMOTOR" name="rating-type" id="promotor-rating" autocomplete="off">
                  <label class="btn" for="promotor-rating"> <i :class="`bi bi-star-fill green-icon`"></i> </label>
                </div>
                <div class="col-12 col-md my-1 filter-card">
                  <input type="radio" class="btn btn-check btn-sm" v-model="npsType" value="DETRACTOR" name="nps-type" id="detractor-nps" autocomplete="off">
                  <label class="btn" for="detractor-nps"> <i :class="`bi bi-emoji-frown-fill red-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="npsType" value="NEUTRO" name="nps-type" id="neutro-nps" autocomplete="off">
                  <label class="btn" for="neutro-nps"> <i :class="`bi bi-emoji-neutral-fill yellow-icon`"></i> </label>
                  <input type="radio" class="btn btn-check btn-sm" v-model="npsType" value="PROMOTOR" name="nps-type" id="promotor-nps" autocomplete="off">
                  <label class="btn" for="promotor-nps"> <i :class="`bi bi-emoji-smile-fill green-icon`"></i> </label>
                </div>
                <div class="row">
                  <div class="col-12 col-md-5">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="contactable === false ? 'bg-danger' : ''" type="checkbox" name="contactable" id="contactable" v-model="contactable" @click="checkContactable($event)">
                      <label class="form-check-label metric-card-subtitle" for="contactable">{{ $t("dashboard.contactable") }}</label>
                    </div>
                  </div>
                  <div class="col-12 col-md-5">
                    <div class="form-check form-switch centered">
                      <input class="form-check-input m-1" :class="contacted === false ? 'bg-danger' : ''" type="checkbox" name="contacted" id="contacted"  v-model="contacted" @click="checkContacted($event)">
                      <label class="form-check-label metric-card-subtitle" for="contacted">{{ $t("dashboard.contacted") }}</label>
                    </div>
                  </div>
                </div>
                <div class="filter-card col-md">
                  <span class="form-check-label metric-keyword-subtitle" @click="showKeyWords()"> {{ $t("dashboard.keyWord") }} <i :class="`bi ${showKeyWordsOptions === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i> </span>
                  <div v-if="showKeyWordsOptions === true" class="row">
                    <div class="col" v-for="(word, ind) in getKeyWords()" :key="`word-${ind}`">
                      <div class="m-0">
                        <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold" :class="word === keyWord ? 'metric-keyword-tag-selected': ''" @click="setKeyWord(word)">
                          {{ word }}
                          <span class="badge rounded-pill bg-danger metric-keyword-tag mx-1 ">
                            {{ calculatedMetrics['survey.created'].keyWords[word].count }}
                          </span>
                          <span class="metric-keyword-tag" v-if="getKeyWordAvg(word) !== 0">
                            <i :class="`metric-keyword-tag bi ${clasifyScoredComment(calculatedMetrics['survey.created'].keyWords[word] ? getKeyWordAvg(word) : undefined)}  mb-0`"> </i> {{ getKeyWordAvg(word) }}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="my-3">
              <span class="badge bg-secondary px-3 py-2 m-1">{{ $t("businessAdmin.listResult") }} {{ this.counter }} </span>
              <span class="badge bg-secondary px-3 py-2 m-1"> {{ $t("page") }} {{ this.page }} {{ $t("of") }} {{ this.totalPages }} </span>
            </div>
            <div v-if="surveys && surveys.length > 0">
              <div class="centered mt-2">
                <nav>
                  <ul class="pagination">
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(1)"
                        :disabled="page === 1">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Previous"
                        @click="setPage(page - 1)"
                        :disabled="page === 1">
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    <li>
                      <select class="btn btn-md btn-light fw-bold text-dark select" v-model="page">
                        <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">{{ pag }}</option>
                      </select>
                    </li>
                    <li class="page-item">
                      <button class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Next"
                        @click="setPage(page + 1)"
                        :disabled="page === totalPages">
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(totalPages)"
                        :disabled="page === totalPages">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
              <div class="row" v-for="(survey, index) in surveys" :key="`survey-${index}`">
                <SurveyDetailsCard
                  :show="true"
                  :survey="survey"
                >
                </SurveyDetailsCard>
              </div>
              <div class="centered mt-2">
                <nav>
                  <ul class="pagination">
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(1)"
                        :disabled="page === 1">
                        <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Previous"
                        @click="setPage(page - 1)"
                        :disabled="page === 1">
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    <li>
                      <select class="btn btn-md btn-light fw-bold text-dark select" v-model="page">
                        <option v-for="pag in totalPages" :key="pag" :value="pag" id="select-queue">{{ pag }}</option>
                      </select>
                    </li>
                    <li class="page-item">
                      <button class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="Next"
                        @click="setPage(page + 1)"
                        :disabled="page === totalPages">
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                    <li class="page-item">
                      <button
                        class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                        aria-label="First"
                        @click="setPage(totalPages)"
                        :disabled="page === totalPages">
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
  <div v-if="showSurveyManagement === true && !toggles['dashboard.surveys-management.view']">
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