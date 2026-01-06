<script>
import CommerceFormBasicFields from './CommerceFormBasicFields.vue';
import CommerceFormLocation from './CommerceFormLocation.vue';
import CommerceFormContact from './CommerceFormContact.vue';
import CommerceFormService from './CommerceFormService.vue';
import Warning from '../common/Warning.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CommerceFormAdd',
  components: {
    CommerceFormBasicFields,
    CommerceFormLocation,
    CommerceFormContact,
    CommerceFormService,
    Warning,
    Popper,
  },
  props: {
    modelValue: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    locale: { type: String, default: 'es' },
    businessId: { type: String, default: '' },
    businessLogo: { type: String, default: '' },
    onInitializedSpecificCalendar: { type: Function, default: null },
    onInitializedPersonalizedHours: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    newCommerce: {
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
  <div id="add-commerce" class="result-card mb-4" v-if="toggles['commerces.admin.add']">
    <div v-if="true">
      <CommerceFormBasicFields
        v-model="newCommerce"
        :categories="categories"
        :toggles="toggles"
        :is-add="true"
        :business-id="businessId"
        :business-logo="businessLogo"
        :errors="{
          nameError: errors.nameError,
          keyNameError: errors.keyNameError,
          emailError: errors.emailError,
          tagError: errors.tagAddError,
          categoryError: errors.categoryAddError,
        }"
        prefix="add-"
      />
      <CommerceFormLocation
        v-model="newCommerce"
        :errors="{ addressError: errors.addressAddError }"
        :toggles="toggles"
        :is-add="true"
        prefix="add-"
      />
      <CommerceFormContact
        v-model="newCommerce"
        :errors="{
          phoneError: errors.phoneAddError,
          urlError: errors.urlAddError,
        }"
        :toggles="toggles"
        :is-add="true"
        prefix="add-"
      />
      <CommerceFormService
        v-model="newCommerce"
        :toggles="toggles"
        :locale="locale"
        :is-add="true"
        prefix="add-"
        :on-initialized-specific-calendar="onInitializedSpecificCalendar"
        :on-initialized-personalized-hours="onInitializedPersonalizedHours"
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
