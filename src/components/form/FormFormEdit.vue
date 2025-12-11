<script>
import FormFormBasicFields from './FormFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'FormFormEdit',
  components: {
    FormFormBasicFields,
    Warning,
  },
  props: {
    form: { type: Object, required: true },
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
  emits: ['update:form', 'update:selectedService', 'selectType'],
  computed: {
    localForm: {
      get() {
        return this.form;
      },
      set(value) {
        this.$emit('update:form', value);
      },
    },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <FormFormBasicFields
      v-model="localForm"
      :types="types"
      :queues="queues"
      :services="services"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        typeError: errors.typeError,
      }"
      :show-service="showService"
      :select-service="selectService"
      :delete-service="deleteService"
      :selected-service="selectedService"
      @update:selectedService="$emit('update:selectedService', $event)"
      @selectType="$emit('selectType', $event)"
      prefix="update-"
    />
    <div id="form-id-form" class="row -2 mb-g3">
      <div class="row form-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ form.id }}</span>
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
.form-details-container {
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

