<script>
export default {
  name: 'NoDeviceAttentionNumber',
  props: {
    type: { type: String, default: 'primary' },
    number: { type: Number, default: 0 },
    name: { type: String, default: '' },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div class="justify-content-center">
    <span class="attention-name"> <i class="bi bi-people-fill"></i> {{ name }} </span>
    <div v-if="number" :class="'attention-number-primary'">
      {{ number }}
    </div>
  </div>
</template>

<style scoped>
.attention-name {
  background-color: var(--orange-no-device);
  width: 60%;
  padding: 0.2rem 1rem;
  margin: 0;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--color-background);
  border: 1.5px solid var(--orange-no-device);
}
.attention-number-primary {
  background-color: var(--color-background);
  margin: 0rem 0.5rem;
  padding: 1rem;
  border-radius: 1rem;
  font-weight: 900;
  font-size: 2.5rem;
  line-height: 2rem;
  color: var(--orange-no-device);
  border: 1.5px solid var(--orange-no-device);
}
</style>
