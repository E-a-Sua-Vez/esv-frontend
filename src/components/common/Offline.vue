<script>
export default {
  name: 'Offline',
  props: {
    show: { type: Boolean, default: false },
    canReaload: { type: Boolean, default: false },
    realoadUrl: { type: String },
  },
  data() {
    return {
      onLine: navigator.onLine,
      intervalId: null,
      userDismissed: false,
    };
  },
  mounted() {
    // Set up interval to check connection status
    this.intervalId = setInterval(() => {
      this.onLine = navigator.onLine;
    }, 4000);

    // Also listen to online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  },
  beforeUnmount() {
    // Clean up interval and event listeners
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  },
  methods: {
    refresh() {
      this.$router.go();
    },
    close() {
      this.userDismissed = true;
    },
    handleOnline() {
      this.onLine = true;
      this.userDismissed = false; // Reset dismissal when connection is restored
    },
    handleOffline() {
      this.onLine = false;
      this.userDismissed = false; // Reset dismissal to show new offline message
    },
  },
};
</script>

<template>
  <div v-if="(show || !onLine) && !onLine && !userDismissed">
    <div aria-live="polite" aria-atomic="true">
      <div class="toast-container top-0 start-50 translate-middle-x p-3">
        <div class="toast d-flex" role="alert">
          <div class="toast-body alert-error-container">
            <div class="row">
              <div class="col-2 alert-error">
                <h4><i class="bi bi-cloud-slash"></i></h4>
              </div>
              <div class="col-8 alert-error">
                {{ $t('lostConnection') }}
              </div>
              <div class="col-2 alert-error">
                <button
                  type="button"
                  class="btn-close"
                  data-bs-dismiss="toast"
                  aria-label="Close"
                  @click="close()"
                ></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-error-container {
  color: #842029;
  background-color: #f8d7da;
  opacity: 0.6;
}
.alert-error {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 0.9rem;
  text-align: center;
}
.refresh {
  color: var(--color-text);
  margin-top: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}
</style>
