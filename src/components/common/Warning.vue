<script>
export default {
  name: 'Message',
  props: {
    icon: { type: String, default: 'bi bi-exclamation-circle' },
    type: { type: String, default: 'normal' },
  },
  data() {
    return {}
  }
}
</script>

<template>
  <div :class="`message {{ type }}`">
    <div class="row g-2">
      <div class="col-2 h4">
        <i :class="`bi ${icon}`"></i>
      </div>
      <div class="col-10">
        <slot name="message"> Warning </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  margin-top: .5rem;
  background-color: var(--color-background);
  padding: .8rem;
  border-radius: 1rem;
  font-weight: 300;
  border: .5px solid var(--rojo-warning);
  color: var(--rojo-warning);
  line-height: 1rem;
  font-size: .8rem;
}
</style>