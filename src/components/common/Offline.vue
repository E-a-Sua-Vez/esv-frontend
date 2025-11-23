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
    };
  },
  methods: {
    refresh() {
      this.$router.go();
    },
    close() {
      this.onLine = true;
    },
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        setInterval(() => {
          this.onLine = navigator.onLine;
        }, 4000);
      },
    },
  },
};
</script>

<template>
  <div v-if="show && !onLine">
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
