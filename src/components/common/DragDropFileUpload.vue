<template>
  <div class="drag-drop-upload-wrapper">
    <div
      ref="dropZone"
      :class="[
        'drag-drop-zone',
        {
          'is-dragging': isDragging,
          'has-file': selectedFile,
          'is-disabled': disabled,
        },
      ]"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
      @click="!disabled && !selectedFile && triggerFileInput()"
    >
      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :disabled="disabled"
        @change="handleFileSelect"
        class="file-input-hidden"
      />

      <!-- Upload area content -->
      <div v-if="!selectedFile" class="upload-content">
        <div class="upload-icon-wrapper">
          <i class="bi bi-cloud-upload upload-main-icon"></i>
          <div class="upload-icon-background"></div>
        </div>
        <h4 class="upload-title">{{ title || $t('businessDocument.uploadNewDocument') }}</h4>
        <p class="upload-subtitle">
          {{
            subtitle ||
            $t('businessDocument.dragDropOrClick') ||
            'Arraste e solte o arquivo aqui ou clique para selecionar'
          }}
        </p>
        <div class="upload-hint">
          <i class="bi bi-file-earmark-text me-1"></i>
          <span>{{ acceptedFormats || 'PDF, JPG, PNG (máx. 5MB)' }}</span>
        </div>
      </div>

      <!-- File preview -->
      <div v-if="selectedFile" class="file-preview-container">
        <div class="file-preview-content">
          <div class="file-icon-wrapper">
            <i :class="fileIconClass"></i>
          </div>
          <div class="file-info">
            <span class="file-name" :title="selectedFile.name"
              >{{ getFileExtension(selectedFile.name).toUpperCase() }} •
              {{ formatFileSize(selectedFile.size) }}</span
            >
          </div>
          <button
            v-if="!disabled"
            type="button"
            class="btn-remove-file"
            @click.stop="removeFile"
            :title="$t('common.remove') || 'Remover'"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="loading" class="upload-loading-overlay">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="loading-text">{{ loadingText || 'Carregando...' }}</span>
      </div>
    </div>

    <!-- Error messages -->
    <div v-if="errorMessage" class="upload-error">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'DragDropFileUpload',
  props: {
    modelValue: {
      type: File,
      default: null,
    },
    accept: {
      type: String,
      default: '.pdf,.jpg,.jpeg,.png',
    },
    maxSize: {
      type: Number,
      default: 5000000, // 5MB in bytes
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    loadingText: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    subtitle: {
      type: String,
      default: '',
    },
    acceptedFormats: {
      type: String,
      default: '',
    },
    validateOnSelect: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['update:modelValue', 'file-selected', 'file-removed', 'error'],
  setup(props, { emit }) {
    const dropZone = ref(null);
    const fileInput = ref(null);
    const isDragging = ref(false);
    const selectedFile = ref(props.modelValue);
    const errorMessage = ref('');

    // Watch for external changes to modelValue
    watch(
      () => props.modelValue,
      newValue => {
        selectedFile.value = newValue;
        errorMessage.value = '';
      }
    );

    const fileIconClass = computed(() => {
      if (!selectedFile.value) return 'bi bi-file-earmark';
      const type = selectedFile.value.type;
      if (type === 'application/pdf') return 'bi bi-file-earmark-pdf-fill';
      if (type.startsWith('image/')) return 'bi bi-file-earmark-image-fill';
      return 'bi bi-file-earmark-fill';
    });

    const validateFile = file => {
      errorMessage.value = '';

      // Check file size
      if (file.size === 0 || file.size > props.maxSize) {
        const maxSizeMB = (props.maxSize / 1000000).toFixed(2);
        errorMessage.value = `O arquivo deve ter no máximo ${maxSizeMB}MB`;
        return false;
      }

      // Check file type
      const acceptedTypes = props.accept.split(',').map(ext => ext.trim());
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      const isValidType =
        acceptedTypes.some(ext => {
          if (ext.startsWith('.')) {
            return ext.toLowerCase() === fileExtension;
          }
          // Handle MIME types
          return file.type && file.type.includes(ext.replace('.', ''));
        }) ||
        acceptedTypes.some(ext => {
          // Check MIME type
          if (ext.includes('/')) {
            return file.type === ext;
          }
          return false;
        });

      if (!isValidType) {
        errorMessage.value = 'Tipo de arquivo não permitido. Use: ' + props.accept;
        return false;
      }

      return true;
    };

    const handleFile = file => {
      if (!file) return;

      if (props.validateOnSelect && !validateFile(file)) {
        emit('error', errorMessage.value);
        return;
      }

      selectedFile.value = file;
      errorMessage.value = '';
      emit('update:modelValue', file);
      emit('file-selected', file);
    };

    const handleDragOver = event => {
      if (props.disabled) return;
      event.preventDefault();
      isDragging.value = true;
    };

    const handleDragLeave = event => {
      if (props.disabled) return;
      event.preventDefault();
      // Only set isDragging to false if we're leaving the drop zone
      if (!dropZone.value?.contains(event.relatedTarget)) {
        isDragging.value = false;
      }
    };

    const handleDrop = event => {
      if (props.disabled) return;
      event.preventDefault();
      isDragging.value = false;

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const handleFileSelect = event => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    };

    const triggerFileInput = () => {
      if (!props.disabled && fileInput.value) {
        fileInput.value.click();
      }
    };

    const removeFile = () => {
      selectedFile.value = null;
      errorMessage.value = '';
      if (fileInput.value) {
        fileInput.value.value = '';
      }
      emit('update:modelValue', null);
      emit('file-removed');
    };

    const formatFileSize = bytes => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileExtension = fileName => fileName.split('.').pop().toLowerCase();

    return {
      dropZone,
      fileInput,
      isDragging,
      selectedFile,
      errorMessage,
      fileIconClass,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileSelect,
      triggerFileInput,
      removeFile,
      formatFileSize,
      getFileExtension,
    };
  },
};
</script>

<style scoped>
.drag-drop-upload-wrapper {
  width: 100%;
}

.drag-drop-zone {
  position: relative;
  width: 100%;
  min-height: 100px;
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 0.875rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.drag-drop-zone:hover:not(.is-disabled):not(.has-file) {
  border-color: var(--azul-turno, #007bff);
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.02) 0%, rgba(0, 123, 255, 0.05) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.drag-drop-zone.is-dragging {
  border-color: var(--azul-turno, #007bff);
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.08) 0%, rgba(0, 123, 255, 0.12) 100%);
  border-style: solid;
  box-shadow: 0 8px 24px rgba(0, 123, 255, 0.2);
  transform: scale(1.02);
}

.drag-drop-zone.has-file {
  border-color: var(--verde-tu, #28a745);
  border-style: solid;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.02) 0%, rgba(40, 167, 69, 0.05) 100%);
  min-height: auto;
  padding: 0.5rem;
}

.drag-drop-zone.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-content {
  text-align: center;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.upload-icon-wrapper {
  position: relative;
  margin-bottom: 0.5rem;
}

.upload-main-icon {
  font-size: 2rem;
  color: var(--azul-turno, #007bff);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.upload-icon-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%);
  border-radius: 50%;
  border-radius: 50%;
  z-index: 1;
}

.drag-drop-zone.is-dragging .upload-main-icon {
  color: var(--azul-turno, #007bff);
  transform: scale(1.1);
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text, #212529);
  margin: 0;
  transition: color 0.3s ease;
}

.drag-drop-zone.is-dragging .upload-title {
  color: var(--azul-turno, #007bff);
}

.upload-subtitle {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.6);
  margin: 0;
  max-width: 400px;
}

.upload-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 1.5rem;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
  margin-top: 0.5rem;
}

/* File Preview Styles */
.file-preview-container {
  width: 100%;
}

.file-preview-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.file-icon-wrapper {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno, #007bff) 0%, var(--verde-tu, #28a745) 100%);
  border-radius: 0.5rem;
  color: white;
  font-size: 1.5rem;
}

.file-icon-wrapper i {
  font-size: 1.5rem;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: var(--color-text, #212529);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
}

.file-size {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
}

.btn-remove-file {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.btn-remove-file:hover {
  background: #dc3545;
  color: white;
  transform: scale(1.1);
}

/* Loading Overlay */
.upload-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  z-index: 10;
  border-radius: 0.875rem;
}

.loading-text {
  font-size: 0.9rem;
  color: var(--color-text, #212529);
  font-weight: 500;
}

/* Error Message */
.upload-error {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 0.5rem;
  color: #dc3545;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}

.upload-error i {
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .drag-drop-zone {
    min-height: 180px;
    padding: 1.5rem;
  }

  .upload-main-icon {
    font-size: 2.5rem;
  }

  .upload-title {
    font-size: 1.1rem;
  }

  .upload-subtitle {
    font-size: 0.85rem;
  }

  .file-preview-content {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .file-icon-wrapper {
    width: 40px;
    height: 40px;
    font-size: 1.25rem;
  }
}
</style>
