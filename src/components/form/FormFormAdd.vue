<script>
import FormFormBasicFields from './FormFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'FormFormAdd',
  components: {
    FormFormBasicFields,
    Warning,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    queues: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    showService: { type: Function, default: () => {} },
    selectService: { type: Function, default: () => {} },
    deleteService: { type: Function, default: () => {} },
    selectedService: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'update:selectedService', 'selectType'],
  computed: {
    form: {
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
    <FormFormBasicFields
      v-model="form"
      :types="types"
      :queues="queues"
      :services="services"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        typeError: errors.typeError,
      }"
      :show-service="showService"
      :select-service="selectService"
      :delete-service="deleteService"
      :selected-service="selectedService"
      @update:selectedService="$emit('update:selectedService', $event)"
      @selectType="$emit('selectType', $event)"
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
}

.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>

