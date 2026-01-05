<template>
  <div class="consent-template-selector">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('lgpd.consent.admin.templateSelector') }}
        <Popper v-if="showHelp" hover>
          <i class="bi bi-question-circle text-muted ms-1 template-help-icon"></i>
          <template #content>
            <div class="template-help-content">
              {{ $t('lgpd.consent.admin.templateSelectorHelp') }}
            </div>
          </template>
        </Popper>
      </label>
      <div style="flex: 1">
        <select
          class="form-control-modern form-select-modern"
          v-model="selectedTemplate"
          @change="applyTemplate"
        >
          <option value="">{{ $t('lgpd.consent.admin.selectTemplate') }}</option>
          <option v-for="(template, type) in availableTemplates" :key="type" :value="type">
            {{ $t(`lgpd.consent.types.${type}`) }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="selectedPreset" class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('lgpd.consent.admin.preset') }}
      </label>
      <div style="flex: 1">
        <select
          class="form-control-modern form-select-modern"
          v-model="selectedPreset"
          @change="applyPreset"
        >
          <option value="">{{ $t('lgpd.consent.admin.selectPreset') }}</option>
          <option v-for="(preset, key) in presets" :key="key" :value="key">
            {{ preset.name }} - {{ preset.description }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Popper from 'vue3-popper';
import {
  CONSENT_TEMPLATES,
  CONSENT_PRESETS,
  getTemplateByType,
} from '../../data/consent-templates';

export default {
  name: 'ConsentTemplateSelector',
  components: {
    Popper,
  },
  props: {
    modelValue: {
      type: Object,
      default: () => ({
        templates: {
          whatsapp: '',
          formIntroText: '',
          fullTerms: '',
          dataDescription: '',
          legalBasis: '',
          retentionPeriod: '',
          privacyPolicyLink: '',
          revocationInstructions: '',
        },
      }),
    },
    commerce: {
      type: Object,
      default: () => ({}),
    },
    consentType: {
      type: String,
      default: '',
    },
    showHelp: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedTemplate = ref('');
    const selectedPreset = ref('');

    const availableTemplates = computed(() => {
      // Si hay un consentType específico, filtrar solo ese tipo
      if (props.consentType && CONSENT_TEMPLATES[props.consentType]) {
        return { [props.consentType]: CONSENT_TEMPLATES[props.consentType] };
      }
      return CONSENT_TEMPLATES;
    });
    const presets = computed(() => CONSENT_PRESETS);

    const getVariables = () => ({
      commerceName: props.commerce?.name || '[Nome do Estabelecimento]',
      commerceAddress: props.commerce?.address || '[Endereço]',
      commercePhone: props.commerce?.phone || '[Telefone]',
      commerceEmail: props.commerce?.email || '[E-mail]',
      privacyPolicyLink: props.modelValue?.templates?.privacyPolicyLink || '',
    });

    const applyTemplate = () => {
      if (!selectedTemplate.value) return;

      const variables = getVariables();
      const template = getTemplateByType(selectedTemplate.value, variables);

      if (template) {
        const updated = {
          ...props.modelValue,
          templates: {
            ...props.modelValue.templates,
            ...template,
          },
        };
        emit('update:modelValue', updated);
      }
    };

    const applyPreset = () => {
      // Presets serão usados para seleção múltipla de tipos
      // Esta funcionalidade será implementada no componente pai
      emit('preset-selected', selectedPreset.value);
    };

    return {
      selectedTemplate,
      selectedPreset,
      availableTemplates,
      presets,
      applyTemplate,
      applyPreset,
    };
  },
};
</script>

<style scoped>
.consent-template-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Garantir que o label tenha o tamanho correto */
.consent-template-selector :deep(.form-label-modern) {
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
  text-align: left;
}

/* Ícone de ajuda */
.template-help-icon {
  font-size: 0.7rem !important;
  vertical-align: middle;
  cursor: help;
}

/* Conteúdo do popper */
.template-help-content {
  padding: 0.5rem;
  max-width: 300px;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.7);
}

/* Garantir que o select tenha os estilos corretos */
.consent-template-selector :deep(.form-control-modern),
.consent-template-selector :deep(.form-select-modern) {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  min-height: 2.5rem;
}

.consent-template-selector :deep(.form-select-modern) {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.consent-template-selector :deep(.form-control-modern:focus),
.consent-template-selector :deep(.form-select-modern:focus) {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.consent-template-selector :deep(.form-control-modern:hover:not(:disabled)),
.consent-template-selector :deep(.form-select-modern:hover:not(:disabled)) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}
</style>
