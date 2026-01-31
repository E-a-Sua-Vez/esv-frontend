<template>
  <div class="exam-result-form">
    <div class="form-header">
      <h5>
        <i class="bi bi-clipboard-check me-2"></i>
        Cargar Resultados de Examen
      </h5>
      <button type="button" class="btn-close" @click="$emit('close')"></button>
    </div>

    <div class="form-body">
      <div v-if="loading" class="text-center py-4">
        <Spinner />
      </div>

      <div v-else>
        <!-- Información del examen -->
        <div class="exam-info-card mb-3">
          <h6>{{ examOrder.exams[0]?.examName || 'Examen' }}</h6>
          <div class="exam-info-details">
            <span
              ><i class="bi bi-calendar me-1"></i> Solicitado:
              {{ formatDate(examOrder.requestedAt) }}</span
            >
            <span v-if="examOrder.scheduledDate">
              <i class="bi bi-calendar-check me-1"></i> Agendado:
              {{ formatDate(examOrder.scheduledDate) }}
            </span>
          </div>
        </div>

        <!-- Tipo de carga -->
        <div class="form-group mb-3">
          <label class="form-label">Tipo de Carga</label>
          <select class="form-select" v-model="loadType" @change="handleLoadTypeChange">
            <option value="structured">Estructurada (Valores individuales)</option>
            <option value="document">Documento (PDF/Imagen)</option>
            <option value="both">Ambos</option>
          </select>
        </div>

        <!-- Carga estructurada -->
        <div
          v-if="loadType === 'structured' || loadType === 'both'"
          class="structured-load-section"
        >
          <h6 class="section-title">Valores del Examen</h6>

          <div class="values-list">
            <div v-for="(value, index) in resultValues" :key="index" class="value-item">
              <div class="row g-2">
                <div class="col-md-4">
                  <label class="form-label small">Parámetro</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model="value.parameter"
                    placeholder="Ej: Hemoglobina"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label small">Valor</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model="value.value"
                    placeholder="Ej: 14.5"
                    @blur="validateValue(value, index)"
                  />
                </div>
                <div class="col-md-2">
                  <label class="form-label small">Unidad</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model="value.unit"
                    placeholder="Ej: g/dL"
                  />
                </div>
                <div class="col-md-2">
                  <label class="form-label small">Rango Normal</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    v-model="value.referenceRange"
                    placeholder="Ej: 12-16"
                    @blur="validateValue(value, index)"
                  />
                </div>
                <div class="col-md-1">
                  <label class="form-label small">&nbsp;</label>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger w-100"
                    @click="removeValue(index)"
                    :disabled="resultValues.length === 1"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              <div v-if="value.status && value.status !== 'normal'" class="value-alert mt-1">
                <span
                  class="badge"
                  :class="{
                    'bg-warning': value.status === 'high' || value.status === 'low',
                    'bg-danger': value.status === 'critical',
                  }"
                >
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  {{ getStatusLabel(value.status) }}
                </span>
              </div>
            </div>
          </div>

          <button type="button" class="btn btn-sm btn-outline-primary mt-2" @click="addValue">
            <i class="bi bi-plus-circle me-1"></i>
            Agregar Parámetro
          </button>
        </div>

        <!-- Carga de documento -->
        <div
          v-if="loadType === 'document' || loadType === 'both'"
          class="document-load-section mt-3"
        >
          <h6 class="section-title">Documento del Resultado</h6>
          <div class="form-group">
            <input
              type="file"
              class="form-control"
              @change="handleFileUpload"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <small class="form-text text-muted"
              >Formatos permitidos: PDF, JPG, PNG (máx. 5MB)</small
            >
          </div>
          <div v-if="uploadedDocuments.length > 0" class="uploaded-documents mt-2">
            <div v-for="(doc, index) in uploadedDocuments" :key="index" class="document-item">
              <i class="bi bi-file-earmark-pdf me-2"></i>
              {{ doc.name }}
              <button
                type="button"
                class="btn btn-sm btn-link text-danger ms-2"
                @click="removeDocument(index)"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Información adicional -->
        <div class="form-group mt-3">
          <label class="form-label">Observaciones</label>
          <textarea
            class="form-control"
            v-model="observations"
            rows="3"
            placeholder="Observaciones adicionales sobre el resultado..."
          ></textarea>
        </div>

        <div class="form-group mt-3">
          <label class="form-label">Interpretación</label>
          <textarea
            class="form-control"
            v-model="interpretation"
            rows="3"
            placeholder="Interpretación del médico sobre el resultado..."
          ></textarea>
        </div>

        <div class="form-group mt-3" v-if="examTemplate">
          <label class="form-label">Rango Normal General</label>
          <input type="text" class="form-control" v-model="normalRange" placeholder="Ej: 12-16" />
          <small class="form-text text-muted">Rango normal general del examen (opcional)</small>
        </div>

        <div class="row mt-3">
          <div class="col-md-4">
            <label class="form-label">Fecha de Realización</label>
            <input type="date" class="form-control" v-model="performedAt" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Fecha del Resultado</label>
            <input type="date" class="form-control" v-model="resultDate" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Estado del Resultado</label>
            <select class="form-select" v-model="resultStatus">
              <option value="preliminary">Preliminar</option>
              <option value="final">Final</option>
              <option value="corrected">Corregido</option>
            </select>
          </div>
        </div>

        <!-- Indicador de template cargado -->
        <div v-if="loadingTemplate" class="alert alert-info mt-3">
          <i class="bi bi-arrow-clockwise spinning me-2"></i>
          Cargando template del examen...
        </div>
        <div v-else-if="examTemplate" class="alert alert-success mt-3">
          <i class="bi bi-check-circle me-2"></i>
          Template cargado: {{ examTemplate.examName }} ({{ examTemplate.parameters.length }}
          parámetros)
        </div>
      </div>
    </div>

    <div class="form-footer">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancelar</button>
      <button
        type="button"
        class="btn btn-primary"
        @click="saveResults"
        :disabled="saving || !isFormValid"
      >
        <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
        <i v-else class="bi bi-save me-2"></i>
        Guardar Resultados
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import Spinner from '../../common/Spinner.vue';
import {
  addExamResults,
  createStructuredExamResult,
  getExamResultTemplate,
} from '../../../application/services/medical-exam-order';
import { getDate } from '../../../shared/utils/date';
import { globalStore } from '../../../stores';

export default {
  name: 'ExamResultForm',
  components: {
    Spinner,
  },
  props: {
    examOrder: {
      type: Object,
      required: true,
    },
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const store = globalStore();
    const loading = ref(false);
    const saving = ref(false);
    const loadingTemplate = ref(false);
    const loadType = ref('structured');
    const observations = ref('');
    const interpretation = ref('');
    const performedAt = ref(new Date().toISOString().split('T')[0]);
    const resultDate = ref(new Date().toISOString().split('T')[0]);
    const resultStatus = ref('final');
    const uploadedDocuments = ref([]);
    const examTemplate = ref(null);
    const normalRange = ref('');

    const resultValues = reactive([
      {
        parameter: '',
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        loincCode: '',
      },
    ]);

    // Cargar template si existe
    const loadTemplate = async () => {
      if (!props.examOrder.exams || props.examOrder.exams.length === 0) return;

      const exam = props.examOrder.exams[0];
      if (!exam.examCode) return;

      try {
        loadingTemplate.value = true;
        const template = await getExamResultTemplate(exam.examCode, props.examOrder.commerceId);

        if (template && template.parameters) {
          examTemplate.value = template;

          // Pre-llenar valores con parámetros del template
          resultValues.splice(0, resultValues.length);
          template.parameters.forEach((param, index) => {
            resultValues.push({
              parameter: param.name,
              value: '',
              unit: param.unit || '',
              referenceRange: template.normalRanges[param.name]
                ? `${template.normalRanges[param.name].min || ''}-${
                    template.normalRanges[param.name].max || ''
                  }`
                : '',
              status: 'normal',
              loincCode: param.code || '',
            });
          });

          // Establecer rango normal general si existe
          if (template.normalRanges && Object.keys(template.normalRanges).length > 0) {
            const firstRange = Object.values(template.normalRanges)[0];
            if (firstRange.min !== undefined && firstRange.max !== undefined) {
              normalRange.value = `${firstRange.min}-${firstRange.max}`;
            }
          }
        }
      } catch (error) {
        // No es crítico, continuar sin template
      } finally {
        loadingTemplate.value = false;
      }
    };

    const addValue = () => {
      resultValues.push({
        parameter: '',
        value: '',
        unit: '',
        referenceRange: '',
        status: 'normal',
        loincCode: '',
      });
    };

    const removeValue = index => {
      if (resultValues.length > 1) {
        resultValues.splice(index, 1);
      }
    };

    const validateValue = (value, index) => {
      if (!value.value) {
        value.status = 'normal';
        return;
      }

      const val = parseFloat(value.value);
      if (isNaN(val)) {
        value.status = 'normal';
        return;
      }

      // Si hay template, usar sus rangos
      if (examTemplate.value && examTemplate.value.normalRanges[value.parameter]) {
        const normalRange = examTemplate.value.normalRanges[value.parameter];
        const min = normalRange.min ?? parseFloat(normalRange.minText || '0');
        const max = normalRange.max ?? parseFloat(normalRange.maxText || 'Infinity');

        // Verificar valores críticos primero
        if (examTemplate.value.criticalValues[value.parameter]) {
          const critical = examTemplate.value.criticalValues[value.parameter];
          if (critical.type === 'high' && val >= (critical.value || Infinity)) {
            value.status = 'critical';
            return;
          }
          if (critical.type === 'low' && val <= (critical.value || -Infinity)) {
            value.status = 'critical';
            return;
          }
        }

        // Verificar rango normal
        if (val < min || val > max) {
          value.status = val < min ? 'low' : 'high';
        } else {
          value.status = 'normal';
        }
        return;
      }

      // Sin template, usar referencia manual
      if (!value.referenceRange) {
        value.status = 'normal';
        return;
      }

      const range = value.referenceRange.split('-');
      if (range.length !== 2) {
        value.status = 'normal';
        return;
      }

      const min = parseFloat(range[0]);
      const max = parseFloat(range[1]);

      if (isNaN(min) || isNaN(max)) {
        value.status = 'normal';
        return;
      }

      if (val < min * 0.5 || val > max * 1.5) {
        value.status = 'critical';
      } else if (val < min || val > max) {
        value.status = val < min ? 'low' : 'high';
      } else {
        value.status = 'normal';
      }
    };

    const handleLoadTypeChange = () => {
      if (loadType.value === 'document' && resultValues.length === 0) {
        addValue();
      }
    };

    const handleFileUpload = async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB');
        return;
      }

      try {
        loading.value = true;
        // TODO: Implement file upload to S3 using documents service
        // For now, store file reference
        uploadedDocuments.value.push({
          name: file.name,
          url: URL.createObjectURL(file), // Temporary URL for preview
          file, // Store file for later upload
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        alert('Error al subir el archivo');
      } finally {
        loading.value = false;
      }
    };

    const removeDocument = index => {
      uploadedDocuments.value.splice(index, 1);
    };

    const isFormValid = computed(() => {
      if (loadType.value === 'structured' || loadType.value === 'both') {
        return resultValues.some(v => v.parameter && v.value && v.unit);
      }
      if (loadType.value === 'document') {
        return uploadedDocuments.value.length > 0;
      }
      return false;
    });

    const saveResults = async () => {
      if (!isFormValid.value) return;

      try {
        saving.value = true;

        // Usar el nuevo servicio estructurado
        const resultData = {
          examOrderId: props.examOrder.id,
          examName: props.examOrder.exams[0]?.examName || 'Examen',
          examCode: props.examOrder.exams[0]?.examCode,
          performedAt: performedAt.value ? new Date(performedAt.value).toISOString() : undefined,
          resultDate: resultDate.value
            ? new Date(resultDate.value).toISOString()
            : new Date().toISOString(),
          values:
            loadType.value === 'structured' || loadType.value === 'both'
              ? resultValues
                  .filter(v => v.parameter && v.value)
                  .map(v => ({
                    parameter: v.parameter,
                    value: typeof v.value === 'string' ? parseFloat(v.value) || v.value : v.value,
                    unit: v.unit || '',
                    referenceRange: v.referenceRange || '',
                    status: v.status || 'normal',
                    loincCode: v.loincCode || '',
                  }))
              : [],
          observations: observations.value || undefined,
          interpretation: interpretation.value || undefined,
          status: resultStatus.value,
          attachments: uploadedDocuments.value.map(d => d.url).filter(Boolean),
          normalRange: normalRange.value || undefined,
        };

        await createStructuredExamResult(resultData);
        emit('saved');
        emit('close');
      } catch (error) {
        console.error('Error saving results:', error);
        alert(
          'Error al guardar los resultados: ' + (error.response?.data?.message || error.message)
        );
      } finally {
        saving.value = false;
      }
    };

    const formatDate = date => {
      if (!date) return '';
      return getDate(date);
    };

    const getStatusLabel = status => {
      const labels = {
        normal: 'Normal',
        high: 'Alto',
        low: 'Bajo',
        critical: 'Crítico',
      };
      return labels[status] || status;
    };

    // Cargar template al montar
    onMounted(() => {
      loadTemplate();
    });

    // Observar cambios en el examen para recargar template
    watch(
      () => props.examOrder.exams,
      () => {
        loadTemplate();
      }
    );

    return {
      store,
      loading,
      saving,
      loadingTemplate,
      loadType,
      observations,
      interpretation,
      performedAt,
      resultDate,
      resultStatus,
      uploadedDocuments,
      resultValues,
      examTemplate,
      normalRange,
      addValue,
      removeValue,
      validateValue,
      handleLoadTypeChange,
      handleFileUpload,
      removeDocument,
      isFormValid,
      saveResults,
      formatDate,
      getStatusLabel,
      loadTemplate,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exam-result-form {
  background: white;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.form-header h5 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.form-body {
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.exam-info-card {
  background: rgba(68, 111, 252, 0.05);
  border: 1px solid rgba(68, 111, 252, 0.2);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  margin-bottom: 1rem;
}

.exam-info-card h6 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: var(--azul-turno);
  font-size: 1rem;
}

.exam-info-details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 0.5rem;
  color: var(--azul-turno);
}

.values-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.value-item {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
}

.value-item:hover {
  background: rgba(68, 111, 252, 0.03);
  border-color: rgba(68, 111, 252, 0.3);
}

.value-alert {
  font-size: 0.85rem;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.uploaded-documents {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.document-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.25rem;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
}
</style>
