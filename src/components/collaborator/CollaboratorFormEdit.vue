<script>
import CollaboratorFormBasicFields from './CollaboratorFormBasicFields.vue';
import CollaboratorFormRelations from './CollaboratorFormRelations.vue';

export default {
  name: 'CollaboratorFormEdit',
  components: {
    CollaboratorFormBasicFields,
    CollaboratorFormRelations,
  },
  props: {
    collaborator: { type: Object, required: true },
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
  emits: ['update:collaborator'],
  computed: {
    localCollaborator: {
      get() {
        return this.collaborator;
      },
      set(value) {
        this.$emit('update:collaborator', value);
      },
    },
  },
};
</script>

<template>
  <div class="collaborator-form-edit">
    <CollaboratorFormBasicFields
      v-model="localCollaborator"
      :types="types"
      :modules="modules"
      :toggles="toggles"
      :errors="errors"
      prefix="update-"
      :is-add="false"
    />
    <CollaboratorFormRelations
      v-model="localCollaborator"
      :commerces="commerces"
      :services="services"
      :toggles="toggles"
      prefix="update-"
      :is-add="false"
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
.collaborator-form-edit {
  width: 100%;
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
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>

