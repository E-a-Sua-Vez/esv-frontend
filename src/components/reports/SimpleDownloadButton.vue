<script>
import Popper from 'vue3-popper';

export default {
  name: 'SimpleDownloadButton',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    canDownload: { type: Boolean, default: true },
    title: { type: String, default: undefined },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
  },
  data() {
    return {};
  },
  methods: {
    executeDownload() {
      this.$emit('download');
    },
  },
};
</script>

<template>
  <div v-if="show" class="col lefted">
    <button
      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
      @click="executeDownload()"
      :disabled="!canDownload === true"
    >
      <i class="bi bi-download"></i> {{ title }}
    </button>
    <Popper v-if="showTooltip" :class="'dark'" arrow disable-click-away :content="description">
      <i class="bi bi-info-circle-fill h7 m-1"></i>
    </Popper>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0rem 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  margin: 0.1rem;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.download {
  padding: 0.2rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  font-size: 1rem;
  border: 1.2px solid var(--gris-default);
  border-radius: 0.5rem;
}
.cant-download {
  padding: 0.2rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  font-size: 1rem;
  border: 1.2px solid var(--rojo-warning);
  border-radius: 0.5rem;
}
</style>
