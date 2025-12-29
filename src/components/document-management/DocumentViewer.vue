<template>
  <div class="document-viewer-container">
    <!-- Document Viewer Header -->
    <div class="document-viewer-header">
      <div class="document-info">
        <div class="document-title">
          <i :class="getFileTypeIcon(selectedDocument?.format)" class="document-icon"></i>
          <h3>{{ selectedDocument?.name || 'Seleccione un documento' }}</h3>
        </div>
        <div class="document-metadata" v-if="selectedDocument">
          <span class="document-date">{{ formatDate(selectedDocument.createdAt) }}</span>
          <span class="document-category">{{ getCategoryLabel(selectedDocument.category) }}</span>
          <span
            class="document-urgency"
            :class="`urgency-${selectedDocument.urgency?.toLowerCase()}`"
          >
            {{ getUrgencyLabel(selectedDocument.urgency) }}
          </span>
        </div>
      </div>
      <div class="document-actions">
        <button
          v-if="selectedDocument"
          @click="downloadDocument"
          class="btn-action btn-download"
          :disabled="loading"
        >
          <i class="bi bi-download"></i>
          Descargar
        </button>
        <button
          v-if="selectedDocument && canAnnotate"
          @click="toggleAnnotations"
          class="btn-action btn-annotate"
          :class="{ active: showAnnotations }"
        >
          <i class="bi bi-pencil"></i>
          Anotar
        </button>
        <button @click="toggleFullscreen" class="btn-action btn-fullscreen">
          <i :class="isFullscreen ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen'"></i>
        </button>
      </div>
    </div>

    <!-- Main Viewer Area -->
    <div class="document-viewer-main" :class="{ fullscreen: isFullscreen }">
      <div class="viewer-container" v-if="selectedDocument">
        <!-- PDF Viewer -->
        <PDFViewer
          v-if="isPDF(selectedDocument.format)"
          :document="selectedDocument"
          :show-annotations="showAnnotations"
          @annotation-added="handleAnnotationAdded"
        />

        <!-- Image Viewer -->
        <ImageViewer
          v-else-if="isImage(selectedDocument.format)"
          :document="selectedDocument"
          :show-annotations="showAnnotations"
          @annotation-added="handleAnnotationAdded"
        />

        <!-- Document Preview -->
        <DocumentPreview v-else :document="selectedDocument" />
      </div>

      <!-- Empty State -->
      <div v-else class="viewer-empty-state">
        <i class="bi bi-file-earmark-text empty-icon"></i>
        <h4>Seleccione un documento para visualizar</h4>
        <p>Elija un documento de la lista para ver su contenido aquí</p>
      </div>
    </div>

    <!-- Document Carousel -->
    <div class="document-carousel" v-if="documents.length > 0">
      <div class="carousel-header">
        <h4>Documentos ({{ documents.length }})</h4>
        <div class="carousel-controls">
          <button @click="scrollCarousel('left')" class="carousel-btn">
            <i class="bi bi-chevron-left"></i>
          </button>
          <button @click="scrollCarousel('right')" class="carousel-btn">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <div class="carousel-container" ref="carouselContainer">
        <div class="carousel-track">
          <DocumentThumbnail
            v-for="document in documents"
            :key="document.id"
            :document="document"
            :is-selected="selectedDocument?.id === document.id"
            @select="selectDocument"
            @preview="previewDocument"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import PDFViewer from './viewers/PDFViewer.vue';
import ImageViewer from './viewers/ImageViewer.vue';
import DocumentPreview from './viewers/DocumentPreview.vue';
import DocumentThumbnail from './DocumentThumbnail.vue';
import {
  getFileTypeIcon,
  getDocumentCategories,
  getDocumentUrgencyLevels,
} from '../../application/services/document';
import { getClientDocument, logDocumentAccess } from '../../application/services/document';
import { getDateAndHour } from '../../shared/utils/date';

export default {
  name: 'DocumentViewer',
  components: {
    PDFViewer,
    ImageViewer,
    DocumentPreview,
    DocumentThumbnail,
  },
  props: {
    documents: { type: Array, default: () => [] },
    initialDocument: { type: Object, default: null },
    canAnnotate: { type: Boolean, default: false },
    commerce: { type: Object, required: true },
    client: { type: Object, required: true },
  },
  emits: ['document-selected', 'annotation-added'],
  setup(props, { emit }) {
    const selectedDocument = ref(props.initialDocument);
    const loading = ref(false);
    const showAnnotations = ref(false);
    const isFullscreen = ref(false);
    const carouselContainer = ref(null);

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();

    const selectDocument = async document => {
      selectedDocument.value = document;
      emit('document-selected', document);

      // Log document access
      try {
        await logDocumentAccess(
          document.id,
          'view',
          'collaborator',
          window.location.hostname,
          navigator.userAgent
        );
      } catch (error) {
        console.warn('Failed to log document access:', error);
      }
    };

    const previewDocument = document => {
      selectDocument(document);
    };

    const downloadDocument = async () => {
      if (!selectedDocument.value) return;

      try {
        loading.value = true;
        const fileBlob = await getClientDocument(
          selectedDocument.value.commerceId,
          selectedDocument.value.option,
          selectedDocument.value.name
        );

        const url = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedDocument.value.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Log download access
        await logDocumentAccess(selectedDocument.value.id, 'download', 'collaborator');
      } catch (error) {
        console.error('Error downloading document:', error);
      } finally {
        loading.value = false;
      }
    };

    const toggleAnnotations = () => {
      showAnnotations.value = !showAnnotations.value;
    };

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value;
      if (isFullscreen.value) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    };

    const scrollCarousel = direction => {
      if (!carouselContainer.value) return;

      const scrollAmount = 200;
      const currentScroll = carouselContainer.value.scrollLeft;

      if (direction === 'left') {
        carouselContainer.value.scrollTo({
          left: currentScroll - scrollAmount,
          behavior: 'smooth',
        });
      } else {
        carouselContainer.value.scrollTo({
          left: currentScroll + scrollAmount,
          behavior: 'smooth',
        });
      }
    };

    const handleAnnotationAdded = annotation => {
      emit('annotation-added', annotation);
    };

    const isPDF = format => format?.toLowerCase().includes('pdf');
    const isImage = format =>
      format?.toLowerCase().includes('image') ||
      ['jpg', 'jpeg', 'png', 'gif', 'bmp'].some(ext => format?.toLowerCase().includes(ext));

    const getCategoryLabel = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.label || category;
    };

    const getUrgencyLabel = urgency => {
      const urg = urgencyLevels.find(u => u.value === urgency);
      return urg?.label || urgency;
    };

    const formatDate = date => getDateAndHour(date);

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      isFullscreen.value = !!document.fullscreenElement;
    };

    onMounted(() => {
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    });

    onUnmounted(() => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    return {
      selectedDocument,
      loading,
      showAnnotations,
      isFullscreen,
      carouselContainer,
      selectDocument,
      previewDocument,
      downloadDocument,
      toggleAnnotations,
      toggleFullscreen,
      scrollCarousel,
      handleAnnotationAdded,
      isPDF,
      isImage,
      getCategoryLabel,
      getUrgencyLabel,
      formatDate,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.document-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  border-radius: 0.75rem;
  overflow: hidden;
}

.document-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.document-info {
  flex: 1;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.document-icon {
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.document-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.document-metadata {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.document-date {
  font-size: 0.85rem;
  color: #6c757d;
}

.document-category {
  padding: 0.25rem 0.5rem;
  background: #e9ecef;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #495057;
}

.document-urgency {
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

.document-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
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

.btn-action:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.btn-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-download:hover:not(:disabled) {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.btn-annotate.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.document-viewer-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.document-viewer-main.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  background: white;
}

.viewer-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.viewer-empty-state {
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.viewer-empty-state h4 {
  margin-bottom: 0.5rem;
  color: #495057;
}

.document-carousel {
  background: white;
  border-top: 1px solid #e9ecef;
  padding: 1rem;
}

.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.carousel-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
}

.carousel-controls {
  display: flex;
  gap: 0.25rem;
}

.carousel-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: white;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.carousel-btn:hover {
  background: #f8f9fa;
  color: #495057;
}

.carousel-container {
  overflow-x: auto;
  scroll-behavior: smooth;
}

.carousel-track {
  display: flex;
  gap: 1rem;
  padding-bottom: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .document-viewer-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .document-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .carousel-track {
    gap: 0.5rem;
  }
}
</style>
