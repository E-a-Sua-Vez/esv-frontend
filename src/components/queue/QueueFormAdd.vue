<script>
import QueueFormBasicFields from './QueueFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'QueueFormAdd',
  components: {
    QueueFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    newQueue: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
};
</script>

<template>
  <div>
    <QueueFormBasicFields
      v-model="newQueue"
      :types="types"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        nameError: errors.nameError,
        typeError: errors.typeError,
        limitError: errors.limitError,
        orderError: errors.orderError,
        timeError: errors.timeError,
      }"
      prefix="add-"
    />
    <div
      class="row g-1 errors"
      id="feedback"
      v-if="errors.errorsAdd && errors.errorsAdd.length > 0"
    >
      <Warning>
        <template v-slot:message>
          <li v-for="(error, index) in errors.errorsAdd" :key="index">
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
</style>
