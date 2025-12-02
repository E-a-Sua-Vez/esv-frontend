<script>
import CollaboratorFormBasicFields from './CollaboratorFormBasicFields.vue';
import CollaboratorFormRelations from './CollaboratorFormRelations.vue';

export default {
  name: 'CollaboratorFormAdd',
  components: {
    CollaboratorFormBasicFields,
    CollaboratorFormRelations,
  },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    commerces: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectCommerce: { type: Function, default: null },
    onSelectService: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
    showService: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    newCollaborator: {
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
  <div class="collaborator-form-add">
    <CollaboratorFormBasicFields
      v-model="newCollaborator"
      :types="types"
      :modules="modules"
      :toggles="toggles"
      :errors="errors"
      prefix="add-"
      :is-add="true"
    />
    <CollaboratorFormRelations
      v-model="newCollaborator"
      :commerces="commerces"
      :services="services"
      :toggles="toggles"
      prefix="add-"
      :is-add="true"
      :on-select-commerce="onSelectCommerce"
      :on-select-service="onSelectService"
      :on-delete-commerce="onDeleteCommerce"
      :on-delete-service="onDeleteService"
      :show-commerce="showCommerce"
      :show-service="showService"
    />
  </div>
</template>

<style scoped>
.collaborator-form-add {
  width: 100%;
}
</style>


