<script>
import { ref, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'PatientPhotoCapture',
  props: {
    show: { type: Boolean, default: false },
    clientId: { type: String, required: true },
    commerceId: { type: String, required: true },
    existingPhoto: { type: Object, default: null },
  },
  emits: ['close', 'photo-captured', 'photo-uploaded'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const videoRef = ref(null);
    const canvasRef = ref(null);
    const fileInputRef = ref(null);
    const stream = ref(null);
    const isCapturing = ref(false);
    const isCameraActive = ref(false);
    const showCamera = ref(false);
    const showUpload = ref(false);
    const capturedPhoto = ref(null);
    const uploadedPhoto = ref(null);
    const cameraError = ref('');
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    // Start camera
    const startCamera = async () => {
      try {
        cameraError.value = '';

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('NotSupportedError');
        }

        // Request camera permissions
        const constraints = {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user', // Front camera preferred for patient photos
          },
        };

        stream.value = await navigator.mediaDevices.getUserMedia(constraints);

        // Set camera state first to render the video element
        isCameraActive.value = true;
        showCamera.value = true;
        showUpload.value = false;

        // Wait for DOM to update and ensure video element is available
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 300));

        if (videoRef.value) {
          videoRef.value.srcObject = stream.value;
          await videoRef.value.play();
        } else {
          console.error('📸 Error: videoRef no está disponible después de esperar');
          // Try to find video element manually
          const videoElement = document.querySelector('.camera-video');
          if (videoElement) {
            videoElement.srcObject = stream.value;
            await videoElement.play();
          } else {
            throw new Error('Video element not available');
          }
        }
      } catch (error) {
        console.error('📸 Error accessing camera:', error);
        cameraError.value = getCameraErrorMessage(error, t);
      }
    };

    // Stop camera
    const stopCamera = () => {
      if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop());
        stream.value = null;
      }
      isCameraActive.value = false;
      showCamera.value = false;
    };

    // Try back camera if front camera fails
    const tryBackCamera = async () => {
      try {
        cameraError.value = '';

        const constraints = {
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'environment', // Back camera
          },
        };

        stream.value = await navigator.mediaDevices.getUserMedia(constraints);

        // Set camera state first to render the video element
        isCameraActive.value = true;
        showCamera.value = true;
        showUpload.value = false;

        // Wait for DOM to update and ensure video element is available
        await nextTick();
        await new Promise(resolve => setTimeout(resolve, 300));

        if (videoRef.value) {
          videoRef.value.srcObject = stream.value;
          await videoRef.value.play();
        }
      } catch (error) {
        console.error('📸 Error with back camera:', error);
        cameraError.value =
          getCameraErrorMessage(error, t) || t('dashboard.photoCapture.errors.noCameraAccess');
      }
    };

    // Capture photo from camera
    const capturePhoto = () => {
      if (!videoRef.value || !canvasRef.value) return;

      isCapturing.value = true;

      const video = videoRef.value;
      const canvas = canvasRef.value;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        blob => {
          if (blob) {
            const photoUrl = URL.createObjectURL(blob);
            capturedPhoto.value = {
              blob,
              url: photoUrl,
              filename: `patient-${props.clientId}-${Date.now()}.jpg`,
            };

            stopCamera();
            isCapturing.value = false;
          } else {
            console.error('📸 Failed to create blob from canvas');
            alert(t('dashboard.photoCapture.errors.captureFailed'));
          }
        },
        'image/jpeg',
        0.9,
      );
    };

    // Handle file upload
    const handleFileUpload = event => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!supportedFormats.includes(file.type)) {
        alert(t('dashboard.photoCapture.errors.fileFormatNotSupported'));
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        alert(t('dashboard.photoCapture.errors.fileTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        uploadedPhoto.value = {
          file,
          url: e.target.result,
          filename: `patient-${props.clientId}-${Date.now()}-${file.name}`,
        };
        showUpload.value = false;
      };
      reader.readAsDataURL(file);
    };

    // Save photo (emit to parent)
    const savePhoto = async () => {
      const photoData = capturedPhoto.value || uploadedPhoto.value;
      if (!photoData) return;

      try {
        if (capturedPhoto.value) {
          emit('photo-captured', {
            blob: photoData.blob,
            filename: photoData.filename,
            clientId: props.clientId,
            commerceId: props.commerceId,
          });
        } else if (uploadedPhoto.value) {
          emit('photo-uploaded', {
            file: photoData.file,
            filename: photoData.filename,
            clientId: props.clientId,
            commerceId: props.commerceId,
          });
        }

        closeModal();
      } catch (error) {
        console.error('Error saving photo:', error);
        alert(t('dashboard.photoCapture.errors.saveFailed'));
      }
    };

    // Reset and try again
    const retakePhoto = () => {
      if (capturedPhoto.value) {
        URL.revokeObjectURL(capturedPhoto.value.url);
        capturedPhoto.value = null;
      }
      if (uploadedPhoto.value) {
        uploadedPhoto.value = null;
      }
      showCamera.value = false;
      showUpload.value = false;
    };

    // Close modal
    const closeModal = () => {
      stopCamera();
      retakePhoto();
      emit('close');
    };

    // Get user-friendly camera error message
    const getCameraErrorMessage = (error, translateFn = t) => {
      switch (error.name) {
        case 'NotAllowedError':
          return translateFn('dashboard.photoCapture.errors.cameraDenied');
        case 'NotFoundError':
          return translateFn('dashboard.photoCapture.errors.cameraNotFound');
        case 'NotReadableError':
          return translateFn('dashboard.photoCapture.errors.cameraNotReadable');
        case 'OverconstrainedError':
          return translateFn('dashboard.photoCapture.errors.cameraOverconstrained');
        case 'NotSupportedError':
          return translateFn('dashboard.photoCapture.errors.cameraNotSupported');
        default:
          const errorMsg = error.message || 'Unknown error';
          const unknownErrorTemplate = translateFn('dashboard.photoCapture.errors.cameraUnknown');
          return unknownErrorTemplate.replace('{error}', errorMsg);
      }
    };

    // Cleanup on unmount
    onUnmounted(() => {
      stopCamera();
      if (capturedPhoto.value) {
        URL.revokeObjectURL(capturedPhoto.value.url);
      }
    });

    return {
      videoRef,
      canvasRef,
      fileInputRef,
      isCapturing,
      isCameraActive,
      showCamera,
      showUpload,
      capturedPhoto,
      uploadedPhoto,
      cameraError,
      startCamera,
      stopCamera,
      tryBackCamera,
      capturePhoto,
      handleFileUpload,
      savePhoto,
      retakePhoto,
      closeModal,
      getCameraErrorMessage,
    };
  },
};
</script>

<template>
  <div v-if="show" class="photo-capture-modal">
    <div class="photo-capture-overlay" @click="closeModal"></div>
    <div class="photo-capture-container">
      <!-- Header -->
      <div class="photo-capture-header">
        <h4 class="photo-capture-title">
          <i class="bi bi-camera me-2"></i>
          {{ $t('dashboard.photoCapture.title') }}
        </h4>
        <button class="btn-close-modal" @click="closeModal">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="photo-capture-content">
        <!-- Initial Options -->
        <div
          v-if="!showCamera && !showUpload && !capturedPhoto && !uploadedPhoto"
          class="photo-options"
        >
          <div class="option-card" @click="startCamera">
            <i class="bi bi-camera-fill option-icon"></i>
            <h5>{{ $t('dashboard.photoCapture.takePhoto') }}</h5>
            <p>{{ $t('dashboard.photoCapture.takePhotoDesc') }}</p>
          </div>

          <div class="option-card" @click="showUpload = true">
            <i class="bi bi-upload option-icon"></i>
            <h5>{{ $t('dashboard.photoCapture.uploadFile') }}</h5>
            <p>{{ $t('dashboard.photoCapture.uploadFileDesc') }}</p>
          </div>
        </div>

        <!-- Camera Error -->
        <div v-if="cameraError" class="camera-error">
          <i class="bi bi-exclamation-triangle me-2"></i>
          {{ cameraError }}
          <div class="camera-error-actions">
            <button class="btn btn-sm btn-outline-primary" @click="tryBackCamera">
              <i class="bi bi-camera-video me-1"></i>
              {{ $t('dashboard.photoCapture.tryBackCamera') }}
            </button>
            <button
              class="btn btn-sm btn-outline-secondary"
              @click="
                showUpload = true;
                cameraError = '';
              "
            >
              <i class="bi bi-upload me-1"></i>
              {{ $t('dashboard.photoCapture.uploadFile') }}
            </button>
          </div>
        </div>

        <!-- Camera View -->
        <div v-if="showCamera" class="camera-container">
          <video ref="videoRef" class="camera-video" autoplay playsinline muted></video>

          <div class="camera-controls">
            <button
              class="btn-capture"
              @click="capturePhoto"
              :disabled="!isCameraActive || isCapturing"
            >
              <i class="bi bi-camera"></i>
              {{
                isCapturing
                  ? $t('dashboard.photoCapture.capturing')
                  : $t('dashboard.photoCapture.capture')
              }}
            </button>

            <button class="btn-cancel" @click="stopCamera">
              <i class="bi bi-x"></i>
              {{ $t('dashboard.photoCapture.cancel') }}
            </button>
          </div>
        </div>

        <!-- File Upload -->
        <div v-if="showUpload" class="upload-container">
          <div class="upload-area" @click="$refs.fileInputRef.click()">
            <i class="bi bi-cloud-upload upload-icon"></i>
            <h5>{{ $t('dashboard.photoCapture.selectPhoto') }}</h5>
            <p>{{ $t('dashboard.photoCapture.fileFormats') }}</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="handleFileUpload"
              style="display: none"
            />
          </div>

          <button class="btn-cancel mt-3" @click="showUpload = false">
            <i class="bi bi-arrow-left me-1"></i>
            {{ $t('dashboard.photoCapture.back') }}
          </button>
        </div>

        <!-- Photo Preview -->
        <div v-if="capturedPhoto || uploadedPhoto" class="photo-preview">
          <div class="preview-container">
            <img
              :src="(capturedPhoto || uploadedPhoto).url"
              :alt="$t('dashboard.photoCapture.preview')"
              class="preview-image"
            />
          </div>

          <div class="preview-actions">
            <button class="btn-save" @click="savePhoto">
              <i class="bi bi-check-circle me-1"></i>
              {{ $t('dashboard.photoCapture.savePhoto') }}
            </button>

            <button class="btn-retake" @click="retakePhoto">
              <i class="bi bi-arrow-clockwise me-1"></i>
              {{ $t('dashboard.photoCapture.retake') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Hidden canvas for photo capture -->
      <canvas ref="canvasRef" style="display: none"></canvas>
    </div>
  </div>
</template>

<style scoped>
.photo-capture-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.photo-capture-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.photo-capture-container {
  position: relative;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.photo-capture-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background-color: var(--azul-turno);
  color: white;
}

.photo-capture-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.btn-close-modal {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.2);
}

.photo-capture-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

/* Options */
.photo-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.option-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  border: 2px solid rgba(0, 123, 255, 0.2);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.option-card:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 123, 255, 0.2);
}

.option-icon {
  font-size: 3rem;
  color: var(--azul-turno);
  margin-bottom: 1rem;
}

.option-card h5 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-weight: 600;
}

.option-card p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* Camera Error */
.camera-error {
  text-align: center;
  padding: 2rem;
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  border-radius: 0.5rem;
  border: 1px solid rgba(220, 53, 69, 0.2);
}

.camera-error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.camera-error-actions .btn {
  min-width: 140px;
}

@media (max-width: 480px) {
  .camera-error-actions {
    flex-direction: column;
    align-items: center;
  }

  .camera-error-actions .btn {
    width: 100%;
  }
}

/* Camera */
.camera-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.camera-video {
  width: 100%;
  max-width: 480px;
  height: auto;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.camera-controls {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-capture {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-capture:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 123, 255, 0.3);
}

.btn-capture:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Upload */
.upload-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 2rem;
  border: 2px dashed rgba(0, 123, 255, 0.3);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  width: 100%;
}

.upload-area:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
}

.upload-icon {
  font-size: 3rem;
  color: var(--azul-turno);
  margin-bottom: 1rem;
}

.upload-area h5 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
  font-weight: 600;
}

.upload-area p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
}

/* Preview */
.photo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.5rem;
}

.preview-image {
  width: 100%;
  height: auto;
  border-radius: 0.75rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.preview-actions {
  display: flex;
  gap: 1rem;
}

.btn-save {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(40, 167, 69, 0.3);
}

.btn-retake {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  color: var(--color-text);
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-retake:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* Responsive */
@media (max-width: 768px) {
  .photo-capture-container {
    margin: 0.5rem;
    max-height: 95vh;
  }

  .photo-options {
    grid-template-columns: 1fr;
  }

  .option-card {
    padding: 1.5rem 1rem;
  }

  .camera-controls,
  .preview-actions {
    flex-direction: column;
    width: 100%;
  }

  .btn-capture,
  .btn-cancel,
  .btn-save,
  .btn-retake {
    width: 100%;
    justify-content: center;
  }
}
</style>
