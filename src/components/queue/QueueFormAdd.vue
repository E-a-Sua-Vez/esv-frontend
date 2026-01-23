<script>
import QueueFormBasicFields from './QueueFormBasicFields.vue';

export default {
  name: 'QueueFormAdd',
  components: {
    QueueFormBasicFields,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    commerce: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'type-changed'],
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
      :commerce="commerce"
      :errors="{
        nameError: errors.nameError,
        typeError: errors.typeError,
        limitError: errors.limitError,
        orderError: errors.orderError,
        timeError: errors.timeError,
      }"
      prefix="add-"
      @type-changed="$emit('type-changed', $event)"
    />
  </div>
</template>
