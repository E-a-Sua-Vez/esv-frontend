<template>
  <div class="variables-picker">
    <div class="picker-header">
      <h6 class="picker-title">
        <i class="bi bi-code-square"></i>
        {{ t('pdfTemplates.canvasEditor.variables.title') }}
      </h6>
      <button
        v-if="collapsible"
        class="btn-collapse"
        @click="isCollapsed = !isCollapsed"
        type="button"
      >
        <i :class="isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up'"></i>
      </button>
    </div>

    <div v-show="!isCollapsed" class="picker-body">
      <div class="picker-intro">
        <p class="text-muted small mb-1">
          {{ t('pdfTemplates.canvasEditor.variables.insertTip') }}
        </p>
      </div>

      <!-- Buscador -->
      <div class="search-box mb-2">
        <i class="bi bi-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control form-control-sm"
          :placeholder="t('pdfTemplates.canvasEditor.variables.searchPlaceholder')"
        />
      </div>

      <!-- Variables por categorías -->
      <div class="variables-list">
        <div v-for="category in filteredCategories" :key="category.name" class="variable-category">
          <div class="category-header" @click="toggleCategory(category.name)">
            <i :class="category.icon"></i>
            <span class="category-name">{{ category.name }}</span>
            <i
              class="bi category-toggle"
              :class="expandedCategories.has(category.name) ? 'bi-chevron-up' : 'bi-chevron-down'"
            ></i>
          </div>

          <div v-show="expandedCategories.has(category.name)" class="category-variables">
            <div
              v-for="variable in category.variables"
              :key="variable.name"
              class="variable-item"
              :draggable="true"
              @dragstart="onDragStart(variable, $event)"
              @click="onVariableClick(variable)"
            >
              <div class="variable-tag">
                <code class="variable-code">{{ variable.syntax }}</code>
              </div>
              <button
                class="btn-insert"
                @click.stop="insertVariable(variable)"
                :title="`${variable.label} - ${variable.description}`"
              >
                <i class="bi bi-plus-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Ayuda rápida -->
      <div class="quick-help mt-2">
        <i class="bi bi-info-circle me-1"></i>
        <small class="text-muted">
          <strong>{{ t('pdfTemplates.canvasEditor.variables.tip') }}</strong>
          {{ t('pdfTemplates.canvasEditor.variables.helpTip') }}
        </small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  documentType: {
    type: String,
    required: true,
    validator: value => ['prescription', 'exam_order', 'reference', 'all'].includes(value),
  },
  collapsible: {
    type: Boolean,
    default: true,
  },
  defaultCollapsed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['insert-variable', 'drag-variable']);

const searchQuery = ref('');
const isCollapsed = ref(props.defaultCollapsed);
const expandedCategories = ref(new Set()); // Todas las categorías cerradas por defecto

// Definición de variables por categoría - usando claves dinámicas i18n
const variablesData = computed(() => ({
  general: {
    name: t('pdfTemplates.canvasEditor.variables.categories.general'),
    icon: 'bi bi-globe',
    variables: [
      {
        name: 'currentDate',
        label: t('pdfTemplates.canvasEditor.variables.items.currentDate.label'),
        syntax: '{{currentDate}}',
        description: t('pdfTemplates.canvasEditor.variables.items.currentDate.description'),
        example: '29/12/2025',
      },
      {
        name: 'documentId',
        label: t('pdfTemplates.canvasEditor.variables.items.documentId.label'),
        syntax: '{{documentId}}',
        description: t('pdfTemplates.canvasEditor.variables.items.documentId.description'),
        example: 'RX-2025-001234',
      },
      {
        name: 'verificationUrl',
        label: t('pdfTemplates.canvasEditor.variables.items.verificationUrl.label'),
        syntax: '{{verificationUrl}}',
        description: t('pdfTemplates.canvasEditor.variables.items.verificationUrl.description'),
        example: 'https://verify.clinic.com/abc123',
      },
    ],
  },
  commerce: {
    name: t('pdfTemplates.canvasEditor.variables.categories.commerce'),
    icon: 'bi bi-building',
    variables: [
      {
        name: 'commerceName',
        label: t('pdfTemplates.canvasEditor.variables.items.commerceName.label'),
        syntax: '{{commerceName}}',
        description: t('pdfTemplates.canvasEditor.variables.items.commerceName.description'),
        example: 'Clínica São Paulo',
      },
      {
        name: 'commerceAddress',
        label: t('pdfTemplates.canvasEditor.variables.items.commerceAddress.label'),
        syntax: '{{commerceAddress}}',
        description: t('pdfTemplates.canvasEditor.variables.items.commerceAddress.description'),
        example: 'Av. Paulista, 1000 - São Paulo/SP',
      },
      {
        name: 'commercePhone',
        label: t('pdfTemplates.canvasEditor.variables.items.commercePhone.label'),
        syntax: '{{commercePhone}}',
        description: t('pdfTemplates.canvasEditor.variables.items.commercePhone.description'),
        example: '(11) 1234-5678',
      },
      {
        name: 'commerceEmail',
        label: t('pdfTemplates.canvasEditor.variables.items.commerceEmail.label'),
        syntax: '{{commerceEmail}}',
        description: t('pdfTemplates.canvasEditor.variables.items.commerceEmail.description'),
        example: 'contato@clinica.com.br',
      },
      {
        name: 'commerceCnpj',
        label: t('pdfTemplates.canvasEditor.variables.items.commerceCnpj.label'),
        syntax: '{{commerceCnpj}}',
        description: t('pdfTemplates.canvasEditor.variables.items.commerceCnpj.description'),
        example: '12.345.678/0001-99',
      },
    ],
  },
  doctor: {
    name: t('pdfTemplates.canvasEditor.variables.categories.doctor'),
    icon: 'bi bi-person-badge',
    variables: [
      {
        name: 'doctorName',
        label: t('pdfTemplates.canvasEditor.variables.items.doctorName.label'),
        syntax: '{{doctorName}}',
        description: t('pdfTemplates.canvasEditor.variables.items.doctorName.description'),
        example: 'Dr. João Silva',
      },
      {
        name: 'doctorLicense',
        label: t('pdfTemplates.canvasEditor.variables.items.doctorLicense.label'),
        syntax: '{{doctorLicense}}',
        description: t('pdfTemplates.canvasEditor.variables.items.doctorLicense.description'),
        example: 'CRM/SP 123456',
      },
      {
        name: 'doctorSpecialty',
        label: t('pdfTemplates.canvasEditor.variables.items.doctorSpecialty.label'),
        syntax: '{{doctorSpecialty}}',
        description: t('pdfTemplates.canvasEditor.variables.items.doctorSpecialty.description'),
        example: 'Cardiologia',
      },
    ],
  },
  patient: {
    name: t('pdfTemplates.canvasEditor.variables.categories.patient'),
    icon: 'bi bi-person',
    variables: [
      {
        name: 'patientName',
        label: t('pdfTemplates.canvasEditor.variables.items.patientName.label'),
        syntax: '{{patientName}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientName.description'),
        example: 'Maria Santos',
      },
      {
        name: 'patientIdNumber',
        label: t('pdfTemplates.canvasEditor.variables.items.patientIdNumber.label'),
        syntax: '{{patientIdNumber}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientIdNumber.description'),
        example: '123.456.789-00',
      },
      {
        name: 'patientAge',
        label: t('pdfTemplates.canvasEditor.variables.items.patientAge.label'),
        syntax: '{{patientAge}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientAge.description'),
        example: '45 años',
      },
      {
        name: 'patientGender',
        label: t('pdfTemplates.canvasEditor.variables.items.patientGender.label'),
        syntax: '{{patientGender}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientGender.description'),
        example: 'Feminino',
      },
      {
        name: 'patientPhone',
        label: t('pdfTemplates.canvasEditor.variables.items.patientPhone.label'),
        syntax: '{{patientPhone}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientPhone.description'),
        example: '(11) 98765-4321',
      },
      {
        name: 'patientInsurance',
        label: t('pdfTemplates.canvasEditor.variables.items.patientInsurance.label'),
        syntax: '{{patientInsurance}}',
        description: t('pdfTemplates.canvasEditor.variables.items.patientInsurance.description'),
        example: 'Unimed',
      },
    ],
  },
  prescription: {
    name: t('pdfTemplates.canvasEditor.variables.categories.prescription'),
    icon: 'bi bi-prescription2',
    documentTypes: ['prescription'],
    variables: [
      {
        name: 'diagnosis',
        label: t('pdfTemplates.canvasEditor.variables.items.diagnosis.label'),
        syntax: '{{diagnosis}}',
        description: t('pdfTemplates.canvasEditor.variables.items.diagnosis.description'),
        example: 'J00 - Rinofaringite aguda',
      },
      {
        name: 'prescriptionDate',
        label: t('pdfTemplates.canvasEditor.variables.items.prescriptionDate.label'),
        syntax: '{{prescriptionDate}}',
        description: t('pdfTemplates.canvasEditor.variables.items.prescriptionDate.description'),
        example: '29/12/2025',
      },
      {
        name: 'medications',
        label: t('pdfTemplates.canvasEditor.variables.items.medications.label'),
        syntax: '{{medications}}',
        description: t('pdfTemplates.canvasEditor.variables.items.medications.description'),
        example: 'Paracetamol 500mg...',
      },
    ],
  },
  examOrder: {
    name: t('pdfTemplates.canvasEditor.variables.categories.examOrder'),
    icon: 'bi bi-clipboard2-pulse',
    documentTypes: ['exam_order'],
    variables: [
      {
        name: 'examsList',
        label: t('pdfTemplates.canvasEditor.variables.items.examsList.label'),
        syntax: '{{examsList}}',
        description: t('pdfTemplates.canvasEditor.variables.items.examsList.description'),
        example: 'Hemograma completo, Glicemia...',
      },
      {
        name: 'clinicalJustification',
        label: t('pdfTemplates.canvasEditor.variables.items.clinicalJustification.label'),
        syntax: '{{clinicalJustification}}',
        description: t(
          'pdfTemplates.canvasEditor.variables.items.clinicalJustification.description',
        ),
        example: 'Investigação de anemia',
      },
      {
        name: 'preparationInstructions',
        label: t('pdfTemplates.canvasEditor.variables.items.preparationInstructions.label'),
        syntax: '{{preparationInstructions}}',
        description: t(
          'pdfTemplates.canvasEditor.variables.items.preparationInstructions.description',
        ),
        example: 'Jejum de 12 horas',
      },
    ],
  },
  reference: {
    name: t('pdfTemplates.canvasEditor.variables.categories.reference'),
    icon: 'bi bi-arrow-right-circle',
    documentTypes: ['reference'],
    variables: [
      {
        name: 'referenceReason',
        label: t('pdfTemplates.canvasEditor.variables.items.referenceReason.label'),
        syntax: '{{referenceReason}}',
        description: t('pdfTemplates.canvasEditor.variables.items.referenceReason.description'),
        example: 'Avaliação cardiológica',
      },
      {
        name: 'clinicalSummary',
        label: t('pdfTemplates.canvasEditor.variables.items.clinicalSummary.label'),
        syntax: '{{clinicalSummary}}',
        description: t('pdfTemplates.canvasEditor.variables.items.clinicalSummary.description'),
        example: 'Paciente com hipertensão...',
      },
      {
        name: 'specialty',
        label: t('pdfTemplates.canvasEditor.variables.items.specialty.label'),
        syntax: '{{specialty}}',
        description: t('pdfTemplates.canvasEditor.variables.items.specialty.description'),
        example: 'Cardiologia',
      },
      {
        name: 'specialistName',
        label: t('pdfTemplates.canvasEditor.variables.items.specialistName.label'),
        syntax: '{{specialistName}}',
        description: t('pdfTemplates.canvasEditor.variables.items.specialistName.description'),
        example: 'Dr. Pedro Costa',
      },
    ],
  },
}));

// Filtrar categorías según el tipo de documento
const filteredCategories = computed(() => {
  const categories = [];

  for (const [key, category] of Object.entries(variablesData.value)) {
    // Si la categoría tiene restricción por documento
    if (category.documentTypes) {
      if (props.documentType === 'all' || category.documentTypes.includes(props.documentType)) {
        categories.push(filterVariables(category));
      }
    } else {
      // Categorías generales siempre se muestran
      categories.push(filterVariables(category));
    }
  }

  return categories.filter(cat => cat.variables.length > 0);
});

// Filtrar variables por búsqueda
const filterVariables = category => {
  if (!searchQuery.value) {
    return category;
  }

  const query = searchQuery.value.toLowerCase();
  const filteredVariables = category.variables.filter(
    variable =>
      variable.label.toLowerCase().includes(query) ||
      variable.syntax.toLowerCase().includes(query) ||
      variable.description.toLowerCase().includes(query)
  );

  return {
    ...category,
    variables: filteredVariables,
  };
};

// Toggle categoría expandida/colapsada
const toggleCategory = categoryName => {
  if (expandedCategories.value.has(categoryName)) {
    expandedCategories.value.delete(categoryName);
  } else {
    expandedCategories.value.add(categoryName);
  }
};

// Drag & Drop
const onDragStart = (variable, event) => {
  event.dataTransfer.effectAllowed = 'copy';
  event.dataTransfer.setData('text/plain', variable.syntax);
  event.dataTransfer.setData('application/json', JSON.stringify(variable));

  emit('drag-variable', variable);
};

// Click en variable
const onVariableClick = variable => {
  // Seleccionar el texto para copiar fácilmente
};

// Insertar variable (botón +)
const insertVariable = variable => {
  emit('insert-variable', variable);
};

onMounted(() => {
  // Expandir categorías relevantes por defecto
  if (props.documentType === 'prescription') {
    expandedCategories.value.add(t('pdfTemplates.canvasEditor.variables.categories.prescription'));
  } else if (props.documentType === 'exam_order') {
    expandedCategories.value.add(t('pdfTemplates.canvasEditor.variables.categories.examOrder'));
  } else if (props.documentType === 'reference') {
    expandedCategories.value.add(t('pdfTemplates.canvasEditor.variables.categories.reference'));
  }
});
</script>

<style scoped>
.variables-picker {
  background: #fff;
  border: 1px solid var(--border-color, #dee2e6);
  border-radius: var(--border-radius-md, 0.5rem);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color, #dee2e6);
  background: #f8f9fa;
  border-radius: var(--border-radius-md, 0.5rem) var(--border-radius-md, 0.5rem) 0 0;
}

.picker-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text, #212529);
}

.picker-title i {
  color: var(--azul-turno, #007bff);
}

.btn-collapse {
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #6c757d;
  transition: color 0.2s;
}

.btn-collapse:hover {
  color: var(--azul-turno, #007bff);
}

.picker-body {
  padding: 0.75rem;
  max-height: 500px;
  overflow-y: auto;
}

.picker-intro {
  margin-bottom: 0.5rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 0.75rem;
  color: #6c757d;
  pointer-events: none;
}

.search-box input {
  padding-left: 2.25rem;
  border-radius: var(--border-radius-sm, 0.375rem);
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variable-category {
  border: 1px solid #e9ecef;
  border-radius: var(--border-radius-sm, 0.375rem);
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: #f8f9fa;
  cursor: pointer;
  transition: background 0.2s;
  user-select: none;
}

.category-header:hover {
  background: #e9ecef;
}

.category-header i:first-child {
  color: var(--azul-turno, #007bff);
  font-size: 0.875rem;
}

.category-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.8125rem;
  color: #495057;
}

.category-toggle {
  font-size: 0.75rem;
  color: #6c757d;
}

.category-variables {
  display: flex;
  flex-direction: column;
}

.variable-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-top: 1px solid #e9ecef;
  cursor: grab;
  transition: background 0.2s;
}

.variable-item:hover {
  background: #f8f9fa;
}

.variable-item:active {
  cursor: grabbing;
  opacity: 0.7;
}

.variable-tag {
  flex: 1;
}

.variable-code {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #e7f3ff;
  color: #0056b3;
  border: 1px solid #b3d9ff;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.btn-insert {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0.25rem;
  color: var(--azul-turno, #007bff);
  cursor: pointer;
  font-size: 1.125rem;
  transition: transform 0.2s, color 0.2s;
}

.btn-insert:hover {
  color: #0056b3;
  transform: scale(1.15);
}

.quick-help {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: var(--border-radius-sm, 0.375rem);
}

.quick-help i {
  color: #856404;
  margin-top: 0.125rem;
}

/* Scrollbar styling */
.picker-body::-webkit-scrollbar {
  width: 6px;
}

.picker-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.picker-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.picker-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
