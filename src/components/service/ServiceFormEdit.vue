<script>
import ServiceFormBasicFields from './ServiceFormBasicFields.vue';
import ServiceFormDetails from './ServiceFormDetails.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'ServiceFormEdit',
  components: {
    ServiceFormBasicFields,
    ServiceFormDetails,
    Warning,
  },
  props: {
    service: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    servicesLength: { type: Number, default: 0 },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <ServiceFormBasicFields
      :model-value="service"
      :types="types"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        nameError: false,
        tagError: false,
        typeError: false,
        orderError: errors.orderUpdateError,
      }"
      prefix="update-"
    />
    <ServiceFormDetails
      :model-value="service"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        shortDescriptionError: errors.shortDescriptionUpdateError,
        estimatedTimeError: errors.estimatedTimeUpdateError,
        blockTimeError: errors.blockTimeUpdateError,
      }"
      prefix="update-"
    />
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
.service-details-container {
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
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>
