<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import { contactSurvey } from '../../../application/services/survey';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'SurveyDetailsCard',
  components: { Popper, Spinner },
  props: {
    show: { type: Boolean, default: true },
    survey: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
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
    getDate(date, timeZoneIn) {
      const dateCorrected = new Date(
      new Date(date).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected.toISOString().slice(0,10);
    },
    copySurvey() {
      const textToCopy = jsonToCsv([this.survey]);
      navigator.clipboard.writeText(textToCopy);
    },
    async check() {
      try {
        this.loading = true;
        if (this.survey && this.survey.surveyid) {
          const survey = await contactSurvey(this.survey.surveyid);
          this.checked = survey.contacted;
        }
        this.loading = false;
      } catch (error) {
        this.checked = false;
        this.loading = false;
        this.alertError = error.message;
      }
    },
    clasifyRatedComment(messageScore) {
      if (!messageScore) {
        return 'bi-star-half-fill blue-icon';
      } else if (messageScore < 2.5) {
        return 'bi-star-fill red-icon';
      } else if (messageScore < 4) {
        return 'bi-star-half yellow-icon';
      } else {
        return 'bi-star-fill green-icon';
      }
    },
    clasifyNpsComment(score){
      if (!score) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (score <= 5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (score <= 8) {
        return 'bi-emoji-neutral-fill yellow-icon';
      } else {
        return 'bi-emoji-smile-fill green-icon';
      }
    },
    clasifyScoredComment(messageScore) {
      if (!messageScore) {
        return 'bi-heart-half blue-icon';
      } else if (messageScore < 0.1) {
        return 'bi-heartbreak-fill red-icon';
      } else if (messageScore < 0.5) {
        return 'bi-heart-half yellow-icon';
      } else {
        return 'bi-heart-fill green-icon';
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
    <div class="row metric-card fw-bold">
      <div class="col-5 centered" v-if="survey && survey.name">
        <i class="bi bi-person-circle mx-1"></i> {{ survey.name.split(' ')[0] || 'N/I' }}
        <i v-if="survey.contacted === true || checked === true" class="bi bi-patch-check-fill mx-1 checked-icon"> </i>
      </div>
      <div class="col-2 centered">
        <i :class="`bi ${clasifyRatedComment(survey.rating)} mx-1`"></i> {{ survey.rating || 'N/I' }}
      </div>
      <div class="col-2 centered">
        <i :class="`bi ${clasifyNpsComment(survey.nps)} mx-1`"> </i> {{ survey.nps || 'N/I' }}
      </div>
      <div class="col-2 centered">
        <i :class="`bi ${clasifyScoredComment(survey.messageScore)} mx-1`"> </i> {{ survey && survey.messageScore ? survey.messageScore : 0 }}
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
          <div class="d-block col-12 col-md-5">
            <div class="col-12 centered">
              <i class="bi bi-person-circle mx-1"></i> {{ survey.name || 'N/I' }} {{ survey.lastName || '' }}
            </div>
            <div class="col-12 centered" v-if="!loading">
              <a class="btn copy-icon"
                @click="copySurvey()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
              <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                @click="check()"
                :disabled="survey.contacted || checked"
                >
                <i class="bi bi-person-check-fill"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+survey.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ survey.phone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+survey.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ survey.email || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ survey.idNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+survey.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ survey.phone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+survey.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ survey.email || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ survey.idNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row m-0 my-2 centered">
          <hr>
          <div class="col-4 mx-2 fw-bold">
            <i class="bi bi-pencil"> </i> <span>{{ $t("dashboard.comment") }}</span>
          </div>
          <div class="col-8"> {{ survey.message || 'N/I' }}</div>
        </div>
        <div class="row m-0 my-2 centered" v-if="survey.messageEntities && survey.messageEntities.length > 0">
          <hr>
          <div class="col-6 mx-2 fw-bold">
            <i class="bi bi-heart"> </i> <span>{{ $t("dashboard.entities") }}</span>
          </div>
          <div class="col-6">
            <span class="m-1" v-for="(entity, ind) in survey.messageEntities" :key="`entity-${ind}`">
              {{ entity.name.toUpperCase() }}
              <i :class="`bi ${clasifyScoredComment(entity.score)}`"> </i> {{ entity && entity.score ? entity.score : 0 }}
              <br>
            </span>
          </div>
        </div>
        <div class="row m-0 mt-3 centered">
          <div class="col">
            <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold"> {{ survey.queueName }}</span><br>
            <span class="metric-card-details mx-1"><strong>Id:</strong> {{ survey.surveyid }}</span>
            <span class="metric-card-details"><strong>Date:</strong> {{ getDate(survey.createdDate) }}</span>
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
</style>