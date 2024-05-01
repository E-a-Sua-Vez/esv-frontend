<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'HistoryDetailsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: '' },
    date: { type: String, default: '' }
  },
  data() {
    return {}
  },
  methods: {
    getDate(date) {
      return getDate(date);
    }
  }
}
</script>

<template>
  <div v-if="show" class="metric-card">
    <div v-if="date">
      <span class="lefted badge rounded-pill bg-primary"> {{ getDate(date) }}</span>
    </div>
    <div class="lefted paragraph">
      <span class="m-1">
        {{ content }}
      </span>
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
.paragraph {
  font-size: .8rem;
  line-height: .9rem;
}
</style>