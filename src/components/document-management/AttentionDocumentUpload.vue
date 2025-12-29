<template>
  <div class="attention-document-upload">
    <form @submit.prevent="uploadDocument" class="upload-form">
      <!-- Document Type Selection -->
      <div class="form-group">
        <label class="form-label">
          <i class="bi bi-file-earmark-text me-2"></i>
          Tipo de documento *
        </label>
        <select
          v-model="selectedDocumentType"
          @change="updateCategory"
          class="form-select"
          required
        >
          <option value="">Seleccione el tipo de documento...</option>
          <option v-for="type in documentTypes" :key="type.value" :value="type">
            {{ type.label }}
          </option>
        </select>
      </div>

      <!-- File Upload -->
      <div class="form-group">
        <label class="form-label">
          <i class="bi bi-cloud-upload me-2"></i>
          Archivo *
        </label>
        <DragDropFileUpload
          :model-value="selectedFile"
          :disabled="loading"
          :accept="acceptedFormats"
          :max-size="maxFileSize"
          :title="'Subir documento de consulta'"
          :subtitle="'Arraste y suelte el archivo aquí o haga clic para seleccionar'"
          :accepted-formats="formatDescription"
          @file-selected="handleFileSelected"
          @file-removed="handleFileRemoved"
          @error="handleFileError"
        />
      </div>

      <!-- Document Details -->
      <div class="form-group" v-if="selectedFile">
        <label class="form-label">
          <i class="bi bi-tag me-2"></i>
          Urgencia
        </label>
        <select v-model="urgency" class="form-select">
          <option v-for="level in urgencyLevels" :key="level.value" :value="level.value">
            {{ level.label }}
          </option>
        </select>
      </div>

      <!-- Clinical Notes -->
      <div class="form-group" v-if="selectedFile">
        <label class="form-label">
          <i class="bi bi-journal-text me-2"></i>
          Notas clínicas
        </label>
        <textarea
          v-model="clinicalNotes"
          class="form-textarea"
          rows="3"
          placeholder="Agregue notas o comentarios sobre este documento..."
        ></textarea>
      </div>

      <!-- Tags -->
      <div class="form-group" v-if="selectedFile">
        <label class="form-label">
          <i class="bi bi-tags me-2"></i>
          Etiquetas
        </label>
        <div class="tags-input-container">
          <input
            v-model="newTag"
            @keyup.enter="addTag"
            type="text"
            placeholder="Agregar etiqueta..."
            class="tag-input"
          />
          <button type="button" @click="addTag" class="add-tag-btn">
            <i class="bi bi-plus"></i>
          </button>
        </div>
        <div class="selected-tags" v-if="tags.length > 0">
          <span v-for="tag in tags" :key="tag" class="tag">
            {{ tag }}
            <button type="button" @click="removeTag(tag)" class="remove-tag-btn">
              <i class="bi bi-x"></i>
            </button>
          </span>
        </div>
      </div>

      <!-- Study Date (for lab results, imaging, etc.) -->
      <div class="form-group" v-if="selectedFile && needsStudyDate">
        <label class="form-label">
          <i class="bi bi-calendar-event me-2"></i>
          Fecha del estudio
        </label>
        <input v-model="studyDate" type="date" class="form-input" />
      </div>

      <!-- Confidential checkbox -->
      <div class="form-group" v-if="selectedFile">
        <label class="form-checkbox-label">
          <input v-model="isConfidential" type="checkbox" class="form-checkbox" />
          <span class="checkbox-text">
            <i class="bi bi-shield-lock me-2"></i>
            Documento confidencial
          </span>
        </label>
      </div>

      <!-- Error Messages -->
      <div v-if="errors.length > 0" class="error-messages">
        <div v-for="error in errors" :key="error" class="error-message">
          <i class="bi bi-exclamation-triangle me-2"></i>
          {{ $t ? $t(error) : error }}
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-cancel" :disabled="loading">
          Cancelar
        </button>
        <button type="submit" class="btn-upload" :disabled="!canUpload || loading">
          <i class="bi bi-cloud-upload me-2"></i>
          <span v-if="loading">Subiendo...</span>
          <span v-else>Subir Documento</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import {
  addClientDocument,
  getDocumentCategories,
  getDocumentUrgencyLevels,
} from '../../application/services/document';
import DragDropFileUpload from '../common/DragDropFileUpload.vue';

export default {
  name: 'AttentionDocumentUpload',
  components: {
    DragDropFileUpload,
  },
  props: {
    attention: { type: Object, required: true },
    client: { type: Object, required: true },
    commerce: { type: Object, required: true },
  },
  emits: ['document-uploaded', 'cancel'],
  setup(props, { emit }) {
    const loading = ref(false);
    const selectedFile = ref(null);
    const selectedDocumentType = ref('');
    const urgency = ref('NORMAL');
    const clinicalNotes = ref('');
    const tags = ref([]);
    const newTag = ref('');
    const studyDate = ref('');
    const isConfidential = ref(false);
    const errors = ref([]);

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();

    // Document types specific to attention/consultation context
    const documentTypes = computed(() => [
      {
        value: 'LABORATORY_RESULTS',
        label: 'Resultados de Laboratorio',
        category: 'LABORATORY_RESULTS',
        needsStudyDate: true,
      },
      {
        value: 'IMAGING_STUDIES',
        label: 'Estudios de Imagen',
        category: 'IMAGING_STUDIES',
        needsStudyDate: true,
      },
      {
        value: 'PATHOLOGY_REPORTS',
        label: 'Informes de Patología',
        category: 'PATHOLOGY_REPORTS',
        needsStudyDate: true,
      },
      {
        value: 'CONSULTATION_NOTES',
        label: 'Notas de Consulta',
        category: 'CONSULTATION_NOTES',
        needsStudyDate: false,
      },
      {
        value: 'PRESCRIPTION_RECORDS',
        label: 'Recetas Médicas',
        category: 'PRESCRIPTION_RECORDS',
        needsStudyDate: false,
      },
      {
        value: 'CONSENT_FORMS',
        label: 'Formularios de Consentimiento',
        category: 'CONSENT_FORMS',
        needsStudyDate: false,
      },
      {
        value: 'EXTERNAL_REPORTS',
        label: 'Informes Externos',
        category: 'EXTERNAL_REPORTS',
        needsStudyDate: true,
      },
      {
        value: 'REFERRAL_LETTERS',
        label: 'Cartas de Referencia',
        category: 'REFERRAL_LETTERS',
        needsStudyDate: false,
      },
    ]);

    const needsStudyDate = computed(() => selectedDocumentType.value?.needsStudyDate || false);

    const acceptedFormats = computed(() => {
      if (!selectedDocumentType.value) return '.pdf,.jpg,.jpeg,.png';

      // Different document types might accept different formats
      const formatMap = {
        LABORATORY_RESULTS: '.pdf,.jpg,.jpeg,.png',
        IMAGING_STUDIES: '.pdf,.jpg,.jpeg,.png,.dcm',
        PATHOLOGY_REPORTS: '.pdf,.doc,.docx',
        CONSULTATION_NOTES: '.pdf,.doc,.docx,.txt',
        PRESCRIPTION_RECORDS: '.pdf,.jpg,.jpeg,.png',
        CONSENT_FORMS: '.pdf,.jpg,.jpeg,.png',
        EXTERNAL_REPORTS: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
        REFERRAL_LETTERS: '.pdf,.doc,.docx',
      };

      return formatMap[selectedDocumentType.value.value] || '.pdf,.jpg,.jpeg,.png';
    });

    const formatDescription = computed(() => {
      const formats = acceptedFormats.value.split(',').map(f => f.replace('.', '').toUpperCase());
      return `${formats.join(', ')} (máx. 10MB)`;
    });

    const maxFileSize = 10000000; // 10MB

    const canUpload = computed(
      () => selectedFile.value && selectedDocumentType.value && errors.value.length === 0
    );

    // Methods
    const updateCategory = () => {
      // Reset form when document type changes
      selectedFile.value = null;
      errors.value = [];
    };

    const handleFileSelected = file => {
      selectedFile.value = file;
      validateFile(file);
    };

    const handleFileRemoved = () => {
      selectedFile.value = null;
      errors.value = [];
    };

    const handleFileError = error => {
      errors.value = [error];
    };

    const validateFile = file => {
      errors.value = [];

      if (!file) return;

      // Size validation
      if (file.size > maxFileSize) {
        errors.value.push('El archivo es demasiado grande (máximo 10MB)');
      }

      // Format validation
      const allowedFormats = acceptedFormats.value.split(',').map(f => f.trim());
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!allowedFormats.includes(fileExtension)) {
        errors.value.push(`Formato de archivo no permitido. Use: ${formatDescription.value}`);
      }
    };

    const addTag = () => {
      const tag = newTag.value.trim();
      if (tag && !tags.value.includes(tag)) {
        tags.value.push(tag);
        newTag.value = '';
      }
    };

    const removeTag = tag => {
      const index = tags.value.indexOf(tag);
      if (index > -1) {
        tags.value.splice(index, 1);
      }
    };

    const uploadDocument = async () => {
      if (!canUpload.value) return;

      try {
        loading.value = true;
        errors.value = [];

        // Prepare document metadata
        const documentMetadata = {
          clientName: props.client.name,
          clientLastName: props.client.lastName,
          clientIdNumber: props.client.idNumber,
          clientEmail: props.client.email,
          doctorId: props.attention.collaboratorId,
          clinicalNotes: clinicalNotes.value,
          studyDate: studyDate.value || null,
          optionSelected: selectedDocumentType.value,
        };

        // Prepare document data
        const documentData = {
          commerceId: props.commerce.id,
          clientId: props.client.id,
          name: `${selectedDocumentType.value.value.toLowerCase()}-${
            props.client.id
          }-${Date.now()}`,
          format: selectedFile.value.type,
          documentMetadata: JSON.stringify(documentMetadata),
          reportType: 'patient_documents',
          details: JSON.stringify(selectedDocumentType.value),

          // Enhanced ecosystem integration
          attentionId: props.attention.id,
          patientHistoryId: props.attention.patientHistoryId,
          collaboratorId: props.attention.collaboratorId,
          category: selectedDocumentType.value.category,
          urgency: urgency.value,
          tags: tags.value,
          clinicalNotes: clinicalNotes.value,
          studyDate: studyDate.value || null,
          isConfidential: isConfidential.value,
        };

        const uploadedDocument = await addClientDocument(documentData, selectedFile.value);

        emit('document-uploaded', uploadedDocument);
      } catch (error) {
        console.error('Error uploading document:', error);
        errors.value = ['Error al subir el documento. Por favor, inténtelo de nuevo.'];
      } finally {
        loading.value = false;
      }
    };

    // Watchers
    watch(selectedFile, newFile => {
      if (newFile) {
        validateFile(newFile);
      }
    });

    return {
      loading,
      selectedFile,
      selectedDocumentType,
      urgency,
      clinicalNotes,
      tags,
      newTag,
      studyDate,
      isConfidential,
      errors,
      documentTypes,
      urgencyLevels,
      needsStudyDate,
      acceptedFormats,
      formatDescription,
      maxFileSize,
      canUpload,
      updateCategory,
      handleFileSelected,
      handleFileRemoved,
      handleFileError,
      addTag,
      removeTag,
      uploadDocument,
    };
  },
};
</script>

<style scoped>
.attention-document-upload {
  width: 100%;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-select,
.form-input {
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-textarea {
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.tags-input-container {
  display: flex;
  gap: 0.5rem;
}

.tag-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.add-tag-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--azul-turno);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.add-tag-btn:hover {
  background: #0056b3;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #e9ecef;
  border-radius: 1rem;
  font-size: 0.75rem;
  color: #495057;
}

.remove-tag-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.6rem;
}

.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.form-checkbox-label:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.form-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #495057;
  font-weight: 500;
}

.error-messages {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 0.375rem;
  padding: 0.75rem;
}

.error-message {
  display: flex;
  align-items: center;
  color: #721c24;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.error-message:last-child {
  margin-bottom: 0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.btn-cancel,
.btn-upload {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background: #5a6268;
}

.btn-upload {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.btn-upload:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-cancel:disabled,
.btn-upload:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-upload {
    width: 100%;
    justify-content: center;
  }

  .tags-input-container {
    flex-direction: column;
  }

  .add-tag-btn {
    width: 100%;
    height: 40px;
  }
}
</style>
