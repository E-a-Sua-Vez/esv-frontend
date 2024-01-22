<script>
import Popper from "vue3-popper";
import { createEvent } from '../../../application/services/event';

export default {
  name: 'SimpleCard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    data: { type: [String, Number], default: 'No Data' },
    subdata: { type: [String, Number], default: undefined },
    title: { type: String, default: 'No Title' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: 'blue-icon' },
  },
  data() {
    return {
      reportedError: false
    }
  },
  methods: {
    reportError() {
      const body = { error: this.stack };
      const errorReported = new ErrorReported(new Date(), body);
      createEvent(errorReported);
      this.reportedError = true;
    },
    getData() {
      if (this.data !== undefined && this.data !== null && this.data !== '') {
        if (isNaN(this.data)) {
          return this.data;
        } else {
          if (Number.isInteger(this.data)) {
            return this.data;
          } else {
            return this.data.toFixed(2);
          }
        }
      } else {
        return 'No Data';
      }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="metric-card h4">
      <div class="metric-card-title centered">
        <span> {{ title }} </span>
      </div>
      <div class="centered">
        <i :class="`bi ${icon} ${iconStyleClass}`"></i>
        <span class="fw-bold px-2"> {{ getData() }}
          <span v-if="subdata !== undefined" class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ subdata }} </span>
        </span>
        <Popper
          v-if="showTooltip"
          :class="'dark'"
          arrow
          disableClickAway
          :content="description">
          <i class='bi bi-info-circle-fill h7'></i>
        </Popper>
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
  border: 1.5px solid var(--gris-default);
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
</style>