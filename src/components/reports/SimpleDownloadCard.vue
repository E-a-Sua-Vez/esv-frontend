<script>
import Popper from 'vue3-popper';

export default {
  name: 'SimpleDownloadCard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    canDownload: { type: Boolean, default: true },
    title: { type: String, default: 'No Title' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' },
  },
  data() {
    return {};
  },
  methods: {
    executeDownload() {
      try {
        this.$emit('download');
      } catch (error) {
      }
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="row metric-card h4">
      <div class="metric-card-title col-8 lefted">
        <i :class="`bi ${icon} ${iconStyleClass} centered p-1`"></i>
        <span class="p-1"> {{ title }} </span>
        <Popper v-if="showTooltip" :class="'dark'" arrow disable-click-away :content="description">
          <i class="bi bi-info-circle-fill h7 m-2"></i>
        </Popper>
      </div>
      <div class="col centered d-flex justify-content-end">
        <button
          :disabled="!canDownload === true"
          class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
          @click="executeDownload()"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  border-radius: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.12);
}

.metric-card-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  align-self: center;
  color: rgba(0, 0, 0, 0.75);
  letter-spacing: -0.01em;
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
