<script>
import CommerceFormBasicFields from './CommerceFormBasicFields.vue';
import CommerceFormLocation from './CommerceFormLocation.vue';
import CommerceFormContact from './CommerceFormContact.vue';
import CommerceFormService from './CommerceFormService.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'CommerceFormEdit',
  components: {
    CommerceFormBasicFields,
    CommerceFormLocation,
    CommerceFormContact,
    CommerceFormService,
    Warning,
  },
  props: {
    commerce: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    locale: { type: String, default: 'es' },
    businessId: { type: String, default: '' },
    businessLogo: { type: String, default: '' },
    onInitializedSpecificCalendar: { type: Function, default: null },
    onInitializedPersonalizedHours: { type: Function, default: null },
  },
  emits: ['update:commerce'],
  computed: {
    localCommerce: {
      get() {
        return this.commerce;
      },
      set(value) {
        this.$emit('update:commerce', value);
      },
    },
  },
  methods: {
    async copyIdToClipboard(id) {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <CommerceFormBasicFields
      v-model="localCommerce"
      :categories="categories"
      :toggles="toggles"
      :is-add="false"
      :business-id="businessId || localCommerce.businessId"
      :business-logo="businessLogo"
      :errors="{
        nameError: false,
        keyNameError: false,
        emailError: false,
        tagError: errors.tagUpdateError,
        categoryError: false,
      }"
      prefix="update-"
    />
    <CommerceFormLocation
      v-model="localCommerce"
      :errors="{ addressError: errors.addressAddError }"
      :toggles="toggles"
      :is-add="false"
      prefix="update-"
    />
    <CommerceFormContact
      v-model="localCommerce"
      :errors="{
        phoneError: errors.phoneUpdateError,
        urlError: errors.urlUpdateError,
      }"
      :toggles="toggles"
      :is-add="false"
      prefix="update-"
    />
    <CommerceFormService
      v-model="localCommerce"
      :toggles="toggles"
      :locale="locale"
      :is-add="false"
      prefix="update-"
      :on-initialized-specific-calendar="onInitializedSpecificCalendar"
      :on-initialized-personalized-hours="onInitializedPersonalizedHours"
    />
    <div id="commerce-id-form" class="row -2 mb-g3">
      <div class="row commerce-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ commerce.id }}</span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard(commerce.id)"
            :title="$t('copy') || 'Copiar Id'"
          >
            <i class="bi bi-clipboard"></i>
          </button>
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
.commerce-details-container {
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

.btn-copy-id {
  font-size: 0.8rem;
  color: var(--gris-default);
  text-decoration: none;
}

.btn-copy-id:hover {
  color: var(--primary-color, #000);
  text-decoration: none;
}
</style>
