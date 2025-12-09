<script>
import QueueFormBasicFields from './QueueFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'QueueFormEdit',
  components: {
    QueueFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    queue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <QueueFormBasicFields
      :model-value="queue"
      :types="types"
      :toggles="toggles"
      :errors="errors"
      :is-add="false"
      prefix="update-"
    />
    <div
      class="row g-1 errors"
      id="feedback"
      v-if="errors.errorsUpdate && errors.errorsUpdate.length > 0"
    >
      <Warning>
        <template v-slot:message>
          <li v-for="(error, index) in errors.errorsUpdate" :key="index">
            {{ $t(error) }}
          </li>
        </template>
      </Warning>
    </div>
  </div>
</template>

<style scoped>
.errors {
  font-size: small;
  color: var(--rojo-warning);
}

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>
