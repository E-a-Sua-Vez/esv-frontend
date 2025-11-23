<script>
export default {
  name: 'AttentionCommentsDetails',
  props: {
    show: { type: Boolean, default: true },
    messages: { type: Array, default: undefined },
    distribution: { type: Object, default: {} },
    min: { type: [String, Number], default: 'No Data' },
    max: { type: [String, Number], default: 'No Data' },
    limit: { type: Number, default: 5 },
  },
  data() {
    return {};
  },
  methods: {
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
    wrapComment(comment) {
      if (!comment) {
        return 'No Data';
      } else if (comment.length > 30) {
        return comment.slice(0, 30) + '...';
      }
      return comment;
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="row" v-if="min && max">
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-down-circle-fill h4 fw-bold red-icon m-1"></i>
          {{ $t('dashboard.items.attentions.9') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ min || 0 }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-arrow-up-circle-fill h4 fw-bold green-icon m-1"></i>
          {{ $t('dashboard.items.attentions.8') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ max || 0 }}</span>
        </div>
      </div>
    </div>
    <hr />
    <div class="row m-1" v-if="distribution">
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-frown-fill red-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.detractor') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.totalSentimentBad || 0 }}</span>
        </div>
      </div>
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-neutral-fill yellow-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.neutral') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.totalSentimentNeutral || 0 }}</span>
        </div>
      </div>
      <div class="col-4 col-md-4">
        <div class="metric-card-title centered">
          <i class="bi bi-emoji-smile-fill green-icon h4 fw-bold m-1"></i>
          {{ $t('dashboard.promoter') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold m-1">{{ distribution.totalSentimentGood || 0 }}</span>
        </div>
      </div>
    </div>
    <hr />
    <div v-if="messages">
      <div v-if="messages.length > 0">
        <div class="row mx-2" v-for="message in messages.slice(0, limit)" :key="message.id">
          <div class="metric-card-title">
            <i :class="`h6 col-2 bi ${clasifyScoredComment(message.messageScore)}`"> </i>
            <span class="col-8"> {{ wrapComment(message.message) }} </span>
            <span class="col-2 badge rounded-pill bg-secondary metric-card-subtitle">
              {{ message.messageScore || 'N/I' }}
            </span>
          </div>
          <hr />
        </div>
      </div>
      <div v-else>
        <div class="row">
          <div class="col">
            <div class="metric-card-title">
              <span class="col-8"> {{ 'No Data' }} </span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
.metric-card-title {
  font-size: 0.8rem;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>
