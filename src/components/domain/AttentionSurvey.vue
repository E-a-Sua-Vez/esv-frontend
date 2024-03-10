<script>
import { createSurvey } from '../../application/services/survey';
import Message from '../common/Message.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import NPSSurvey from '../survey/NPSSurvey.vue';
import AgreeSurvey from '../survey/AgreeSurvey.vue';
import LikeSurvey from '../survey/LikeSurvey.vue';
import StarSurvey from '../survey/StarSurvey.vue';

export default {
  name: 'AttentionSurvey',
  components: {
    Alert,
    Message,
    Spinner,
    NPSSurvey,
    LikeSurvey,
    AgreeSurvey,
    StarSurvey
  },
  props: {
    surveyPersonalized: { type: Object, default: {} },
    attentionId: { type: String, default: '' },
    attentionType: { type: String, default: 'STANDARD'}
  },
  data() {
    return {
      rating: 5,
      nps: 10,
      like: 1,
      agree: 10,
      message: '',
      answers: [],
      surveyCompleted: false,
      surveyPersonalizedIn: {},
      loading: false,
      alertError: ''
    }
  },
  methods: {
    checkOption(event, index, option) {
      if (this.answers[index] === undefined) {
        this.answers[index] = [];
      }
      if (event.target.checked) {
        if (!this.answers[index].includes(option)) {
          this.answers[index].push(option);
        }
      } else {
        this.answers[index] = this.answers[index].filter(el => el !== option);
      }
    },
    fillOtherOption(event, index) {
      if (this.answers[index] === undefined) {
        this.answers[index] = [];
      }
      const option = 'OTHER';
      if (event.target.value) {
        const option = event.target.value.toUpperCase();
        if (!this.answers[index].includes(option)) {
          this.answers[index].push(option);
        }
      } else {
        this.answers[index] = this.answers[index].filter(el => el !== option);;
      }
    },
    selectOption(event, index, option) {
      this.answers[index] = [];
      if (event.target.checked) {
        this.answers[index].push(option);
      }
    },
    async saveRating() {
      try {
        this.loading = true;
        this.alertError = '';
        let answersCollected = [];
        if (this.surveyPersonalized.questions && this.surveyPersonalized.questions.length > 0) {
          answersCollected = this.surveyPersonalized.questions.map((question, ind) =>  {
            if (question) {
              const answer = {
                title: question.title,
                type: question.type,
                answer: this.answers[ind]
              };
              if (question['analize'] !== undefined) {
                answer['analize'] = question['analize'];
              }
              return answer;
            }
          })
        }
        const body = {
          personalizedId: this.surveyPersonalized.id || undefined,
          attentionId: this.attentionId,
          type: this.surveyPersonalized.type,
          rating: this.rating || 0,
          nps: this.nps || 0,
          questions: this.surveyPersonalized.questions || [],
          answers: answersCollected || [],
          message: this.message || ''
        };
        await createSurvey(body);
        this.surveyCompleted = true;
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    }
  }
}
</script>

<template>
  <div v-if="surveyPersonalized.id" class="mt-4">
    <div v-if="!surveyCompleted && attentionType !=='NODEVICE'">
      <div v-if="surveyPersonalized.hasCSAT">
        <div class="your-rating">
          <span> {{ $t("attentionSurvey.rateYourAttention") }}</span>
        </div>
        <div class="m-0">
          <StarSurvey
            :show="true"
            v-model:rating="rating"
          ></StarSurvey>
        </div><hr>
      </div>
      <div v-if="surveyPersonalized.hasNPS">
        <div class="your-rating">
          <span> {{ $t("attentionSurvey.nps.title") }}</span>
        </div>
        <NPSSurvey
          :show="true"
          v-model:nps="nps"
        ></NPSSurvey><hr>
      </div>
      <div v-if="surveyPersonalized.questions && surveyPersonalized.questions.length > 0">
        <div v-for="(question, index) in surveyPersonalized.questions" :key="`question-${index}`" class="my-4">
          <div class="your-rating">
            <span> {{ question.title.trim() }}</span>
          </div>
          <div v-if="question.type === 'YES_OR_NOT'">
            <LikeSurvey
              :show="true"
              v-model:like="answers[index]"
            ></LikeSurvey>
          </div>
          <div v-else-if="question.type === 'OPEN_WRITING'">
            <textarea
              class="form-control mt-2"
              id="commennt"
              rows="3"
              v-model="answers[index]"
              :placeholder="$t('attentionSurvey.writing.placeholder')">
            </textarea>
          </div>
          <div v-else-if="question.type === 'RATING_TO_5'">
            <span class="title"> <i class="bi bi-hand-thumbs-down-fill"></i> {{ $t("attentionSurvey.to5.subtitle") }} <i class="bi bi-hand-thumbs-up-fill"></i>  </span> <br>
            <StarSurvey
              :show="true"
              v-model:rating="answers[index]"
            ></StarSurvey>
          </div>
          <div v-else-if="question.type === 'RATING_TO_10'">
            <AgreeSurvey
              :show="true"
              v-model:agree="answers[index]"
            ></AgreeSurvey>
          </div>
          <div v-else-if="question.type === 'OPEN_OPTIONS'" class="mt-3">
            <div class="form-check form-switch check-option" v-for="(option, ind) in question.options.split(',')" :key="`option-${ind}`">
              <input
                class="form-check-input"
                type="checkbox"
                :name="`option-${option.title}`"
                :id="`option-${index}`"
                @click="checkOption($event, index, option)"
                >
              <label class="form-check-label" for="option">{{ option.toUpperCase().trim() }}</label>
            </div>
            <div class="col form-floating" v-if="question.otherOption && question.otherOptionOpen">
              <input
                :id="`option-other-${index}`"
                maxlength="50"
                type="text"
                class="form-control form-control-solid"
                :name="`option-other`"
                placeholder="Other"
                v-on:blur="fillOtherOption($event, index, option)">
                <label for="option-other" class="label-form">{{ $t("attentionSurvey.other") }}</label>
            </div>
            <div v-else-if="question.otherOption && !question.otherOptionOpen">
              <div class="form-check form-switch check-option">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :name="`option-other-${index}`"
                  :id="`option-${index}`"
                  @click="checkOption($event, index, 'OTHER')"
                  >
                <label class="form-check-label" for="option">{{ $t("attentionSurvey.other") }}</label>
              </div>
            </div>
          </div>
          <div v-else-if="question.type === 'CHOOSE_OPTION'" class="mt-3">
            <div class="form-check form-switch check-option" v-for="(option, ind) in question.options.split(',')" :key="`option-${ind}`">
              <input
                class="form-check-input"
                type="radio"
                :name="`option-${question.title}`"
                :id="`option-${index}`"
                @click="selectOption($event, index, option)"
                >
              <label class="form-check-label" :for="`option-${index}`">{{ option.toUpperCase().trim() }}</label>
            </div>
            <div class="col form-floating" v-if="question.otherOption && question.otherOptionOpen">
              <input
                :id="`option-other-${index}`"
                maxlength="50"
                type="text"
                class="form-control form-control-solid"
                :name="`option-other`"
                placeholder="Other"
                v-on:blur="fillOtherOption($event, index, option)">
                <label for="option-other" class="label-form">{{ $t("attentionSurvey.other") }}</label>
            </div>
            <div v-else-if="question.otherOption && !question.otherOptionOpen">
              <div class="form-check form-switch check-option">
                <input
                  class="form-check-input"
                  type="radio"
                  :name="`option-${question.title}`"
                  :id="`option-${index}`"
                  @click="checkOption($event, index, 'OTHER')"
                  >
                <label class="form-check-label" for="option">{{ 'OTHER'.toUpperCase().trim() }}</label>
              </div>
            </div>
          </div><hr>
        </div>
      </div>
      <div v-if="surveyPersonalized.hasMessage">
        <div class="mb-2 mx-2">
          <label for="commennt" class="form-label ml-1 your-rating">{{ $t("attentionSurvey.survey.label") }}</label>
          <textarea
            class="form-control"
            id="commennt"
            rows="3"
            v-model="message"
            :placeholder="$t('attentionSurvey.survey.placeholder')"></textarea>
        </div>
      </div>
      <div class="mt-3">
        <a
          class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
          @click="saveRating()">
          {{ $t("attentionSurvey.actions.1.action") }} <i class="bi bi-check-all"></i>
        </a>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
    </div>
    <div v-else>
      <Message
        :title="$t('attentionSurvey.message.1.title')"
        :content="$t('attentionSurvey.message.1.content')"
        :icon="'bi bi-emoji-sunglasses'">
      </Message>
    </div>
  </div>
  <div v-else>
    <Message
      :title="$t('attentionSurvey.message.2.title')"
      :content="$t('attentionSurvey.message.2.content')"
      :icon="'bi bi-emoji-sunglasses'">
    </Message>
  </div>
</template>

<style scoped>
.details {
  line-height: normal;
}
.your-rating {
 line-height: 1.1rem;
}
.check-option {
  text-align: left;
}
.title {
  font-size: 12px;
  font-weight: 500;
}
</style>