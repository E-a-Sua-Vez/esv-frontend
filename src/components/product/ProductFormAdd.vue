<script>
import ProductFormBasicFields from './ProductFormBasicFields.vue';
import ProductFormLevels from './ProductFormLevels.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'ProductFormAdd',
  components: {
    ProductFormBasicFields,
    ProductFormLevels,
    Warning,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    measureTypes: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    maxOrder: { type: Number, default: 1 },
  },
  emits: ['update:modelValue'],
  computed: {
    product: {
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
    <ProductFormBasicFields
      v-model="product"
      :types="types"
      :measure-types="measureTypes"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
        measureTypeError: errors.measureTypeError,
      }"
      prefix="add-"
    />
    <ProductFormLevels
      v-model="product"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        actualLevelError: errors.actualLevelError,
        optimumLevelError: errors.optimumLevelError,
        replacementLevelError: errors.replacementLevelError,
        maximumLevelError: errors.maximumLevelError,
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

