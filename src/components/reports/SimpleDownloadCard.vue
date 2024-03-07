<script>
import Popper from "vue3-popper";

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
    iconStyleClass: { type: String, default: '' }
  },
  data() {
    return { }
  },
  methods: {
    executeDownload() {
      this.$emit('download');
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card h4">
      <div class="metric-card-title col-8 lefted">
        <i :class="`bi ${icon} ${iconStyleClass} centered p-1`" ></i>
        <span class="p-1"> {{ title }} </span>
        <Popper
          v-if="showTooltip"
          :class="'dark'"
          arrow
          disableClickAway
          :content="description">
          <i class='bi bi-info-circle-fill h7 m-2'></i>
        </Popper>
      </div>
      <div class="col centered d-flex justify-content-end">
        <button
          :disabled="!canDownload === true"
          class="btn btn-md btn-size fw-bold download fw-bold m-2"
          @click="executeDownload()">
          <i class="bi bi-download"></i>
        </button>
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
  margin: .1rem;
  font-size: .9rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.download {
  padding: .2rem;
  padding-left: .5rem;
  padding-right: .5rem;
  font-size: 1rem;
  border: 1.2px solid var(--gris-default);
  border-radius: .5rem;
}
.cant-download {
  padding: .2rem;
  padding-left: .5rem;
  padding-right: .5rem;
  font-size: 1rem;
  border: 1.2px solid var(--rojo-warning);
  border-radius: .5rem;
}
</style>