<script>
import ProductFormBasicFields from './ProductFormBasicFields.vue';
import ProductFormLevels from './ProductFormLevels.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'ProductFormEdit',
  components: {
    ProductFormBasicFields,
    ProductFormLevels,
    Warning,
  },
  props: {
    product: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    measureTypes: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:product'],
  computed: {
    localProduct: {
      get() {
        return this.product;
      },
      set(value) {
        this.$emit('update:product', value);
      },
    },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <ProductFormBasicFields
      v-model="localProduct"
      :types="types"
      :measure-types="measureTypes"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        nameError: false,
        tagError: errors.tagError,
        typeError: errors.typeError,
        measureTypeError: errors.measureTypeError,
      }"
      prefix="update-"
    />
    <ProductFormLevels
      v-model="localProduct"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        actualLevelError: errors.actualLevelError,
        optimumLevelError: errors.optimumLevelError,
        replacementLevelError: errors.replacementLevelError,
        maximumLevelError: errors.maximumLevelError,
        orderError: errors.orderError,
      }"
      :max-order="1000"
      prefix="update-"
    />
    <div id="product-id-form" class="row -2 mb-g3">
      <div class="row product-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ product.id }}</span>
        </div>
      </div>
    </div>
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
.product-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

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
  padding: 0.5rem;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>
