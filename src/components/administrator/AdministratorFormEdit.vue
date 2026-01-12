<script>
import AdministratorFormBasicFields from './AdministratorFormBasicFields.vue';
import AdministratorFormRelations from './AdministratorFormRelations.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'AdministratorFormEdit',
  components: {
    AdministratorFormBasicFields,
    AdministratorFormRelations,
    Warning,
  },
  props: {
    administrator: { type: Object, required: true },
    commerces: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectCommerce: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
  },
  emits: ['update:administrator'],
  computed: {
    localAdministrator: {
      get() {
        return this.administrator;
      },
      set(value) {
        this.$emit('update:administrator', value);
      },
    },
  },
  methods: {
    async copyIdToClipboard() {
      if (!this.localAdministrator || !this.localAdministrator.id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.localAdministrator.id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = this.localAdministrator.id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // no-op: evitar romper la UI si falla el portapapeles
      }
    },
  },
};
</script>

<template>
  <div class="detailed-data transition-slow">
    <AdministratorFormBasicFields
      v-model="localAdministrator"
      :toggles="toggles"
      :errors="{ nameError: false, emailError: false }"
      prefix="update-"
      :is-add="false"
    />
    <AdministratorFormRelations
      v-model="localAdministrator"
      :commerces="commerces"
      prefix="update-"
      :is-add="false"
      :on-select-commerce="onSelectCommerce"
      :on-delete-commerce="onDeleteCommerce"
      :show-commerce="showCommerce"
    />
    <div
      v-if="localAdministrator && localAdministrator.id"
      id="administrator-id-form"
      class="row mt-2 mb-3"
    >
      <div class="row administrator-details-container">
        <div class="col">
          <span>
            <strong>Id:</strong>
            {{ localAdministrator.id }}
          </span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard"
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
        <template #message>
          <li v-for="(error, index) in errors.errorsUpdate" :key="index">
            {{ $t(error) }}
          </li>
        </template>
      </Warning>
    </div>
  </div>
</template>

<style scoped>
.administrator-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
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
