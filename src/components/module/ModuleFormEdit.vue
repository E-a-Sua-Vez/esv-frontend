<script>
import ModuleFormBasicFields from './ModuleFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'ModuleFormEdit',
  components: {
    ModuleFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    module: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
};
</script>

<template>
  <div class="detailed-data" :class="{ show: true }">
    <ModuleFormBasicFields
      :model-value="module"
      :toggles="toggles"
      :errors="errors"
      :is-add="false"
    />
    <div class="module-details-container">
      <span><strong>Id:</strong> {{ module.id }}</span>
    </div>
  </div>
</template>

<style scoped>
.detailed-data {
  max-height: 0px;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
  padding: 0;
}

.detailed-data.show {
  max-height: 1500px;
  padding: 0.625rem;
  overflow-y: auto;
}

.module-details-container {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  color: #6c757d;
}
</style>

