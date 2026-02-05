<template>
  <div class="document-preview-container">
    <div class="preview-header">
      <div class="document-info">
        <i :class="getFileTypeIcon(document.format)" class="file-icon"></i>
        <div class="file-details">
          <h4>{{ document.name }}</h4>
          <p>{{ formatFileSize(document.fileSize) }} • {{ getFormatLabel(document.format) }}</p>
        </div>
      </div>
      <div class="preview-actions">
        <button @click="downloadDocument" class="action-btn download-btn">
          <i class="bi bi-download"></i>
          Descargar
        </button>
        <button @click="openInNewTab" class="action-btn open-btn">
          <i class="bi bi-box-arrow-up-right"></i>
          Abrir
        </button>
      </div>
    </div>

    <div class="preview-content">
      <!-- Text/Document Preview -->
      <div v-if="isTextDocument" class="text-preview">
        <div class="text-content" v-if="textContent">
          <pre>{{ textContent }}</pre>
        </div>
        <div v-else class="loading-text">
          <div class="loading-spinner"></div>
          <p>Cargando contenido...</p>
        </div>
      </div>

      <!-- Generic File Preview -->
      <div v-else class="generic-preview">
        <div class="file-icon-large">
          <i :class="getFileTypeIcon(document.format)"></i>
        </div>
        <div class="file-info">
          <h3>{{ document.name }}</h3>
          <p class="file-type">{{ getFormatLabel(document.format) }}</p>
          <p class="file-size">{{ formatFileSize(document.fileSize) }}</p>

          <div class="document-metadata" v-if="document.documentMetadata">
            <div class="metadata-item" v-if="document.documentMetadata.studyDate">
              <span class="metadata-label">Fecha del estudio:</span>
              <span class="metadata-value">{{
                formatDate(document.documentMetadata.studyDate)
              }}</span>
            </div>
            <div class="metadata-item" v-if="document.documentMetadata.doctorName">
              <span class="metadata-label">Médico:</span>
              <span class="metadata-value">{{ document.documentMetadata.doctorName }}</span>
            </div>
            <div class="metadata-item" v-if="document.documentMetadata.specialty">
              <span class="metadata-label">Especialidad:</span>
              <span class="metadata-value">{{ document.documentMetadata.specialty }}</span>
            </div>
          </div>

          <div class="document-tags" v-if="document.tags && document.tags.length > 0">
            <span class="tag" v-for="tag in document.tags" :key="tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Preview Not Available -->
      <div v-if="!canPreview" class="no-preview">
        <i class="bi bi-eye-slash"></i>
        <h4>Vista previa no disponible</h4>
        <p>Este tipo de archivo no admite vista previa. Puede descargar el archivo para verlo.</p>
      </div>
    </div>

    <!-- Document Properties -->
    <div class="document-properties">
      <h5>Propiedades del documento</h5>
      <div class="properties-grid">
        <div class="property-item">
          <span class="property-label">Categoría:</span>
          <span class="property-value">{{ getCategoryLabel(document.category) }}</span>
        </div>
        <div class="property-item">
          <span class="property-label">Urgencia:</span>
          <span
            class="property-value urgency"
            :class="`urgency-${document.urgency?.toLowerCase()}`"
          >
            {{ getUrgencyLabel(document.urgency) }}
          </span>
        </div>
        <div class="property-item">
          <span class="property-label">Estado:</span>
          <span class="property-value status" :class="`status-${document.status?.toLowerCase()}`">
            {{ getStatusLabel(document.status) }}
          </span>
        </div>
        <div class="property-item">
          <span class="property-label">Creado:</span>
          <span class="property-value">{{ formatDate(document.createdAt) }}</span>
        </div>
        <div class="property-item" v-if="document.modifiedAt">
          <span class="property-label">Modificado:</span>
          <span class="property-value">{{ formatDate(document.modifiedAt) }}</span>
        </div>
        <div class="property-item" v-if="document.attentionId">
          <span class="property-label">Consulta:</span>
          <span class="property-value">{{ document.attentionId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import {
  getFileTypeIcon,
  getDocumentCategories,
  getDocumentUrgencyLevels,
  getDocumentStatusOptions,
  getClientDocument,
} from '../../../application/services/document';
import { getDateAndHour } from '../../../shared/utils/date';

export default {
  name: 'DocumentPreview',
  props: {
    document: { type: Object, required: true },
  },
  setup(props) {
    const textContent = ref('');
    const loading = ref(false);

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();
    const statusOptions = getDocumentStatusOptions();

    const isTextDocument = computed(() => {
      const format = props.document.format?.toLowerCase() || '';
      return (
        format.includes('text') ||
        format.includes('plain') ||
        ['txt', 'csv', 'log'].some(ext => format.includes(ext))
      );
    });

    const canPreview = computed(() => {
      const format = props.document.format?.toLowerCase() || '';
      return isTextDocument.value || format.includes('pdf') || format.includes('image');
    });

    const getCategoryLabel = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.label || category;
    };

    const getUrgencyLabel = urgency => {
      const urg = urgencyLevels.find(u => u.value === urgency);
      return urg?.label || urgency;
    };

    const getStatusLabel = status => {
      const stat = statusOptions.find(s => s.value === status);
      return stat?.label || status;
    };

    const getFormatLabel = format => {
      if (!format) return 'Desconocido';

      const formatMap = {
        'application/pdf': 'PDF',
        'image/jpeg': 'JPEG',
        'image/jpg': 'JPG',
        'image/png': 'PNG',
        'image/gif': 'GIF',
        'text/plain': 'Texto',
        'application/msword': 'Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
        'application/vnd.ms-excel': 'Excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      };

      return formatMap[format] || format.split('/')[1]?.toUpperCase() || 'Desconocido';
    };

    const formatFileSize = bytes => {
      if (!bytes) return 'Tamaño desconocido';

      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = date => getDateAndHour(date);

    const loadTextContent = async () => {
      if (!isTextDocument.value) return;

      try {
        loading.value = true;
        const blob = await getClientDocument(
          props.document.commerceId,
          props.document.clientId,
          'patient_documents',
          props.document.name
        );

        const text = await blob.text();
        textContent.value = text.substring(0, 5000); // Limit to first 5000 chars
        if (text.length > 5000) {
          textContent.value += '\n\n... (contenido truncado)';
        }
      } catch (error) {
        console.error('Error loading text content:', error);
        textContent.value = 'Error al cargar el contenido del archivo.';
      } finally {
        loading.value = false;
      }
    };

    const downloadDocument = async () => {
      try {
        const blob = await getClientDocument(
          props.document.commerceId,
          props.document.clientId,
          props.document.option,
          props.document.name
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = props.document.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    };

    const openInNewTab = async () => {
      try {
        const blob = await getClientDocument(
          props.document.commerceId,
          props.document.clientId,
          props.document.option,
          props.document.name
        );

        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Error opening document:', error);
      }
    };

    onMounted(() => {
      if (isTextDocument.value) {
        loadTextContent();
      }
    });

    return {
      textContent,
      loading,
      isTextDocument,
      canPreview,
      getCategoryLabel,
      getUrgencyLabel,
      getStatusLabel,
      getFormatLabel,
      formatFileSize,
      formatDate,
      downloadDocument,
      openInNewTab,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.document-preview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.document-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-icon {
  font-size: 2.5rem;
  color: var(--azul-turno);
}

.file-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.file-details p {
  margin: 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: white;
  color: #495057;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.download-btn:hover {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.open-btn:hover {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

.preview-content {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

.text-preview {
  height: 100%;
}

.text-content {
  height: 100%;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 1rem;
  overflow: auto;
}

.text-content pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.loading-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid var(--azul-turno);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.generic-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
}

.file-icon-large {
  margin-bottom: 1.5rem;
}

.file-icon-large i {
  font-size: 4rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.file-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.file-type {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #6c757d;
  font-weight: 500;
}

.file-size {
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.document-metadata {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  text-align: left;
}

.metadata-item {
  display: flex;
  gap: 0.5rem;
}

.metadata-label {
  font-weight: 600;
  color: #495057;
  min-width: 100px;
}

.metadata-value {
  color: #6c757d;
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: #e9ecef;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #495057;
}

.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6c757d;
  text-align: center;
}

.no-preview i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-preview h4 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.no-preview p {
  margin: 0;
  font-size: 0.9rem;
}

.document-properties {
  padding: 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.document-properties h5 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
}

.properties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.property-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.property-label {
  font-weight: 500;
  color: #495057;
}

.property-value {
  color: #6c757d;
  text-align: right;
}

.property-value.urgency {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-low {
  background: #d4edda;
  color: #155724;
}
.urgency-normal {
  background: #d1ecf1;
  color: #0c5460;
}
.urgency-high {
  background: #fff3cd;
  color: #856404;
}
.urgency-critical {
  background: #f8d7da;
  color: #721c24;
}

.property-value.status {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-active {
  background: #d1ecf1;
  color: #0c5460;
}
.status-reviewed {
  background: #d4edda;
  color: #155724;
}
.status-pending_review {
  background: #fff3cd;
  color: #856404;
}
.status-archived {
  background: #e2e3e5;
  color: #383d41;
}
.status-expired {
  background: #f8d7da;
  color: #721c24;
}

/* Responsive Design */
@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .preview-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .properties-grid {
    grid-template-columns: 1fr;
  }

  .property-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .property-value {
    text-align: left;
  }
}
</style>
