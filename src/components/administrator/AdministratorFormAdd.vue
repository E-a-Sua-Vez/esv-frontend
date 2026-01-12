<script>
import AdministratorFormBasicFields from './AdministratorFormBasicFields.vue';
import AdministratorFormRelations from './AdministratorFormRelations.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'AdministratorFormAdd',
  components: {
    AdministratorFormBasicFields,
    AdministratorFormRelations,
    Warning,
  },
  props: {
    modelValue: { type: Object, required: true },
    commerces: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectCommerce: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    newAdministrator: {
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
    <AdministratorFormBasicFields
      v-model="newAdministrator"
      :toggles="toggles"
      :errors="{
        nameError: errors.nameError,
        emailError: errors.emailError,
      }"
      prefix="add-"
      :is-add="true"
    />
    <AdministratorFormRelations
      v-model="newAdministrator"
      :commerces="commerces"
      prefix="add-"
      :is-add="true"
      :on-select-commerce="onSelectCommerce"
      :on-delete-commerce="onDeleteCommerce"
      :show-commerce="showCommerce"
    />
    <div class="row g-1 errors" id="feedback" v-if="errors.errorsAdd && errors.errorsAdd.length > 0">
      <Warning>
        <template #message>
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
