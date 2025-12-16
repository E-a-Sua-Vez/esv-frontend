<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content modern-card">
      <div class="modal-header">
        <h5>
          <i class="bi bi-file-earmark-medical me-2"></i>
          {{ template ? 'Editar Template' : 'Nuevo Template' }}
        </h5>
        <button type="button" class="btn-close" @click="handleClose"></button>
      </div>

      <div class="modal-body">
        <div v-if="saving" class="text-center py-4">
          <Spinner />
        </div>

        <div v-else>
          <!-- Información básica -->
          <div class="form-field-modern">
            <label class="form-label-modern">
              <i class="bi bi-tag"></i>
              Código del Examen (LOINC) *
            </label>
            <input
              type="text"
              class="form-control-modern"
              v-model="formData.examCode"
              placeholder="Ej: 24356-8"
              required
            />
            <small class="form-text text-muted">Código LOINC del examen</small>
          </div>

          <div class="form-field-modern">
            <label class="form-label-modern">
              <i class="bi bi-file-text"></i>
              Nombre del Examen *
            </label>
            <input
              type="text"
              class="form-control-modern"
              v-model="formData.examName"
              placeholder="Ej: Hemograma Completo"
              required
            />
          </div>

          <div class="form-field-modern">
            <label class="form-label-modern">
              <i class="bi bi-list-ul"></i>
              Tipo de Examen
            </label>
            <select class="form-control-modern" v-model="formData.examType">
              <option value="">Seleccionar...</option>
              <option value="laboratory">Laboratorio</option>
              <option value="imaging">Imagenología</option>
              <option value="functional">Funcional</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <!-- Parámetros -->
          <div class="form-field-modern">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label-modern mb-0">
                <i class="bi bi-list-check"></i>
                Parámetros *
              </label>
              <button type="button" class="btn btn-sm btn-outline-primary" @click="addParameter">
                <i class="bi bi-plus-circle me-1"></i>
                Agregar Parámetro
              </button>
            </div>

            <div class="parameters-list">
              <div
                v-for="(param, index) in formData.parameters"
                :key="index"
                class="parameter-item modern-card"
              >
                <div class="parameter-item-header">
                  <span class="parameter-number">#{{ index + 1 }}</span>
                  <button
                    type="button"
                    class="btn btn-sm btn-link text-danger"
                    @click="removeParameter(index)"
                    :disabled="formData.parameters.length === 1"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>

                <div class="row g-2">
                  <div class="col-md-4">
                    <label class="form-label small">Nombre *</label>
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="param.name"
                      placeholder="Ej: Hemoglobina"
                      required
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small">Código LOINC</label>
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="param.code"
                      placeholder="Ej: 718-7"
                    />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label small">Unidad *</label>
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      v-model="param.unit"
                      placeholder="Ej: g/dL"
                      required
                    />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label small">Tipo *</label>
                    <select class="form-select form-select-sm" v-model="param.dataType">
                      <option value="numeric">Numérico</option>
                      <option value="text">Texto</option>
                      <option value="boolean">Booleano</option>
                      <option value="date">Fecha</option>
                    </select>
                  </div>
                  <div class="col-md-1">
                    <label class="form-label small">Orden</label>
                    <input
                      type="number"
                      class="form-control form-control-sm"
                      v-model.number="param.order"
                      min="0"
                    />
                  </div>
                </div>

                <div class="row g-2 mt-2">
                  <div class="col-md-6">
                    <label class="form-label small">Requerido</label>
                    <div class="form-check form-switch">
                      <input class="form-check-input" type="checkbox" v-model="param.required" />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small">Rango Normal</label>
                    <div class="input-group input-group-sm">
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="normalRanges[param.name].min"
                        placeholder="Min"
                        step="0.01"
                      />
                      <span class="input-group-text">-</span>
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="normalRanges[param.name].max"
                        placeholder="Max"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="handleClose">Cancelar</button>
        <button
          type="button"
          class="btn-modern"
          @click="saveTemplate"
          :disabled="saving || !isFormValid"
        >
          <i class="bi bi-save me-1"></i>
          {{ template ? 'Actualizar' : 'Crear' }} Template
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import {
  createExamResultTemplate,
  updateExamResultTemplate,
} from '../../../application/services/medical-exam-order';

export default {
  name: 'ExamResultTemplateModal',
  components: {
    Spinner,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    template: {
      type: Object,
      default: null,
    },
    commerceId: {
      type: String,
      required: true,
    },
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const saving = ref(false);
    const formData = reactive({
      examCode: '',
      examName: '',
      examType: '',
      parameters: [
        {
          name: '',
          code: '',
          unit: '',
          dataType: 'numeric',
          required: false,
          order: 0,
        },
      ],
    });

    const normalRanges = reactive({});

    // Inicializar con template si existe
    watch(
      () => props.template,
      newTemplate => {
        if (newTemplate) {
          formData.examCode = newTemplate.examCode || '';
          formData.examName = newTemplate.examName || '';
          formData.examType = newTemplate.examType || '';
          formData.parameters = newTemplate.parameters
            ? [...newTemplate.parameters]
            : [
                {
                  name: '',
                  code: '',
                  unit: '',
                  dataType: 'numeric',
                  required: false,
                  order: 0,
                },
              ];

          // Inicializar rangos normales
          if (newTemplate.normalRanges) {
            Object.keys(newTemplate.normalRanges).forEach(key => {
              normalRanges[key] = {
                min: newTemplate.normalRanges[key].min,
                max: newTemplate.normalRanges[key].max,
              };
            });
          }
        } else {
          // Reset form
          formData.examCode = '';
          formData.examName = '';
          formData.examType = '';
          formData.parameters = [
            {
              name: '',
              code: '',
              unit: '',
              dataType: 'numeric',
              required: false,
              order: 0,
            },
          ];
          Object.keys(normalRanges).forEach(key => delete normalRanges[key]);
        }
      },
      { immediate: true }
    );

    // Sincronizar normalRanges con parámetros
    watch(
      () => formData.parameters,
      params => {
        params.forEach(param => {
          if (param.name && !normalRanges[param.name]) {
            normalRanges[param.name] = { min: undefined, max: undefined };
          }
        });
      },
      { deep: true }
    );

    const addParameter = () => {
      formData.parameters.push({
        name: '',
        code: '',
        unit: '',
        dataType: 'numeric',
        required: false,
        order: formData.parameters.length,
      });
    };

    const removeParameter = index => {
      if (formData.parameters.length > 1) {
        const paramName = formData.parameters[index].name;
        if (normalRanges[paramName]) {
          delete normalRanges[paramName];
        }
        formData.parameters.splice(index, 1);
      }
    };

    const isFormValid = computed(
      () =>
        formData.examCode &&
        formData.examName &&
        formData.parameters.length > 0 &&
        formData.parameters.every(p => p.name && p.unit && p.dataType)
    );

    const saveTemplate = async () => {
      if (!isFormValid.value) return;

      try {
        saving.value = true;

        // Construir normalRanges
        const normalRangesData = {};
        formData.parameters.forEach(param => {
          if (param.name && normalRanges[param.name]) {
            const range = normalRanges[param.name];
            if (range.min !== undefined || range.max !== undefined) {
              normalRangesData[param.name] = {
                min: range.min,
                max: range.max,
              };
            }
          }
        });

        const templateData = {
          examCode: formData.examCode,
          examName: formData.examName,
          examType: formData.examType || undefined,
          parameters: formData.parameters.map(p => ({
            name: p.name,
            code: p.code || undefined,
            unit: p.unit,
            dataType: p.dataType,
            required: p.required,
            order: p.order,
          })),
          normalRanges: Object.keys(normalRangesData).length > 0 ? normalRangesData : undefined,
          commerceId: props.commerceId || undefined,
        };

        if (props.template) {
          await updateExamResultTemplate(props.template.id, templateData);
        } else {
          await createExamResultTemplate(templateData);
        }

        emit('saved');
        handleClose();
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Error al guardar el template: ' + (error.response?.data?.message || error.message));
      } finally {
        saving.value = false;
      }
    };

    const handleClose = () => {
      emit('close');
    };

    return {
      saving,
      formData,
      normalRanges,
      addParameter,
      removeParameter,
      isFormValid,
      saveTemplate,
      handleClose,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.modal-header h5 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.02);
}

.parameters-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.parameter-item {
  padding: 1rem;
}

.parameter-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.parameter-number {
  font-weight: 600;
  color: var(--azul-turno);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    max-height: 100vh;
  }

  .modal-body {
    padding: 1rem;
  }
}
</style>
