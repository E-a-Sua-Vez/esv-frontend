<template>
  <div class="pdf-viewer-container">
    <!-- PDF Viewer Controls -->
    <div class="pdf-controls">
      <div class="pdf-navigation">
        <button @click="previousPage" :disabled="currentPage <= 1" class="pdf-nav-btn">
          <i class="bi bi-chevron-left"></i>
        </button>
        <span class="page-info">
          <input
            v-model="currentPage"
            @change="goToPage"
            type="number"
            :min="1"
            :max="totalPages"
            class="page-input"
          />
          / {{ totalPages }}
        </span>
        <button @click="nextPage" :disabled="currentPage >= totalPages" class="pdf-nav-btn">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <div class="pdf-zoom-controls">
        <button @click="zoomOut" :disabled="scale <= 0.5" class="zoom-btn">
          <i class="bi bi-dash-circle"></i>
        </button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" :disabled="scale >= 3" class="zoom-btn">
          <i class="bi bi-plus-circle"></i>
        </button>
        <button @click="fitToWidth" class="zoom-btn">
          <i class="bi bi-arrows-angle-expand"></i>
        </button>
      </div>

      <div class="pdf-tools" v-if="showAnnotations">
        <button
          @click="setAnnotationMode('highlight')"
          :class="{ active: annotationMode === 'highlight' }"
          class="tool-btn"
        >
          <i class="bi bi-highlighter"></i>
        </button>
        <button
          @click="setAnnotationMode('note')"
          :class="{ active: annotationMode === 'note' }"
          class="tool-btn"
        >
          <i class="bi bi-sticky"></i>
        </button>
        <button
          @click="setAnnotationMode('draw')"
          :class="{ active: annotationMode === 'draw' }"
          class="tool-btn"
        >
          <i class="bi bi-pencil"></i>
        </button>
      </div>
    </div>

    <!-- PDF Canvas Container -->
    <div class="pdf-canvas-container" ref="canvasContainer">
      <div class="pdf-loading" v-if="loading">
        <div class="loading-spinner"></div>
        <p>Cargando PDF...</p>
      </div>

      <div class="pdf-error" v-else-if="error">
        <i class="bi bi-exclamation-triangle"></i>
        <p>Error al cargar el PDF</p>
        <button @click="loadPDF" class="retry-btn">Reintentar</button>
      </div>

      <div v-else class="pdf-pages">
        <div
          v-for="pageNum in visiblePages"
          :key="pageNum"
          class="pdf-page-container"
          :ref="el => setPageRef(el, pageNum)"
        >
          <canvas
            :id="`pdf-canvas-${pageNum}`"
            class="pdf-canvas"
            @mousedown="startAnnotation"
            @mousemove="continueAnnotation"
            @mouseup="endAnnotation"
          ></canvas>

          <!-- Annotation Layer -->
          <div class="annotation-layer" v-if="showAnnotations">
            <div
              v-for="annotation in getPageAnnotations(pageNum)"
              :key="annotation.id"
              class="annotation"
              :class="annotation.type"
              :style="getAnnotationStyle(annotation)"
              @click="selectAnnotation(annotation)"
            >
              <div v-if="annotation.type === 'note'" class="note-content">
                {{ annotation.content }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { getClientDocument } from '../../../application/services/document';

export default {
  name: 'PDFViewer',
  props: {
    document: { type: Object, required: true },
    showAnnotations: { type: Boolean, default: false },
  },
  emits: ['annotation-added'],
  setup(props, { emit }) {
    const canvasContainer = ref(null);
    const currentPage = ref(1);
    const totalPages = ref(0);
    const scale = ref(1.0);
    const loading = ref(true);
    const error = ref(false);
    const pdfDoc = ref(null);
    const pageRefs = ref(new Map());

    // Annotation state
    const annotationMode = ref(null);
    const annotations = ref([]);
    const isAnnotating = ref(false);
    const currentAnnotation = ref(null);

    // Computed properties
    const visiblePages = computed(() =>
      // For now, show current page only. In a full implementation,
      // you might want to show multiple pages for better UX
      [currentPage.value],
    );

    // PDF.js integration (simplified - you'll need to install pdf.js)
    const loadPDF = async () => {
      try {
        loading.value = true;
        error.value = false;

        // Get PDF blob from backend
        const pdfBlob = await getClientDocument(
          props.document.commerceId,
          props.document.option,
          props.document.name
        );

        // Convert blob to array buffer
        const arrayBuffer = await pdfBlob.arrayBuffer();

        // Load PDF with PDF.js (this is a simplified version)
        // In a real implementation, you'd use:
        // const pdfjsLib = await import('pdfjs-dist');
        // pdfDoc.value = await pdfjsLib.getDocument(arrayBuffer).promise;

        // For now, simulate loading
        setTimeout(() => {
          totalPages.value = 5; // Simulated
          loading.value = false;
          renderPage(currentPage.value);
        }, 1000);
      } catch (err) {
        console.error('Error loading PDF:', err);
        error.value = true;
        loading.value = false;
      }
    };

    const renderPage = async pageNumber => {
      if (!pdfDoc.value) return;

      try {
        // This is a simplified version. In a real implementation:
        // const page = await pdfDoc.value.getPage(pageNumber);
        // const viewport = page.getViewport({ scale: scale.value });
        // const canvas = document.getElementById(`pdf-canvas-${pageNumber}`);
        // const context = canvas.getContext('2d');
        // canvas.width = viewport.width;
        // canvas.height = viewport.height;
        // await page.render({ canvasContext: context, viewport }).promise;

        // Simulate rendering
        const canvas = document.getElementById(`pdf-canvas-${pageNumber}`);
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.width = 800 * scale.value;
          canvas.height = 1000 * scale.value;

          // Draw a placeholder
          context.fillStyle = '#f8f9fa';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#6c757d';
          context.font = '24px Arial';
          context.textAlign = 'center';
          context.fillText(`PDF Page ${pageNumber}`, canvas.width / 2, canvas.height / 2);
          context.fillText(props.document.name, canvas.width / 2, canvas.height / 2 + 40);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    // Navigation methods
    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
      }
    };

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    };

    const goToPage = () => {
      if (currentPage.value >= 1 && currentPage.value <= totalPages.value) {
        renderPage(currentPage.value);
      }
    };

    // Zoom methods
    const zoomIn = () => {
      scale.value = Math.min(scale.value * 1.2, 3);
      renderPage(currentPage.value);
    };

    const zoomOut = () => {
      scale.value = Math.max(scale.value / 1.2, 0.5);
      renderPage(currentPage.value);
    };

    const fitToWidth = () => {
      if (canvasContainer.value) {
        const containerWidth = canvasContainer.value.clientWidth - 40; // padding
        scale.value = containerWidth / 800; // 800 is base width
        renderPage(currentPage.value);
      }
    };

    // Annotation methods
    const setAnnotationMode = mode => {
      annotationMode.value = annotationMode.value === mode ? null : mode;
    };

    const startAnnotation = event => {
      if (!annotationMode.value) return;

      isAnnotating.value = true;
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      currentAnnotation.value = {
        id: Date.now(),
        type: annotationMode.value,
        page: currentPage.value,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        content: '',
        createdAt: new Date(),
      };
    };

    const continueAnnotation = event => {
      if (!isAnnotating.value || !currentAnnotation.value) return;

      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      currentAnnotation.value.endX = x;
      currentAnnotation.value.endY = y;
    };

    const endAnnotation = () => {
      if (!isAnnotating.value || !currentAnnotation.value) return;

      isAnnotating.value = false;

      if (annotationMode.value === 'note') {
        const content = prompt('Ingrese el contenido de la nota:');
        if (content) {
          currentAnnotation.value.content = content;
          annotations.value.push({ ...currentAnnotation.value });
          emit('annotation-added', currentAnnotation.value);
        }
      } else {
        annotations.value.push({ ...currentAnnotation.value });
        emit('annotation-added', currentAnnotation.value);
      }

      currentAnnotation.value = null;
    };

    const getPageAnnotations = pageNumber =>
      annotations.value.filter(ann => ann.page === pageNumber);

    const getAnnotationStyle = annotation => ({
      left: `${Math.min(annotation.startX, annotation.endX)}px`,
      top: `${Math.min(annotation.startY, annotation.endY)}px`,
      width: `${Math.abs(annotation.endX - annotation.startX)}px`,
      height: `${Math.abs(annotation.endY - annotation.startY)}px`,
    });

    const selectAnnotation = annotation => {};

    const setPageRef = (el, pageNum) => {
      if (el) {
        pageRefs.value.set(pageNum, el);
      }
    };

    // Watchers
    watch(
      () => currentPage.value,
      newPage => {
        renderPage(newPage);
      },
    );

    watch(
      () => props.document,
      () => {
        if (props.document) {
          loadPDF();
        }
      },
      { immediate: true },
    );

    // Lifecycle
    onMounted(() => {
      if (props.document) {
        loadPDF();
      }
    });

    return {
      canvasContainer,
      currentPage,
      totalPages,
      scale,
      loading,
      error,
      visiblePages,
      annotationMode,
      nextPage,
      previousPage,
      goToPage,
      zoomIn,
      zoomOut,
      fitToWidth,
      setAnnotationMode,
      startAnnotation,
      continueAnnotation,
      endAnnotation,
      getPageAnnotations,
      getAnnotationStyle,
      selectAnnotation,
      setPageRef,
      loadPDF,
    };
  },
};
</script>

<style scoped>
.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2c3e50;
  border-radius: 0.5rem;
  overflow: hidden;
}

.pdf-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #34495e;
  border-bottom: 1px solid #4a5f7a;
  flex-wrap: wrap;
  gap: 1rem;
}

.pdf-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pdf-nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a5f7a;
  border: none;
  border-radius: 0.25rem;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.pdf-nav-btn:hover:not(:disabled) {
  background: #5a6f8a;
}

.pdf-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  color: white;
  font-size: 0.9rem;
  gap: 0.25rem;
}

.page-input {
  width: 50px;
  padding: 0.25rem;
  border: 1px solid #4a5f7a;
  border-radius: 0.25rem;
  background: #2c3e50;
  color: white;
  text-align: center;
  font-size: 0.9rem;
}

.pdf-zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a5f7a;
  border: none;
  border-radius: 0.25rem;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.zoom-btn:hover:not(:disabled) {
  background: #5a6f8a;
}

.zoom-level {
  color: white;
  font-size: 0.9rem;
  min-width: 50px;
  text-align: center;
}

.pdf-tools {
  display: flex;
  gap: 0.5rem;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4a5f7a;
  border: none;
  border-radius: 0.25rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #5a6f8a;
}

.tool-btn.active {
  background: var(--azul-turno);
}

.pdf-canvas-container {
  flex: 1;
  overflow: auto;
  background: #34495e;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pdf-loading,
.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #4a5f7a;
  border-top: 4px solid white;
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

.pdf-error i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #e74c3c;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: var(--azul-turno);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  margin-top: 1rem;
}

.pdf-pages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.pdf-page-container {
  position: relative;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-radius: 0.25rem;
  overflow: hidden;
}

.pdf-canvas {
  display: block;
  cursor: crosshair;
}

.annotation-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.annotation {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
}

.annotation.highlight {
  background: rgba(255, 255, 0, 0.3);
  border: 1px solid #ffc107;
}

.annotation.note {
  background: rgba(0, 123, 255, 0.1);
  border: 2px solid var(--azul-turno);
  border-radius: 0.25rem;
}

.annotation.draw {
  border: 2px solid #e74c3c;
}

.note-content {
  background: white;
  padding: 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  font-size: 0.8rem;
  max-width: 200px;
  word-wrap: break-word;
}

/* Responsive Design */
@media (max-width: 768px) {
  .pdf-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  .pdf-navigation,
  .pdf-zoom-controls,
  .pdf-tools {
    justify-content: center;
  }
}
</style>
