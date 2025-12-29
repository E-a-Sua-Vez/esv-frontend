<script>
import PatientHistoryItemFormBasicFields from './PatientHistoryItemFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'PatientHistoryItemFormEdit',
  components: { PatientHistoryItemFormBasicFields, Warning },
  props: {
    item: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:item'],
  computed: {
    localItem: {
      get() {
        return this.item;
      },
      set(value) {
        this.$emit('update:item', value);
      },
    },
  },
};
</script>

<template>
  <div>
    <PatientHistoryItemFormBasicFields
      v-model="localItem"
      :types="types"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
        orderError: errors.orderUpdateError,
      }"
      prefix="update-"
    />
    <div id="item-id-form" class="row -2 mb-g3">
      <div class="row item-details-container">
        <div class="col text-center">
          <span><strong>Id:</strong> {{ item.id }}</span>
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
.item-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.errors {
  margin-top: 0.5rem;
}
</style>
