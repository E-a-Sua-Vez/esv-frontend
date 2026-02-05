<template>
  <div class="attention-documents-container">
    <!-- Header -->
    <div class="attention-documents-header">
      <div class="header-info">
        <h3>{{ $t('attentionDocuments.consultationDocuments') }}</h3>
        <p v-if="attention">
          {{ $t('attentionDocuments.consultationOf') }} {{ formatDate(attention.createdAt) }} - {{ attention.userName }}
          {{ attention.userLastName }}
        </p>
      </div>
      <div class="header-actions">
        <button @click="showUploadModal = true" class="btn-upload-document" v-if="canUpload">
          <i class="bi bi-plus-circle"></i>
          {{ $t('attentionDocuments.uploadDocument') }}
        </button>
        <button @click="linkExistingDocument" class="btn-link-document" v-if="canUpload">
          <i class="bi bi-link-45deg"></i>
          {{ $t('attentionDocuments.linkExisting') }}
        </button>
      </div>
    </div>

    <!-- Documents Grid -->
    <div class="documents-grid" v-if="documents.length > 0">
      <div
        v-for="document in documents"
        :key="document.id"
        class="document-card"
        @click="selectDocument(document)"
      >
        <div class="document-preview">
          <i :class="getFileTypeIcon(document.format)" class="file-icon"></i>
          <div class="document-overlay">
            <button class="overlay-btn" @click.stop="previewDocument(document)">
              <i class="bi bi-eye"></i>
            </button>
            <button class="overlay-btn" @click.stop="downloadDocument(document)">
              <i class="bi bi-download"></i>
            </button>
          </div>
        </div>

        <div class="document-info">
          <h4 class="document-title">{{ document.name }}</h4>
          <p class="document-category">{{ getCategoryLabel(document.category) }}</p>
          <div class="document-meta">
            <span class="document-date">{{ formatDate(document.createdAt) }}</span>
            <span class="document-urgency" :class="`urgency-${document.urgency?.toLowerCase()}`">
              {{ getUrgencyLabel(document.urgency) }}
            </span>
          </div>

          <!-- Document Tags -->
          <div class="document-tags" v-if="document.tags && document.tags.length > 0">
            <span v-for="tag in document.tags.slice(0, 2)" :key="tag" class="tag">
              {{ tag }}
            </span>
            <span v-if="document.tags.length > 2" class="tag-more">
              +{{ document.tags.length - 2 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="bi bi-file-earmark-text empty-icon"></i>
      <h4>No hay documentos en esta consulta</h4>
      <p>Los documentos relacionados con esta consulta aparecerán aquí</p>
      <button @click="showUploadModal = true" class="btn-upload-first" v-if="canUpload">
        <i class="bi bi-plus-circle"></i>
        Subir primer documento
      </button>
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="upload-modal" @click="showUploadModal = false">
      <div class="upload-modal-content" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-cloud-upload"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">Subir Documento a la Consulta</h5>
              <p class="modern-modal-client-name">{{ attention?.patientName || 'Paciente' }}</p>
            </div>
          </div>
          <button @click="showUploadModal = false" class="btn-close modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="upload-modal-body">
          <AttentionDocumentUpload
            :attention="attention"
            :client="client"
            :commerce="commerce"
            @document-uploaded="handleDocumentUploaded"
            @cancel="showUploadModal = false"
          />
        </div>
      </div>
    </div>

    <!-- Link Existing Modal -->
    <div v-if="showLinkModal" class="link-modal" @click="showLinkModal = false">
      <div class="link-modal-content" @click.stop>
        <div class="link-modal-header">
          <h3>Vincular Documento Existente</h3>
          <button @click="showLinkModal = false" class="close-modal-btn">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="link-modal-body">
          <ExistingDocumentSelector
            :client="client"
            :commerce="commerce"
            :exclude-attention-id="attention?.id"
            @document-selected="handleDocumentLinked"
            @cancel="showLinkModal = false"
          />
        </div>
      </div>
    </div>

    <!-- Document Viewer -->
    <div v-if="showViewer" class="document-viewer-modal" @click="closeViewer">
      <div class="viewer-modal-content" @click.stop>
        <DocumentViewer
          :documents="documents"
          :initial-document="selectedDocument"
          :can-annotate="canAnnotate"
          :commerce="commerce"
          :client="client"
          @annotation-added="handleAnnotationAdded"
          @close="closeViewer"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getDocumentsByAttention,
  linkDocumentToAttention,
  getFileTypeIcon,
  getDocumentCategories,
  getDocumentUrgencyLevels,
  getClientDocument,
} from '../../application/services/document';
import { getDateAndHour } from '../../shared/utils/date';
import DocumentViewer from './DocumentViewer.vue';
import AttentionDocumentUpload from './AttentionDocumentUpload.vue';
import ExistingDocumentSelector from './ExistingDocumentSelector.vue';

export default {
  name: 'AttentionDocuments',
  components: {
    DocumentViewer,
    AttentionDocumentUpload,
    ExistingDocumentSelector,
  },
  props: {
    attention: { type: Object, required: true },
    client: { type: Object, required: true },
    commerce: { type: Object, required: true },
    canUpload: { type: Boolean, default: true },
    canAnnotate: { type: Boolean, default: true },
  },
  emits: ['document-added', 'document-linked'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const documents = ref([]);
    const loading = ref(false);
    const showUploadModal = ref(false);
    const showLinkModal = ref(false);
    const showViewer = ref(false);
    const selectedDocument = ref(null);

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();

    // Load attention documents
    const loadDocuments = async () => {
      if (!props.attention?.id) return;

      try {
        loading.value = true;
        documents.value = await getDocumentsByAttention(props.attention.id);
      } catch (error) {
        console.error('Error loading attention documents:', error);
      } finally {
        loading.value = false;
      }
    };

    // Document actions
    const selectDocument = document => {
      selectedDocument.value = document;
      showViewer.value = true;
    };

    const previewDocument = document => {
      selectDocument(document);
    };

    const downloadDocument = async document => {
      try {
        const blob = await getClientDocument(document.commerceId, document.clientId, 'patient_documents', document.name);

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = document.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    };

    const closeViewer = () => {
      showViewer.value = false;
      selectedDocument.value = null;
    };

    // Upload and link handlers
    const handleDocumentUploaded = document => {
      documents.value.unshift(document);
      showUploadModal.value = false;
      emit('document-added', document);
    };

    const linkExistingDocument = () => {
      showLinkModal.value = true;
    };

    const handleDocumentLinked = async document => {
      try {
        const linkedDocument = await linkDocumentToAttention(document.id, props.attention.id);
        documents.value.unshift(linkedDocument);
        showLinkModal.value = false;
        emit('document-linked', linkedDocument);
      } catch (error) {
        console.error('Error linking document:', error);
      }
    };

    const handleAnnotationAdded = annotation => {};

    // Utility functions
    const getCategoryLabel = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.label || category;
    };

    const getUrgencyLabel = urgency => {
      const urg = urgencyLevels.find(u => u.value === urgency);
      return urg?.label || urgency;
    };

    const formatDate = date => getDateAndHour(date);

    // Lifecycle
    onMounted(() => {
      loadDocuments();
    });

    return {
      documents,
      loading,
      showUploadModal,
      showLinkModal,
      showViewer,
      selectedDocument,
      selectDocument,
      previewDocument,
      downloadDocument,
      closeViewer,
      handleDocumentUploaded,
      linkExistingDocument,
      handleDocumentLinked,
      handleAnnotationAdded,
      getCategoryLabel,
      getUrgencyLabel,
      formatDate,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.attention-documents-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.attention-documents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.header-info p {
  margin: 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-upload-document,
.btn-link-document {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload-document {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.btn-upload-document:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-link-document {
  background: white;
  color: var(--azul-turno);
  border: 2px solid var(--azul-turno);
}

.btn-link-document:hover {
  background: var(--azul-turno);
  color: white;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.document-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.document-card:hover {
  border-color: var(--azul-turno);
  box-shadow: 0 4px 16px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.document-preview {
  position: relative;
  height: 160px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-icon {
  font-size: 3rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.document-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.document-card:hover .document-overlay {
  opacity: 1;
}

.overlay-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.25rem;
}

.overlay-btn:hover {
  background: white;
  color: var(--azul-turno);
  transform: scale(1.1);
}

.document-info {
  padding: 1rem;
}

.document-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.document-category {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: var(--azul-turno);
  font-weight: 500;
}

.document-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.document-date {
  font-size: 0.75rem;
  color: #6c757d;
}

.document-urgency {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
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

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  padding: 0.125rem 0.5rem;
  background: #e9ecef;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  color: #495057;
  font-weight: 500;
}

.tag-more {
  padding: 0.125rem 0.5rem;
  background: #6c757d;
  color: white;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: #495057;
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 2rem 0;
  font-size: 0.9rem;
}

.btn-upload-first {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-upload-first:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

/* Modal Styles */
.upload-modal,
.link-modal,
.document-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.upload-modal-content,
.link-modal-content {
  background: white;
  border-radius: 0.75rem;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.viewer-modal-content {
  position: relative;
  width: 95vw;
  height: 90vh;
  max-width: 1400px;
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.upload-modal-header,
.link-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.upload-modal-header h3,
.link-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.close-modal-btn,
.close-viewer-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-modal-btn:hover,
.close-viewer-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #495057;
}

.close-viewer-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  color: white;
}

.close-viewer-btn:hover {
  background: rgba(0, 0, 0, 0.9);
}

.upload-modal-body,
.link-modal-body {
  padding: 1.5rem;
  max-height: 60vh;
  overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .attention-documents-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .documents-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .upload-modal-content,
  .link-modal-content {
    margin: 1rem;
    max-width: none;
  }

  .viewer-modal-content {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
}

/* Modern Modal Header Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}
</style>
