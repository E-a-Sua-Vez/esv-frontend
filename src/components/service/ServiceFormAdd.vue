<script>
import ServiceFormBasicFields from './ServiceFormBasicFields.vue';
import ServiceFormDetails from './ServiceFormDetails.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'ServiceFormAdd',
  components: {
    ServiceFormBasicFields,
    ServiceFormDetails,
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
    newService: {
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
    <ServiceFormBasicFields
      v-model="newService"
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
    <ServiceFormDetails
      v-model="newService"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        shortDescriptionError: errors.shortDescriptionAddError,
        estimatedTimeError: errors.estimatedTimeAddError,
        blockTimeError: errors.blockTimeAddError,
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
