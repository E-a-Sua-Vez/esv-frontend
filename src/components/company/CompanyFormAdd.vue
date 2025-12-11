<script>
import CompanyFormBasicFields from './CompanyFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'CompanyFormAdd',
  components: {
    CompanyFormBasicFields,
    Warning,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    maxOrder: { type: Number, default: 1 },
  },
  emits: ['update:modelValue'],
  computed: {
    company: {
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
    <CompanyFormBasicFields
      v-model="company"
      :types="types"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
        orderError: errors.orderError,
      }"
      :max-order="maxOrder"
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

