<script>
import ErrorReported from '../../application/events/ErrorReported';
import { createEvent } from '../../application/services/event';

export default {
  name: 'Alert',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: 'por favor reintenta.' },
    stack: { type: [String, Number] },
    errorMessage: { type: String, default: '' },
  },
  data() {
    return {
      reportedError: false,
      messageTitle: '',
      messageDetail: '',
    };
  },
  methods: {
    async reportError() {
      const body = { error: this.stack };
      const errorReported = new ErrorReported(new Date(), body);
      try {
        await createEvent(errorReported);
      } catch (error) {
        // Error is already handled in createEvent, but catch here to prevent unhandled promise rejection
        // Silently fail - error reporting is non-critical
      }
      this.reportedError = true;
    },
    alertMessage() {
      if (this.stack === 401) {
        this.messageTitle = this.$t('alert.message.4');
        this.messageDetail = this.$t('alert.message.5');
      } else if (this.stack === 302) {
        this.messageTitle = this.$t('alert.message.6');
        this.messageDetail = this.$t('alert.message.7');
      } else if (this.stack === 503) {
        this.messageTitle = this.$t('alert.message.8');
        this.messageDetail = this.$t('alert.message.9');
      } else if (this.stack === 404) {
        this.messageTitle = this.$t('alert.message.10');
        this.messageDetail = this.$t('alert.message.9');
      } else if (this.stack === 990 || this.stack === 409) {
        this.messageTitle = this.$t('alert.message.11');
        this.messageDetail = this.$t('alert.message.12');
      } else {
        this.messageTitle = this.$t('alert.message.1');
        this.messageDetail = this.$t('alert.message.2');
      }
    },
  },
  updated() {
    this.alertMessage();
  },
  watch: {
    stack: {
      immediate: true,
      deep: true,
      async handler() {
        this.alertMessage();
      },
    },
  },
};
</script>

<template>
  <div
    v-if="stack !== '' && !show"
    class="alert-error alert alert-danger alert-dismissible my-2"
    role="alert"
  >
    <div v-if="!reportedError">
      <strong>{{ messageTitle }} </strong>
      <span v-if="errorMessage">{{ errorMessage }}</span>
      <span v-else>{{ messageDetail }}</span>
      <a v-if="!reportedError" class="alert-link" @click="reportError()">
        {{ $t('alert.action') }}</a
      >
    </div>
    <div v-else>
      <strong>{{ $t('alert.message.3') }} </strong>
    </div>
    <button
      id="close-alert"
      type="button"
      class="btn-close"
      data-bs-dismiss="alert"
      aria-label="Close"
    >
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
</template>

<style scoped>
.alert-error {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
</style>
