<script>
import PatientHistoryItemFormBasicFields from './PatientHistoryItemFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'PatientHistoryItemFormAdd',
  components: { PatientHistoryItemFormBasicFields, Warning },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    item: {
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
  <div class="form-fields-container">
    <PatientHistoryItemFormBasicFields
      v-model="item"
      :types="types"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
        orderError: errors.orderAddError,
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
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.2rem;
}

.errors {
  margin-top: 0.5rem;
}
</style>
