<script>
export default {
  name: 'AreYouSure',
  props: {
    show: { type: Boolean, default: false },
    yesDisabled: { type: Boolean, default: false },
    noDisabled: { type: Boolean, default: false },
  },
  data() {
    return {
      yesClicked: false,
    };
  },
  methods: {
    actionYes() {
      this.yesClicked = true;
      this.$emit('actionYes');
    },
    actionNo() {
      this.$emit('actionNo');
    },
  },
};
</script>

<template>
  <div>
    <div class="question-card m-1 mt-2 p-2 mx-2" id="sure" v-if="show">
      <div class="text-label">
        {{ $t('sureAction') }}
      </div>
      <div class="confirmation-buttons">
        <button
          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-1 px-3 mx-1"
          @click="actionYes()"
          :disabled="yesDisabled"
        >
          {{ $t('yes') }} <i class="bi bi-check2-circle"></i>
        </button>
        <button
          class="btn btn-sm btn-size fw-bold btn-danger rounded-pill mt-1 px-3 mx-1"
          @click="actionNo()"
          :disabled="noDisabled"
        >
          {{ $t('no') }} <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  font-size: 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
  line-height: 1rem;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
  width: 100%;
}

.text-label {
  text-align: center;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.75rem;
}

.confirmation-buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.confirmation-buttons .btn {
  flex: 0 0 auto;
  min-width: 80px;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .confirmation-buttons {
    flex-direction: column;
    gap: 0.25rem;
  }

  .confirmation-buttons .btn {
    width: 100%;
  }
}
</style>
