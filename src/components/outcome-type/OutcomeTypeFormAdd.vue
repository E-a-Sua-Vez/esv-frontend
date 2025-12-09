<script>
import OutcomeTypeFormBasicFields from './OutcomeTypeFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'OutcomeTypeFormAdd',
  components: {
    OutcomeTypeFormBasicFields,
    Warning,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    outcomeType: {
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
    <OutcomeTypeFormBasicFields
      v-model="outcomeType"
      :types="types"
      :toggles="toggles"
      :is-add="true"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
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
}

.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>
