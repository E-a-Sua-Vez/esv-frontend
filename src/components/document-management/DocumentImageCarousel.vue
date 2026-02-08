<template>
  <div v-if="show" class="carousel-overlay" @click="closeCarousel">
    <div class="carousel-container" @click.stop>
      <!-- Header -->
      <div class="modal-header border-0 active-name modern-modal-header">
        <div class="modern-modal-header-inner">
          <div class="modern-modal-icon-wrapper">
            <i class="bi bi-images"></i>
          </div>
          <div class="modern-modal-title-wrapper">
            <h5 class="modal-title fw-bold modern-modal-title">
              {{ currentDocument?.name || $t('documentImageCarousel.image') }}
            </h5>
            <p class="modern-modal-client-name">
              {{ currentIndex + 1 }} de {{ images.length }} {{ $t('documentImageCarousel.images') }}
            </p>
          </div>
        </div>
        <div class="carousel-actions">
          <button @click="closeCarousel" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Main Image Display -->
      <div class="carousel-main">
        <!-- Navigation Arrows -->
        <button
          v-if="images.length > 1"
          @click="previousImage"
          class="nav-arrow nav-prev"
          :disabled="currentIndex === 0"
        >
          <i class="bi bi-chevron-left"></i>
        </button>

        <!-- Image Container -->
        <div class="image-container" ref="imageContainer">
          <div
            class="image-wrapper"
            :style="{ transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)` }"
            @mousedown="startPan"
            @wheel="handleZoom"
          >
            <img
              v-if="currentDocument && !imageError"
              :src="getImageUrl(currentDocument)"
              :alt="currentDocument.name"
              class="main-image"
              @load="handleImageLoad"
              @error="handleImageError"
              draggable="false"
            />
            <div v-if="imageLoading" class="image-loading">
              <div class="loading-spinner"></div>
              <span>Cargando imagen...</span>
            </div>
            <div v-if="imageError" class="image-error">
              <i class="bi bi-exclamation-triangle"></i>
              <span>Error al cargar la imagen</span>
              <button @click="retryLoadImage" class="retry-btn">
                <i class="bi bi-arrow-clockwise"></i>
                Reintentar
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button
          v-if="images.length > 1"
          @click="nextImage"
          class="nav-arrow nav-next"
          :disabled="currentIndex === images.length - 1"
        >
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <!-- Zoom Controls -->
      <div class="zoom-controls">
        <button @click="zoomOut" class="zoom-btn" :disabled="zoomLevel <= 0.25">
          <i class="bi bi-zoom-out"></i>
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="zoomIn" class="zoom-btn" :disabled="zoomLevel >= 4">
          <i class="bi bi-zoom-in"></i>
        </button>
        <button @click="resetZoom" class="zoom-btn" title="Ajustar a pantalla">
          <i class="bi bi-aspect-ratio"></i>
        </button>
        <button @click="rotateImage" class="zoom-btn" title="Rotar">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          @click="toggleFullscreen"
          class="zoom-btn"
          :title="$t('documentImageCarousel.fullscreen')"
        >
          <i :class="isFullscreen ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'"></i>
        </button>
        <button
          @click="downloadCurrent"
          class="zoom-btn"
          :title="$t('documentImageCarousel.download')"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>

      <!-- Thumbnail Strip -->
      <div v-if="images.length > 1" class="thumbnail-strip">
        <div class="thumbnails-container">
          <div
            v-for="(image, index) in images"
            :key="image.id"
            class="thumbnail-item"
            :class="{ active: index === currentIndex }"
            @click="goToImage(index)"
          >
            <img :src="getThumbnailUrl(image)" :alt="image.name" class="thumbnail-image" />
            <div class="thumbnail-overlay">
              <i class="bi bi-eye"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Info Panel -->
      <div class="info-panel" :class="{ expanded: showInfo }">
        <button @click="toggleInfo" class="info-toggle">
          <i :class="showInfo ? 'bi-chevron-down' : 'bi-chevron-up'"></i>
          Información
        </button>
        <div v-if="showInfo" class="info-content">
          <div class="info-row">
            <label>Nombre:</label>
            <span>{{ currentDocument?.name }}</span>
          </div>
          <div class="info-row">
            <label>Fecha:</label>
            <span>{{ formatDate(currentDocument?.createdAt) }}</span>
          </div>
          <div class="info-row">
            <label>Tamaño:</label>
            <span>{{ formatFileSize(currentDocument?.fileSize) }}</span>
          </div>
          <div class="info-row">
            <label>Tipo:</label>
            <span>{{ currentDocument?.format }}</span>
          </div>
          <div v-if="currentDocument?.category" class="info-row">
            <label>Categoría:</label>
            <span>{{ getCategoryLabel(currentDocument.category) }}</span>
          </div>
          <div v-if="currentDocument?.tags?.length" class="info-row">
            <label>Tags:</label>
            <div class="tags-list">
              <span v-for="tag in currentDocument.tags" :key="tag" class="tag-chip">
                #{{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getClientDocument } from '../../application/services/document';

export default {
  name: 'DocumentImageCarousel',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    documents: {
      type: Array,
      default: () => [],
    },
    initialIndex: {
      type: Number,
      default: 0,
    },
  },
  emits: ['close', 'download'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const currentIndex = ref(0);
    const zoomLevel = ref(1);
    const panX = ref(0);
    const panY = ref(0);
    const rotation = ref(0);
    const imageLoading = ref(false);
    const showInfo = ref(false);
    const isFullscreen = ref(false);
    const imageContainer = ref(null);
    const imageError = ref(false);

    // Pan state
    const isPanning = ref(false);
    const panStartX = ref(0);
    const panStartY = ref(0);
    const panStartPanX = ref(0);
    const panStartPanY = ref(0);

    // Filter only image documents
    const images = computed(() =>
      props.documents.filter(doc => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        return imageTypes.includes(doc.format) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.name);
      })
    );

    const currentDocument = computed(() => images.value[currentIndex.value]);

    const loadImages = async () => {
      for (const doc of images.value) {
        if (!doc.url) {
          try {
            const blob = await getClientDocument(
              doc.commerceId,
              doc.clientId,
              'patient_documents',
              doc.name,
            );
            doc.url = URL.createObjectURL(blob);
          } catch (error) {
            console.error('Error loading image:', doc.name, error);
          }
        }
      }
    };

    // Watch for prop changes
    watch(
      () => props.initialIndex,
      newIndex => {
        if (newIndex >= 0 && newIndex < images.value.length) {
          currentIndex.value = newIndex;
        }
      },
    );

    watch(
      () => props.show,
      async show => {
        if (show) {
          currentIndex.value = props.initialIndex;
          resetView();
          document.addEventListener('keydown', handleKeydown);
          await loadImages();
        } else {
          document.removeEventListener('keydown', handleKeydown);
        }
      },
    );

    // Reset error state when current image changes
    watch(currentIndex, () => {
      imageError.value = false;
      imageLoading.value = true;
    });

    // Methods
    const closeCarousel = () => {
      emit('close');
    };

    const nextImage = () => {
      if (currentIndex.value < images.value.length - 1) {
        currentIndex.value++;
        resetView();
      }
    };

    const previousImage = () => {
      if (currentIndex.value > 0) {
        currentIndex.value--;
        resetView();
      }
    };

    const goToImage = index => {
      currentIndex.value = index;
      resetView();
    };

    const zoomIn = () => {
      zoomLevel.value = Math.min(zoomLevel.value * 1.2, 4);
    };

    const zoomOut = () => {
      zoomLevel.value = Math.max(zoomLevel.value / 1.2, 0.25);
    };

    const resetZoom = () => {
      zoomLevel.value = 1;
      panX.value = 0;
      panY.value = 0;
    };

    const resetView = () => {
      resetZoom();
      rotation.value = 0;
      imageLoading.value = true;
      imageError.value = false;
    };

    const retryLoadImage = () => {
      imageLoading.value = true;
      imageError.value = false;
      // Force reload by updating the src
      const img = imageContainer.value?.querySelector('.main-image');
      if (img && currentDocument.value) {
        img.src = getImageUrl(currentDocument.value) + '?t=' + Date.now();
      }
    };

    const rotateImage = () => {
      rotation.value = (rotation.value + 90) % 360;
    };

    const handleZoom = event => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      zoomLevel.value = Math.max(0.25, Math.min(4, zoomLevel.value * delta));
    };

    const startPan = event => {
      if (zoomLevel.value <= 1) return;

      isPanning.value = true;
      panStartX.value = event.clientX;
      panStartY.value = event.clientY;
      panStartPanX.value = panX.value;
      panStartPanY.value = panY.value;

      document.addEventListener('mousemove', handlePan);
      document.addEventListener('mouseup', stopPan);
    };

    const handlePan = event => {
      if (!isPanning.value) return;

      const deltaX = event.clientX - panStartX.value;
      const deltaY = event.clientY - panStartY.value;

      panX.value = panStartPanX.value + deltaX;
      panY.value = panStartPanY.value + deltaY;
    };

    const stopPan = () => {
      isPanning.value = false;
      document.removeEventListener('mousemove', handlePan);
      document.removeEventListener('mouseup', stopPan);
    };

    const handleKeydown = event => {
      switch (event.key) {
        case 'ArrowLeft':
          previousImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case 'Escape':
          closeCarousel();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        isFullscreen.value = true;
      } else {
        document.exitFullscreen();
        isFullscreen.value = false;
      }
    };

    const toggleInfo = () => {
      showInfo.value = !showInfo.value;
    };

    const downloadCurrent = () => {
      if (currentDocument.value) {
        emit('download', currentDocument.value);
      }
    };

    const handleImageLoad = () => {
      imageLoading.value = false;
      imageError.value = false;
    };

    const handleImageError = () => {
      imageLoading.value = false;
      imageError.value = true;
      console.error('Error loading image:', currentDocument.value?.name);
    };

    const getImageUrl = doc => doc.url || '';
    const getThumbnailUrl = doc => doc.thumbnailUrl || doc.url || '';
    const formatDate = dateStr => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatFileSize = bytes => {
      if (!bytes) return '';
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getCategoryLabel = category => {
      const labels = {
        LABORATORY_RESULTS: 'Laboratorio',
        IMAGING_STUDIES: 'Imágenes Médicas',
        PRESCRIPTIONS: 'Recetas',
        CONSULTATION_NOTES: 'Notas de Consulta',
        OTHER: 'Otros',
      };
      return labels[category] || category;
    };

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousemove', handlePan);
      document.removeEventListener('mouseup', stopPan);
    });

    return {
      currentIndex,
      zoomLevel,
      panX,
      panY,
      rotation,
      imageLoading,
      showInfo,
      isFullscreen,
      imageContainer,
      images,
      currentDocument,
      closeCarousel,
      nextImage,
      previousImage,
      goToImage,
      zoomIn,
      zoomOut,
      resetZoom,
      rotateImage,
      handleZoom,
      startPan,
      toggleFullscreen,
      toggleInfo,
      downloadCurrent,
      handleImageLoad,
      handleImageError,
      retryLoadImage,
      getImageUrl,
      getThumbnailUrl,
      formatDate,
      formatFileSize,
      getCategoryLabel,
      imageError,
    };
  },
};
</script>

<style scoped>
.carousel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

.carousel-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  color: white;
}

.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.carousel-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.image-counter {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 0.25rem;
}

.carousel-actions {
  display: flex;
  gap: 0.5rem;
}

.header-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.header-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn:hover {
  background: #dc3545;
  border-color: #dc3545;
}

.carousel-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.8);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-prev {
  left: 2rem;
}

.nav-next {
  right: 2rem;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}

.image-container:active {
  cursor: grabbing;
}

.image-wrapper {
  transition: transform 0.2s ease;
  transform-origin: center;
}

.main-image {
  max-width: 90vw;
  max-height: 70vh;
  object-fit: contain;
  user-select: none;
}

.image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);
}

.image-error i {
  font-size: 3rem;
  color: #dc3545;
}

.retry-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.zoom-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
}

.zoom-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.375rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.zoom-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.zoom-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-level {
  padding: 0 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  min-width: 60px;
  text-align: center;
}

.thumbnail-strip {
  background: rgba(0, 0, 0, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
}

.thumbnails-container {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.thumbnail-item {
  position: relative;
  width: 80px;
  height: 60px;
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.thumbnail-item.active {
  border-color: var(--azul-turno);
}

.thumbnail-item:hover {
  transform: scale(1.05);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-item:hover .thumbnail-overlay {
  opacity: 1;
}

.info-panel {
  background: rgba(0, 0, 0, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.info-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
}

.info-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

.info-content {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-row label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

.info-row span {
  font-size: 0.875rem;
  color: white;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag-chip {
  padding: 0.25rem 0.5rem;
  background: var(--azul-turno);
  color: white;
  border-radius: 1rem;
  font-size: 0.75rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .carousel-header {
    padding: 0.25rem;
  }

  .carousel-title h3 {
    font-size: 1rem;
  }

  .nav-arrow {
    width: 40px;
    height: 40px;
  }

  .nav-prev {
    left: 1rem;
  }

  .nav-next {
    right: 1rem;
  }

  .main-image {
    max-width: 95vw;
    max-height: 60vh;
  }

  .info-content {
    grid-template-columns: 1fr;
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
