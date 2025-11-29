<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'HistoryDetailsWithItemsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: undefined },
    details: { type: Object, default: {} },
    date: { type: String, default: '' },
  },
  data() {
    return {};
  },
  methods: {
    getDate(date) {
      return getDate(date);
    },
  },
};
</script>

<template>
  <div v-if="show" class="metric-card">
    <div v-if="date">
      <span class="lefted badge rounded-pill bg-primary"> {{ getDate(date) }}</span>
    </div>
    <div v-if="Object.keys(details).length > 0">
      <div class="mt-2">
        <span
          v-for="(item, index) in Object.keys(details)"
          :key="index"
          class="badge detail-data-badge mx-1"
        >
          <span class="fw-bold detail-data-badge-title"> {{ details[item].name }}</span>
          <span> {{ details[item].value }}</span>
        </span>
      </div>
      <hr />
    </div>
    <div class="lefted paragraph" v-if="content">
      <span class="mx-2">
        {{ content }}
      </span>
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
.paragraph {
  font-size: 0.8rem;
  line-height: 0.9rem;
}
</style>
