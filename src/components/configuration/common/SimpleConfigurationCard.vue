<script>
import Popper from "vue3-popper";
import Toggle from '@vueform/toggle';
import { updateFeatureToggle } from '../../../application/services/feature-toggle';

export default {
  name: 'SimpleConfigurationCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    configuration: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' }
  },
  data() {
    return { }
  },
  methods: {
    async update (configuration) {
      try {
        await updateFeatureToggle(configuration.id, configuration);
      } catch (error) {  }
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card h4">
      <div class="metric-card-title col-8">
        <div class="col-10">
          <i :class="`bi ${icon} ${iconStyleClass} centered p-1`" ></i>
          <span class="p-1"> {{ $t(`configuration.${configuration.name}.title`) }} </span>
        </div>
        <div class="col-2 centered">
          <Popper
            v-if="showTooltip"
            :class="'dark'"
            arrow
            disableClickAway
            :content="$t(`configuration.${configuration.name}.description`)">
            <i class='bi bi-info-circle-fill h7 m-2'></i>
          </Popper>
        </div>
      </div>
      <div class="col d-flex justify-content-end centered">
        <Toggle
          v-model="configuration.active"
          :disabled="!canUpdate"
          @click="update(configuration)"
        />
      </div>
      <div id="conf-id-form" class="row -2 mb-g3">
        <div class="row configuration-details-container">
          <div class="col">
            <span class="badge rounded-pill bg-primary metric-keyword-tag mx-1 fw-bold">{{ configuration.type }} </span>
            <span class="badge rounded-pill bg-secondary metric-keyword-tag mx-1 fw-bold">{{ configuration.id }} </span>
          </div>
        </div>
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
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.configuration-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
</style>