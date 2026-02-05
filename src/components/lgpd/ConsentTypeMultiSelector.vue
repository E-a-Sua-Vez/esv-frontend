<template>
  <div class="consent-type-multi-selector">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('lgpd.consent.admin.consentTypes') }}
        <span class="text-danger">*</span>
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('lgpd.consent.admin.consentTypeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <div style="flex: 1">
        <div class="d-flex justify-content-between align-items-center mb-2" style="gap: 0.5rem">
          <div style="display: flex; gap: 0.5rem">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary consent-selector-btn"
              @click="selectAll"
              :disabled="selectedTypes.length === availableTypes.length"
            >
              <i class="bi bi-check-square me-1"></i>
              {{ $t('lgpd.consent.admin.selectAll') }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary consent-selector-btn"
              @click="deselectAll"
              :disabled="selectedTypes.length === 0"
            >
              <i class="bi bi-square me-1"></i>
              {{ $t('lgpd.consent.admin.deselectAll') }}
            </button>
          </div>
          <span class="badge bg-info consent-selector-badge">
            {{ selectedTypes.length }} / {{ availableTypes.length }}
            {{ $t('lgpd.consent.admin.selected') }}
          </span>
        </div>
        <div class="consent-types-grid">
          <div v-for="type in availableTypes" :key="type" class="form-check consent-type-item">
            <input
              class="form-check-input"
              type="checkbox"
              :id="`type-${type}`"
              :value="type"
              v-model="selectedTypes"
              @change="updateSelection"
            />
            <label class="form-check-label" :for="`type-${type}`">
              {{ $t(`lgpd.consent.types.${type}`) }}
            </label>
          </div>
        </div>
        <div
          v-if="showError && selectedTypes.length === 0"
          class="text-danger consent-error-message"
        >
          <i class="bi bi-exclamation-circle me-1"></i>
          {{ $t('lgpd.consent.admin.validate.consentTypes') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Popper from 'vue3-popper';

export default {
  name: 'ConsentTypeMultiSelector',
  components: {
    Popper,
  },
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
    availableTypes: {
      type: Array,
      default: () => [
        'DATA_PROCESSING',
        'DATA_SHARING',
        'MARKETING',
        'RESEARCH',
        'THIRD_PARTY',
        'DATA_EXPORT',
        'TELEMEDICINE',
        'BIOMETRIC',
      ],
    },
    showError: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedTypes = ref([...props.modelValue]);

    watch(
      () => props.modelValue,
      newVal => {
        selectedTypes.value = [...newVal];
      },
    );

    const selectAll = () => {
      selectedTypes.value = [...props.availableTypes];
      updateSelection();
    };

    const deselectAll = () => {
      selectedTypes.value = [];
      updateSelection();
    };

    const updateSelection = () => {
      emit('update:modelValue', [...selectedTypes.value]);
    };

    return {
      selectedTypes,
      selectAll,
      deselectAll,
      updateSelection,
    };
  },
};
</script>

<style scoped>
.consent-type-multi-selector {
  display: flex;
  flex-direction: column;
}

/* Garantir que o label tenha o tamanho correto */
.consent-type-multi-selector :deep(.form-label-modern) {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 140px;
  max-width: 140px;
  flex-shrink: 0;
  padding-top: 0.5rem;
  line-height: 1.4;
  text-align: left !important;
  justify-content: flex-start;
  display: flex;
  align-items: center;
}

.consent-selector-btn {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.3rem 0.6rem;
  line-height: 1.4;
  border-radius: 5px;
  transition: all 0.2s ease;
}

.consent-selector-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.consent-selector-badge {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
}

.consent-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  background-color: rgba(255, 255, 255, 0.95);
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
}

.consent-type-item {
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.consent-type-item:hover {
  background-color: rgba(0, 194, 203, 0.05);
}

.consent-type-item .form-check-label {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
  cursor: pointer;
  margin-left: 0.5rem;
  margin-bottom: 0;
  line-height: 1.4;
  flex: 1;
}

.consent-type-item .form-check-input {
  cursor: pointer;
  margin: 0rem;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.consent-error-message {
  font-size: 0.7rem;
  font-weight: 500;
  margin-top: 0.5rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .consent-types-grid {
    grid-template-columns: 1fr;
  }

  .d-flex.justify-content-between {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }

  .consent-selector-badge {
    align-self: flex-end;
  }
}
</style>
