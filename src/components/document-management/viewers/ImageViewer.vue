<template>
  <div class="image-viewer-container">
    <!-- Image Viewer Controls -->
    <div class="image-controls">
      <div class="image-navigation" v-if="hasMultipleImages">
        <button @click="previousImage" :disabled="currentImageIndex <= 0" class="nav-btn">
          <i class="bi bi-chevron-left"></i>
        </button>
        <span class="image-counter"> {{ currentImageIndex + 1 }} / {{ images.length }} </span>
        <button
          @click="nextImage"
          :disabled="currentImageIndex >= images.length - 1"
          class="nav-btn"
        >
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <div class="image-zoom-controls">
        <button @click="zoomOut" :disabled="scale <= 0.1" class="zoom-btn">
          <i class="bi bi-dash-circle"></i>
        </button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" :disabled="scale >= 5" class="zoom-btn">
          <i class="bi bi-plus-circle"></i>
        </button>
        <button @click="resetZoom" class="zoom-btn">
          <i class="bi bi-aspect-ratio"></i>
        </button>
        <button @click="fitToScreen" class="zoom-btn">
          <i class="bi bi-arrows-fullscreen"></i>
        </button>
      </div>

      <div class="image-tools">
        <button @click="rotateLeft" class="tool-btn">
          <i class="bi bi-arrow-counterclockwise"></i>
        </button>
        <button @click="rotateRight" class="tool-btn">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button @click="toggleContrast" class="tool-btn" :class="{ active: contrastMode }">
          <i class="bi bi-circle-half"></i>
        </button>
        <button @click="toggleInvert" class="tool-btn" :class="{ active: invertMode }">
          <i class="bi bi-palette"></i>
        </button>
      </div>

      <div class="annotation-tools" v-if="showAnnotations">
        <button
          @click="setAnnotationMode('arrow')"
          :class="{ active: annotationMode === 'arrow' }"
          class="tool-btn"
        >
          <i class="bi bi-arrow-up-right"></i>
        </button>
        <button
          @click="setAnnotationMode('circle')"
          :class="{ active: annotationMode === 'circle' }"
          class="tool-btn"
        >
          <i class="bi bi-circle"></i>
        </button>
        <button
          @click="setAnnotationMode('text')"
          :class="{ active: annotationMode === 'text' }"
          class="tool-btn"
        >
          <i class="bi bi-fonts"></i>
        </button>
      </div>
    </div>

    <!-- Image Display Area -->
    <div class="image-display-area" ref="displayArea">
      <div class="image-loading" v-if="loading">
        <div class="loading-spinner"></div>
        <p>Cargando imagen...</p>
      </div>

      <div class="image-error" v-else-if="error">
        <i class="bi bi-exclamation-triangle"></i>
        <p>Error al cargar la imagen</p>
        <button @click="loadImage" class="retry-btn">Reintentar</button>
      </div>

      <div
        v-else
        class="image-container"
        ref="imageContainer"
        @wheel="handleWheel"
        @mousedown="startPan"
        @mousemove="continuePan"
        @mouseup="endPan"
        @mouseleave="endPan"
      >
        <img
          ref="imageElement"
          :src="currentImageUrl"
          :style="imageStyle"
          @load="onImageLoad"
          @error="onImageError"
          class="main-image"
          draggable="false"
        />

        <!-- Annotation Layer -->
        <div class="annotation-layer" v-if="showAnnotations">
          <div
            v-for="annotation in annotations"
            :key="annotation.id"
            class="annotation"
            :class="annotation.type"
            :style="getAnnotationStyle(annotation)"
          >
            <span v-if="annotation.type === 'text'">{{ annotation.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { getClientDocument } from '../../../application/services/document';

export default {
  name: 'ImageViewer',
  props: {
    document: { type: Object, required: true },
    showAnnotations: { type: Boolean, default: false },
  },
  emits: ['annotation-added'],
  setup(props, { emit }) {
    const displayArea = ref(null);
    const imageContainer = ref(null);
    const imageElement = ref(null);

    // Image state
    const loading = ref(true);
    const error = ref(false);
    const currentImageIndex = ref(0);
    const images = ref([]);
    const scale = ref(1);
    const rotation = ref(0);
    const panX = ref(0);
    const panY = ref(0);
    const contrastMode = ref(false);
    const invertMode = ref(false);

    // Pan state
    const isPanning = ref(false);
    const lastPanX = ref(0);
    const lastPanY = ref(0);

    // Annotation state
    const annotationMode = ref(null);
    const annotations = ref([]);
    const isAnnotating = ref(false);
    const currentAnnotation = ref(null);

    // Computed properties
    const hasMultipleImages = computed(() => images.value.length > 1);

    const currentImageUrl = computed(() => images.value[currentImageIndex.value]?.url || '');

    const imageStyle = computed(() => {
      const filters = [];
      if (contrastMode.value) filters.push('contrast(150%)');
      if (invertMode.value) filters.push('invert(1)');

      return {
        transform: `scale(${scale.value}) rotate(${rotation.value}deg) translate(${panX.value}px, ${panY.value}px)`,
        filter: filters.join(' '),
        transformOrigin: 'center center',
        transition: isPanning.value ? 'none' : 'transform 0.2s ease',
      };
    });

    // Image loading
    const loadImage = async () => {
      try {
        loading.value = true;
        error.value = false;

        const imageBlob = await getClientDocument(
          props.document.commerceId,
          props.document.clientId,
          'patient_documents',
          props.document.name
        );

        const imageUrl = URL.createObjectURL(imageBlob);

        images.value = [
          {
            url: imageUrl,
            name: props.document.name,
          },
        ];

        loading.value = false;
      } catch (err) {
        console.error('Error loading image:', err);
        error.value = true;
        loading.value = false;
      }
    };

    const onImageLoad = () => {
      resetZoom();
    };

    const onImageError = () => {
      error.value = true;
      loading.value = false;
    };

    // Navigation
    const nextImage = () => {
      if (currentImageIndex.value < images.value.length - 1) {
        currentImageIndex.value++;
        resetTransform();
      }
    };

    const previousImage = () => {
      if (currentImageIndex.value > 0) {
        currentImageIndex.value--;
        resetTransform();
      }
    };

    // Zoom and pan
    const zoomIn = () => {
      scale.value = Math.min(scale.value * 1.2, 5);
    };

    const zoomOut = () => {
      scale.value = Math.max(scale.value / 1.2, 0.1);
    };

    const resetZoom = () => {
      scale.value = 1;
      panX.value = 0;
      panY.value = 0;
    };

    const fitToScreen = () => {
      if (!displayArea.value || !imageElement.value) return;

      const containerWidth = displayArea.value.clientWidth;
      const containerHeight = displayArea.value.clientHeight;
      const imageWidth = imageElement.value.naturalWidth;
      const imageHeight = imageElement.value.naturalHeight;

      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;

      scale.value = Math.min(scaleX, scaleY) * 0.9;
      panX.value = 0;
      panY.value = 0;
    };

    const handleWheel = event => {
      event.preventDefault();
      if (event.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    };

    const startPan = event => {
      if (annotationMode.value) return;

      isPanning.value = true;
      lastPanX.value = event.clientX;
      lastPanY.value = event.clientY;
    };

    const continuePan = event => {
      if (!isPanning.value) return;

      const deltaX = event.clientX - lastPanX.value;
      const deltaY = event.clientY - lastPanY.value;

      panX.value += deltaX / scale.value;
      panY.value += deltaY / scale.value;

      lastPanX.value = event.clientX;
      lastPanY.value = event.clientY;
    };

    const endPan = () => {
      isPanning.value = false;
    };

    // Image transformations
    const rotateLeft = () => {
      rotation.value -= 90;
    };

    const rotateRight = () => {
      rotation.value += 90;
    };

    const toggleContrast = () => {
      contrastMode.value = !contrastMode.value;
    };

    const toggleInvert = () => {
      invertMode.value = !invertMode.value;
    };

    const resetTransform = () => {
      scale.value = 1;
      rotation.value = 0;
      panX.value = 0;
      panY.value = 0;
      contrastMode.value = false;
      invertMode.value = false;
    };

    // Annotations
    const setAnnotationMode = mode => {
      annotationMode.value = annotationMode.value === mode ? null : mode;
    };

    const getAnnotationStyle = annotation => ({
      left: `${annotation.x}px`,
      top: `${annotation.y}px`,
      width: `${annotation.width || 'auto'}`,
      height: `${annotation.height || 'auto'}`,
    });

    // Watchers
    watch(
      () => props.document,
      () => {
        if (props.document) {
          loadImage();
        }
      },
      { immediate: true },
    );

    return {
      displayArea,
      imageContainer,
      imageElement,
      loading,
      error,
      currentImageIndex,
      images,
      scale,
      rotation,
      contrastMode,
      invertMode,
      annotationMode,
      annotations,
      hasMultipleImages,
      currentImageUrl,
      imageStyle,
      loadImage,
      onImageLoad,
      onImageError,
      nextImage,
      previousImage,
      zoomIn,
      zoomOut,
      resetZoom,
      fitToScreen,
      handleWheel,
      startPan,
      continuePan,
      endPan,
      rotateLeft,
      rotateRight,
      toggleContrast,
      toggleInvert,
      setAnnotationMode,
      getAnnotationStyle,
    };
  },
};
</script>

<style scoped>
.image-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #2c3e50;
  border-radius: 0.5rem;
  overflow: hidden;
}

.image-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #34495e;
  border-bottom: 1px solid #4a5f7a;
  flex-wrap: wrap;
  gap: 1rem;
}

.nav-btn,
.zoom-btn,
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

.nav-btn:hover:not(:disabled),
.zoom-btn:hover:not(:disabled),
.tool-btn:hover {
  background: #5a6f8a;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.active {
  background: var(--azul-turno);
}

.image-counter,
.zoom-level {
  color: white;
  font-size: 0.9rem;
  min-width: 60px;
  text-align: center;
}

.image-zoom-controls,
.image-tools,
.annotation-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.image-display-area {
  flex: 1;
  overflow: hidden;
  background: #34495e;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.image-loading,
.image-error {
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

.image-error i {
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

.image-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: grab;
}

.image-container:active {
  cursor: grabbing;
}

.main-image {
  max-width: 100%;
  max-height: 100%;
  user-select: none;
  pointer-events: none;
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

.annotation.text {
  background: rgba(231, 76, 60, 0.8);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .image-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  .image-navigation,
  .image-zoom-controls,
  .image-tools,
  .annotation-tools {
    justify-content: center;
  }
}
</style>
