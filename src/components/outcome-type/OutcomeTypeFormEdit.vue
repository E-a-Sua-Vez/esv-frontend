<script>
import OutcomeTypeFormBasicFields from './OutcomeTypeFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'OutcomeTypeFormEdit',
  components: {
    OutcomeTypeFormBasicFields,
    Warning,
  },
  props: {
    outcomeType: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:outcomeType'],
  computed: {
    localOutcomeType: {
      get() {
        return this.outcomeType;
      },
      set(value) {
        this.$emit('update:outcomeType', value);
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
    <OutcomeTypeFormBasicFields
      v-model="localOutcomeType"
      :types="types"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        tagError: errors.tagError,
        typeError: false,
      }"
      prefix="update-"
    />
    <div id="outcome-type-id-form" class="row -2 mb-g3">
      <div class="row outcome-type-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ outcomeType.id }}</span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard(outcomeType.id)"
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
.outcome-type-details-container {
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
