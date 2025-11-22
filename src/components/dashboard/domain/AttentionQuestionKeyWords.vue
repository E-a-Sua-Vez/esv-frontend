<script>
export default {
  name: 'AttentionQuestionKeyWords',
  props: {
    show: { type: Boolean, default: true },
    calculatedMetrics: { type: Object, default: {} },
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
    getPercentage(avg) {
      return parseFloat((avg * 100).toFixed(2), 2) || 0;
    },
    getOptions() {
      if (
        this.calculatedMetrics &&
        this.calculatedMetrics['survey.created'] &&
        this.calculatedMetrics['survey.created'].keyWords
      ) {
        return Object.keys(this.calculatedMetrics['survey.created'].keyWords).sort((a, b) => b - a);
      }
    },
    getKeyWordAvg(word) {
      if (
        this.calculatedMetrics &&
        this.calculatedMetrics['survey.created'] &&
        this.calculatedMetrics['survey.created'].keyWords &&
        this.calculatedMetrics['survey.created'].keyWords[word]
      ) {
        return this.calculatedMetrics['survey.created'].keyWords[word]['scoreAvg'] || 0;
      }
      return 0;
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="metric-card h4" v-if="getOptions().length > 0">
      <span class="metric-card-title">
        {{ $t('dashboard.keyWords') }}
      </span>
      <div class="row mt-3">
        <div class="col centered" v-for="(word, ind) in getOptions()" :key="`word-${ind}`">
          <div class="m-0">
            <span class="badge rounded-pill bg-secondary metric-card-subtitle mx-2 fw-bold">
              {{ word }}
              <span class="badge rounded-pill bg-danger metric-card-subtitle mx-2">
                {{ calculatedMetrics['survey.created'].keyWords[word].count }}
              </span>
              <span class="h6" v-if="getKeyWordAvg(word) !== 0">
                <i
                  :class="`h6 bi ${clasifyScoredComment(
                    calculatedMetrics['survey.created'].keyWords[word]
                      ? getKeyWordAvg(word)
                      : undefined
                  )}  mb-0`"
                >
                </i>
                {{ getKeyWordAvg(word) }}
              </span>
            </span>
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
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>
