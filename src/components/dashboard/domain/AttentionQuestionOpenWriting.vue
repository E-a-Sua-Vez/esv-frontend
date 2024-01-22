<script>
import { getPersonalizedSurveyDetails } from '../../../application/services/query-stack';
import Spinner from '../../../components/common/Spinner.vue';

export default {
  name: 'AttentionQuestionOpenWriting',
  components: { Spinner },
  props: {
    show: { type: Boolean, default: true },
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    question: { type: Object, default: {} },
    detailsOpened: { type: Boolean, default: false },
  },
  data() {
    return {
      loading: false,
      counter: 0,
      answers: [],
      totalPages: 0,
      page: 1,
      limit: 10
    }
  },
  async beforeMount() {
    try {
      this.loading = true;
      if (this.question['answers']) {
        answers = this.question['answers'];
      }
      this.loading = false;
    } catch (error) {
      this.loading = false;
    }
  },
  methods: {
    setPage(pageIn) {
      this.page = pageIn;
    },
    async refresh() {
      try {
        this.loading = true;
        const { commerceId, personalizedId, title } = this.question;
        let result = undefined;
        if (this.question && this.question.counter > 10) {
          result = await getPersonalizedSurveyDetails(personalizedId, commerceId, title, this.startDate, this.endDate);
        }
        if (result && result.length > 0) {
          this.answers = result[0]['answers'];
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
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
    wrapComment(commentIn){
      let comment = 'No Data';
      if (commentIn) {
         if (commentIn && commentIn.message) {
          comment = commentIn.message;
        } else {
          comment = commentIn;
        }
      }
      if (comment.length > 60) {
        comment = comment.slice(0,60) + '...';
      }
      return comment;
    },
  },
  watch: {
    question: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.question['answers']) {
          this.answers = this.question['answers'];
        }
      }
    },
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        if (this.detailsOpened) {
          this.refresh();
        }
      }
    },
  },
}
</script>

<template>
  <div v-if="show && question">
    <div class="mt-3">
      <div class="col-12 mb-2">
        <div class="row centered">
          <i :class="`h1 centered bi ${clasifyScoredComment(question['scoreAvg'] ? question['scoreAvg'] : undefined)} mb-0`"> </i>
        </div>
        <div class="row">
          <div class="col centered">
            <span class="metric-card-number">{{ parseFloat((question['scoreAvg'] || 0).toFixed(2), 2) }}</span>
          </div>
        </div>
      </div>
      <div class="row">
        <span @click="refresh()" class="refresh-questions" v-if="this.question.counter > 10">
          <i class="bi bi-plus-circle"></i>
          {{ $t('dashboard.showAll') }}
        </span>
      </div>
      <div v-for="(comment, ind) in this.answers.filter(ans => ans)" :key="`option.${ind}`">
        <div class="row mx-2 centered">
          <div class="col-1">
            <span class="fw-bold"> {{ ind + 1 }} </span>
          </div>
          <div class="col-3">
            <span class="metric-card-score fw-bold"> <i :class="`h6 bi ${clasifyScoredComment(comment && comment['messageScore'] ? comment['messageScore']['score'] : undefined)}  mb-0`"> </i> {{ comment && comment['messageScore'] ? comment['messageScore']['score'] : 'N/I' }} </span>
          </div>
          <div class="col metric-card-comment mb-1">
            <span class=""> {{ wrapComment(comment) }} </span>
          </div>
          <hr>
        </div>
      </div>
      <Spinner :show="loading"></Spinner>
    </div>
  </div>
</template>

<style scoped>
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-score {
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
.refresh-questions {
  text-decoration: underline;
  font-size: 0.8rem;
  cursor: pointer;
  text-align: right;
  margin-bottom: 1rem;
}
</style>