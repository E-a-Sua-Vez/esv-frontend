<script>
import ModuleFormBasicFields from './ModuleFormBasicFields.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'ModuleFormAdd',
  components: {
    ModuleFormBasicFields,
    Warning,
    Popper,
  },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    newModule: {
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
  <div
    id="add-module"
    class="result-card mb-4"
    v-if="toggles['modules.admin.add']"
  >
    <div v-if="true">
      <ModuleFormBasicFields
        v-model="newModule"
        :toggles="toggles"
        :is-add="true"
        :errors="{
          nameError: errors.nameError,
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
  </div>
</template>

<style scoped>
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>


