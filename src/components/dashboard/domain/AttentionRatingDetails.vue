<script>

export default {
  name: 'AttentionRatingDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: '' },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    score: { type: Object, default: {} },
    messages: { type: Array, default: [] },
    limit: { type: Number, default: 5 },
  },
  data() {
    return {
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
    wrapComment(comment){
      if (!comment) {
        return 'No Data';
      } else if (comment.length > 30) {
        return comment.slice(0,30) + '...';
      }
      return comment;
    },
    scorePercentage(total, score) {
      return parseFloat((score * 100 / total).toFixed(2), 2) || 0;
    }
  },
}
</script>

<template>
  <div v-if="show">
    <div class="row">
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-down-circle-fill h4 fw-bold red-icon m-1"></i>
          {{ $t('dashboard.items.attentions.9') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ min }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-up-circle-fill h4 fw-bold green-icon m-1"></i>
          {{ $t('dashboard.items.attentions.8') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ max }}</span>
        </div>
      </div>
    </div>
    <hr>
    <div v-if="messages.length > 0 && false">
      <div class="row mx-2" v-for="(message) in messages.slice(0, limit)" :key="message.id">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi ${clasifyRatedComment(message.rating)}`">
          </i>
          <span class="col-8"> {{ wrapComment(message.message) }} </span>
          <span class="col-2 badge rounded-pill bg-secondary metric-card-subtitle"> {{ message.rating || 'N/I' }} </span>
        </div>
        <hr>
      </div>
    </div>
    <div class="my-2 mx-2">
      <div class="progress" style="height: 30px;">
        <div class="progress-bar yellow-0-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating0)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating0 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-1-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating1)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating1 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-2-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating2)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating2 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-3-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating3)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating3 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-4-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating4)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating4 || 'N/I' }}
        </div>
        <div class="progress-bar yellow-5-area" role="progressbar" :style="`height: 30px; width: ${scorePercentage(count, score.totalRating5)}%`" aria-valuemin="0" aria-valuemax="100">
          {{ score.totalRating5 || 'N/I' }}
        </div>
      </div>
    </div>
    <div class="row mx-2">
      <div class="row metric-card-title" v-for="index in 6" :key="index">
        <div class="col-5 centered">
          <i :class="`bi bi-star-fill yellow-icon`"> </i> <span class="mx-1"> {{ 6 - index}}</span>
        </div>
        <div class="col centered">
          <span class="badge rounded-pill bg-primary metric-card-subtitle m-1"> {{ `${scorePercentage(count, score[`totalRating${6 - index}`])}%` }} </span>
        </div>
        <div class="col centered">
          <span class="badge rounded-pill bg-secondary metric-card-subtitle m-1"> {{ score[`totalRating${6 - index}`] || 'N/I' }} </span>
        </div>
        <hr>
      </div>
      <hr>
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
</style>