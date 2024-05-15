<script>

export default {
  name: 'SurveyDetails',
  props: {
    show: { type: Boolean, default: true },
    surveyIn: { type: Object, default: undefined },
  },
  data() {
    return {
      survey: {}
    }
  },
  methods: {
    clasifyRatedComment(messageScore) {
      if (!messageScore) {
        return 'bi-emoji-expressionless-fill blue-icon';
      } else if (messageScore < 2.5) {
        return 'bi-emoji-frown-fill red-icon';
      } else if (messageScore < 4) {
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
    scorePercentage(total, score) {
      return parseFloat((score * 100 / total).toFixed(2), 2) || 0;
    },
  },
  watch: {
    surveyIn: {
      immediate: true,
      deep: true,
      async handler() {
        this.survey = this.surveyIn;
      }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="answers">
      <div class="row metric-card" v-if="survey.rating">
        <span class="fw-bold metric-card-detail-title mt-1"> CSAT: {{ $t('attentionSurvey.rateYourAttention')}} </span>
        <div>
          <h5><span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ survey.rating }} ⭐️ </span></h5>
        </div>
      </div>
      <div class="row metric-card" v-if="survey.nps">
        <span class="fw-bold metric-card-detail-title mt-1"> NPS: {{ $t('attentionSurvey.nps.title')}} </span>
        <div>
          <button v-if="survey.nps <= 5" :class="`button detractor m-2`" >{{ survey.nps }}</button>
          <button v-if="survey.nps >= 6 && survey.nps <= 8" :class="`button passive m-2`" >{{ survey.nps }}</button>
          <button v-if="survey.nps >= 9" :class="`button promoter m-2`" >{{ survey.nps }}</button>
        </div>
      </div>
      <div v-if="survey.answers && survey.answers.length > 0">
        <div v-for="(answer, index) of survey.answers" :key="`anwswer${index}`">
          <div class="row metric-card" v-if="answer.answer">
            <span class="fw-bold metric-card-detail-title mt-1"> {{ answer.title }} </span>
            <span class="mt-1"> {{ $t(`surveys.question_types.${answer.type}`) }} </span>
            <div v-if="answer.type === 'YES_OR_NOT'">
              <button v-if="answer.answer === 'NO'" :class="`button no-selected m-2`" ><i class="bi bi-hand-thumbs-down-fill"></i></button>
              <button v-if="answer.answer === 'YES'" :class="`button yes-selected m-2`"><i class="bi bi-hand-thumbs-up-fill"></i></button>
              <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ $t(answer.answer) }} </span>
            </div>
            <div v-if="answer.type === 'CHOOSE_OPTION'">
              <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ answer.answer[0] }} </span>
            </div>
            <div v-if="answer.type === 'RATING_TO_10'">
              <button v-if="answer.answer <= 5" :class="`button detractor m-2`" >{{ answer.answer }}</button>
              <button v-if="answer.answer >= 6 && answer.answer <= 8" :class="`button passive m-2`" >{{ answer.answer }}</button>
              <button v-if="answer.answer >= 9" :class="`button promoter m-2`" >{{ answer.answer }}</button>
            </div>
            <div v-if="answer.type === 'OPEN_OPTIONS'">
              <div v-for="ans of answer.answer" :key="ans">
                <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ ans }} </span>
              </div>
            </div>
            <div v-if="answer.type === 'RATING_TO_5'">
              <h5><span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ answer.answer }} ⭐️ </span></h5>
            </div>
            <div v-if="answer.type === 'OPEN_WRITING'">
              <div v-if="answer.answer.messageScore && answer.answer.messageScore.score">
                <i :class="`bi ${clasifyScoredComment(answer.answer.messageScore.score)} mx-1`"> </i> {{ answer.answer.messageScore.score || 0 }}
              </div>
              <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ answer.answer.message || '' }} </span>
            </div>
          </div>
        </div>
      </div>
      <div class="row metric-card" v-if="survey.message">
        <span class="fw-bold metric-card-detail-title mt-1"> {{ $t('attentionSurvey.survey.label')}} </span>
        <div>
          <div v-if="survey.messageScore">
            <i :class="`bi ${clasifyScoredComment(survey.messageScore)} mx-1`"> </i> {{ survey.messageScore || 0 }}
          </div>
          <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">  {{ survey.message || '' }} </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: .9rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.button {
  /* padding: 5px 10px; */
  font-size: 12px;
  white-space: nowrap;
  vertical-align: middle;
  display: inline-block;
  background: none;
  border: none;
  box-shadow: none;
  cursor: pointer;
  text-align: center;
  font-weight: 700;
  border-radius: 100%;
  margin: .2rem;
  outline: none;
  margin-left: -1px;
  width: 40px;
  height: 40px;
  border: 2px solid #eee;
  transform: scale(1);
}
.no-selected {
  background: #F44336;
  color: white;
  border-color: lighten(#F44336, 5%);
  transform: scale(1.20);
}
.yes-selected {
  background: #3b5998;
  color: white;
  border-color: lighten(#3b5998, 5%);
  transform: scale(1.20);
}
.detractor {
  background: #F44336;
  color: white;
  border-color: lighten(#F44336, 5%);
  transform: scale(1);
}
.passive {
  background: #F57C00;
  color: white;
  border-color: lighten(#F57C00, 5%);
  transform: scale(1);
}
.promoter {
  background: #4CAF50;
  color: white;
  border-color: lighten(#4CAF50, 5%);
  transform: scale(1);
}
.answers {
  overflow-y: scroll;
  height:600px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 1rem;
  text-justify: inter-word;
}
.metric-card-detail-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .9rem;
}
</style>