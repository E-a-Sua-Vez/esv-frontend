<template>
  <div class="pdf-template-selector">
    <label v-if="label" class="form-label">
      <i class="bi bi-file-earmark-pdf me-1"></i>
      {{ label }}
    </label>

    <div class="selector-wrapper">
      <!-- Opción: Usar template por defecto -->
      <div class="form-check mb-2">
        <input
          class="form-check-input"
          type="radio"
          :id="`default-template-${uniqueId}`"
          :value="null"
          v-model="selectedTemplate"
          @change="emitChange"
        />
        <label class="form-check-label" :for="`default-template-${uniqueId}`">
          <i class="bi bi-check-circle me-1"></i>
          {{ t('pdfTemplates.selector.useDefault') }}
        </label>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="template-loading">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">{{ t('pdfTemplates.selector.loading') }}</span>
        </div>
        {{ t('pdfTemplates.selector.loading') }}
      </div>

      <!-- Lista de templates disponibles -->
      <div v-else-if="availableTemplates.length > 0" class="templates-list">
        <div
          v-for="template in availableTemplates"
          :key="template.id"
          class="form-check template-option"
          :class="{ selected: selectedTemplate === template.id }"
        >
          <input
            class="form-check-input"
            type="radio"
            :id="`template-${template.id}-${uniqueId}`"
            :value="template.id"
            v-model="selectedTemplate"
            @change="emitChange"
          />
          <label class="form-check-label" :for="`template-${template.id}-${uniqueId}`">
            <div class="template-info">
              <div class="template-name">
                <i class="bi bi-file-text me-1"></i>
                {{ template.name }}
              </div>
              <div v-if="template.description" class="template-description">
                {{ template.description }}
              </div>
              <div class="template-meta">
                <span class="badge bg-secondary me-1">{{ template.pageSize || 'A4' }}</span>
                <span v-if="template.isDefault" class="badge bg-success">
                  <i class="bi bi-star-fill me-1"></i>
                  {{ t('pdfTemplates.isDefault') }}
                </span>
                <span v-if="template.scope === 'GLOBAL'" class="badge bg-info">Global</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- Sin templates disponibles -->
      <div v-else class="no-templates-message">
        <i class="bi bi-info-circle me-2"></i>
        {{ t('pdfTemplates.selector.noTemplates') }}
      </div>
    </div>

    <!-- Botón para vista previa (opcional) -->
    <div v-if="selectedTemplate && showPreviewButton" class="mt-2">
      <button type="button" class="btn btn-sm btn-outline-primary" @click="previewTemplate">
        <i class="bi bi-eye me-1"></i>
        {{ t('pdfTemplates.preview') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { pdfTemplateService } from '@/application/services/pdf-template';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: [Number, String, null],
    default: null,
  },
  documentType: {
    type: String,
    required: true,
    validator: value => ['prescription', 'exam_order', 'reference'].includes(value),
  },
  commerceId: {
    type: [Number, String],
    default: null,
  },
  label: {
    type: String,
    default: null,
  },
  showPreviewButton: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'preview']);

// Estado interno
const loading = ref(false);
const availableTemplates = ref([]);
const selectedTemplate = ref(props.modelValue);
const uniqueId = ref(`selector-${Math.random().toString(36).substr(2, 9)}`);

// Cargar templates disponibles
const loadTemplates = async () => {
  try {
    loading.value = true;
    const response = await pdfTemplateService.listTemplates(
      props.documentType,
      props.commerceId,
      null // scope: null = todos (GLOBAL + COMMERCE)
    );

    availableTemplates.value = response.data || [];

    // Si hay un template por defecto y no hay selección, pre-seleccionarlo
    if (!selectedTemplate.value) {
      const defaultTemplate = availableTemplates.value.find(t => t.isDefault);
      if (defaultTemplate) {
        selectedTemplate.value = defaultTemplate.id;
        emitChange();
      }
    }
  } catch (error) {
    console.error('Error loading PDF templates:', error);
    availableTemplates.value = [];
  } finally {
    loading.value = false;
  }
};

// Emitir cambio al componente padre
const emitChange = () => {
  emit('update:modelValue', selectedTemplate.value);
};

// Vista previa del template
const previewTemplate = () => {
  if (selectedTemplate.value) {
    emit('preview', selectedTemplate.value);
  }
};

// Watcher para cambios externos
watch(
  () => props.modelValue,
  newValue => {
    selectedTemplate.value = newValue;
  },
);

// Watcher para recargar si cambia el commerce o documentType
watch([() => props.commerceId, () => props.documentType], () => {
  loadTemplates();
});

// Cargar al montar
onMounted(() => {
  loadTemplates();
});
</script>

<style scoped>
.pdf-template-selector {
  margin-bottom: 0;
}

.form-label {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text, #2c3e50);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
}

.selector-wrapper {
  border: 1px solid #e0e0e0;
  border-radius: 0.75rem;
  padding: 1rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.form-check {
  padding-left: 1.75rem;
}

.form-check-input {
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.125rem;
  cursor: pointer;
  border: 2px solid #cbd5e0;
  transition: all 0.2s ease;
}

.form-check-input:checked {
  background-color: var(--azul-turno, #4a90e2);
  border-color: var(--azul-turno, #4a90e2);
}

.form-check-input:focus {
  border-color: var(--azul-turno, #4a90e2);
  box-shadow: 0 0 0 0.2rem rgba(74, 144, 226, 0.15);
}

.form-check-label {
  font-size: 0.9375rem;
  color: #2c3e50;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
}

.template-loading {
  display: flex;
  align-items: center;
  padding: 0.875rem;
  color: #718096;
  font-size: 0.9375rem;
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-top: 0.5rem;
}

.template-option {
  border: 2px solid #e2e8f0;
  border-radius: 0.625rem;
  padding: 0.875rem;
  background: #fff;
  transition: all 0.2s ease;
  cursor: pointer;
}

.template-option:hover {
  border-color: var(--azul-turno, #4a90e2);
  box-shadow: 0 2px 6px rgba(74, 144, 226, 0.12);
  transform: translateY(-1px);
}

.template-option.selected {
  border-color: var(--azul-turno, #4a90e2);
  background: rgba(74, 144, 226, 0.04);
}

.template-info {
  margin-left: 0.5rem;
}

.template-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: #2c3e50;
  margin-bottom: 0.375rem;
  line-height: 0.9rem;
}

.template-description {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.template-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.template-meta .badge {
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
}

.no-templates-message {
  display: flex;
  align-items: center;
  padding: 0.875rem 1rem;
  color: #975a16;
  background: #fef5e7;
  border: 1px solid #f9e79f;
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  font-weight: 500;
}

.no-templates-message i {
  font-size: 1.125rem;
  margin-right: 0.5rem;
}
</style>
