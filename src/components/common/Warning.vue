<script>
export default {
  name: 'Message',
  props: {
    icon: { type: String, default: 'bi bi-exclamation-circle' },
    type: { type: String, default: 'normal' },
    closable: { type: Boolean, default: false },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div
    :class="`message {{ type }}`"
    role="alert"
    class="alert-error alert alert-danger alert-dismissible"
  >
    <div class="row g-2">
      <div class="col-2 h4">
        <i :class="`bi ${icon}`"></i>
      </div>
      <button
        v-if="closable"
        id="close-alert"
        type="button"
        class="btn btn-sm btn-close"
        data-bs-dismiss="alert"
        aria-label="Close"
      ></button>
      <div class="col-9">
        <slot name="message"> Warning </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  margin-top: 0.5rem;
  background-color: var(--color-background);
  padding: 0.8rem;
  border-radius: 1rem;
  font-weight: 300;
  border: 0.5px solid var(--rojo-warning);
  color: var(--rojo-warning);
  line-height: 1rem;
  font-size: 0.8rem;
}
</style>
