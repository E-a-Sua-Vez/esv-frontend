<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'HistoryControlDetailsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: undefined },
    date: { type: String, default: undefined },
    status: { type: String, default: undefined },
    reason: { type: String, default: undefined }
  },
  data() {
    return {}
  },
  methods: {
    getDate(date) {
      return getDate(date);
    },
    getStatusIcon(status) {
      if (status === 'PENDING') {
        return 'bi-clock-fill yellow-icon';
      } else if (status === 'PROCCESSED') {
        return 'bi-check-circle-fill green-icon';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill red-icon';
      } else {
        'bi-clock-fill blue-icon';
      }
    }
  }
}
</script>

<template>
  <div v-if="show" class="metric-card">
    <div v-if="date">
      <span class="lefted badge rounded-pill bg-primary"> {{ getDate(date) }}</span>
    </div>
    <div class="fw-bold">
      <i :class="`bi ${getStatusIcon(status)} mx-1`"></i> {{ $t(`controlReasonTypes.${reason}`) }}
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