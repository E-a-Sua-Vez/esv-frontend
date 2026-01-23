<script>
import { ref, onUnmounted, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCommerceLogo, getCommerceLogoUrl } from '../../application/services/commerce-logo';
import { getBusinessLogo, getBusinessLogoUrl } from '../../application/services/business-logo';

export default {
  name: 'CommerceLogoUpload',
  props: {
    show: { type: Boolean, default: false },
    commerceId: { type: String, default: null },
    businessId: { type: String, default: null },
    existingLogo: { type: Object, default: null },
  },
  emits: ['close', 'logo-uploaded'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const fileInputRef = ref(null);
    const uploadedLogo = ref(null);
    const existingLogoUrl = ref(null);
    const businessLogoUrl = ref(null);
    const isUsingBusinessLogo = ref(false);
    const loadingExistingLogo = ref(false);
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const showUpload = ref(true);

    // Handle file upload
    const handleFileUpload = event => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!supportedFormats.includes(file.type)) {
        alert(t('commerceAdmin.logoUpload.errors.fileFormatNotSupported'));
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        alert(t('commerceAdmin.logoUpload.errors.fileTooLarge'));
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        uploadedLogo.value = {
          file,
          url: e.target.result,
          filename: `commerce-${props.commerceId}-${Date.now()}-${file.name}`,
        };
      };
      reader.readAsDataURL(file);
    };

    // Save logo (emit to parent)
    const saveLogo = async () => {
      const logoData = uploadedLogo.value;
      if (!logoData) return;

      try {
        emit('logo-uploaded', {
          file: logoData.file,
          filename: logoData.filename,
          commerceId: props.commerceId,
          businessId: props.businessId,
        });

        closeModal();
      } catch (error) {
        console.error('Error saving logo:', error);
        alert(t('commerceAdmin.logoUpload.errors.saveFailed'));
      }
    };

    // Reset and try again
    const retakeLogo = () => {
      if (uploadedLogo.value) {
        uploadedLogo.value = null;
      }
      if (fileInputRef.value) {
        fileInputRef.value.value = '';
      }
    };

    // Load existing logo (commerce logo first, then business logo as fallback)
    const loadExistingLogo = async () => {
      if (!props.commerceId) return;

      try {
        loadingExistingLogo.value = true;
        isUsingBusinessLogo.value = false;

        // First try to load commerce-specific logo
        const logoMetadata = await getCommerceLogo(props.commerceId);

        if (logoMetadata && logoMetadata.id) {
          const url = await getCommerceLogoUrl(props.commerceId, logoMetadata.id);
          if (url) {
            existingLogoUrl.value = url;
            isUsingBusinessLogo.value = false;
            return;
          }
        }

        // Fallback: load business logo if commerce has no custom logo
        if (props.businessId) {
          const businessLogoMetadata = await getBusinessLogo(props.businessId);
          if (businessLogoMetadata && businessLogoMetadata.id) {
            const url = await getBusinessLogoUrl(props.businessId, businessLogoMetadata.id);
            if (url) {
              existingLogoUrl.value = url;
              businessLogoUrl.value = url;
              isUsingBusinessLogo.value = true;
            }
          }
        }
      } catch (error) {
        console.error('Error loading existing logo:', error);
      } finally {
        loadingExistingLogo.value = false;
      }
    };

    // Watch for show prop changes to load existing logo
    watch(
      () => props.show,
      newValue => {
        if (newValue && props.commerceId) {
          loadExistingLogo();
        } else {
          // Cleanup when modal closes
          if (existingLogoUrl.value) {
            URL.revokeObjectURL(existingLogoUrl.value);
            existingLogoUrl.value = null;
          }
        }
      },
      { immediate: true },
    );

    // Close modal
    const closeModal = () => {
      retakeLogo();
      emit('close');
    };

    // Cleanup on unmount
    onUnmounted(() => {
      if (uploadedLogo.value && uploadedLogo.value.url) {
        URL.revokeObjectURL(uploadedLogo.value.url);
      }
      if (existingLogoUrl.value) {
        URL.revokeObjectURL(existingLogoUrl.value);
      }
      if (businessLogoUrl.value) {
        URL.revokeObjectURL(businessLogoUrl.value);
      }
    });

    return {
      fileInputRef,
      uploadedLogo,
      existingLogoUrl,
      businessLogoUrl,
      isUsingBusinessLogo,
      loadingExistingLogo,
      showUpload,
      handleFileUpload,
      saveLogo,
      retakeLogo,
      closeModal,
      loadExistingLogo,
    };
  },
};
</script>

<template>
  <div v-if="show" class="logo-upload-modal">
    <div class="logo-upload-overlay" @click="closeModal"></div>
    <div class="logo-upload-container">
      <!-- Header -->
      <div class="logo-upload-header">
        <h4 class="logo-upload-title">
          <i class="bi bi-image me-2"></i>
          {{ $t('commerceAdmin.logoUpload.title') }}
        </h4>
        <button class="btn-close-modal" @click="closeModal">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="logo-upload-content">
        <!-- Existing Logo Preview -->
        <div v-if="existingLogoUrl && !uploadedLogo" class="existing-logo-preview">
          <h5 class="preview-title">
            {{
              isUsingBusinessLogo
                ? $t('commerceAdmin.logoUpload.businessLogo')
                : $t('commerceAdmin.logoUpload.currentLogo')
            }}
          </h5>
          <div v-if="isUsingBusinessLogo" class="business-logo-hint">
            <i class="bi bi-info-circle me-1"></i>
            {{ $t('commerceAdmin.logoUpload.usingBusinessLogoHint') }}
          </div>
          <div class="preview-container">
            <img
              :src="existingLogoUrl"
              :alt="
                isUsingBusinessLogo
                  ? $t('commerceAdmin.logoUpload.businessLogo')
                  : $t('commerceAdmin.logoUpload.currentLogo')
              "
              class="preview-image"
            />
          </div>
          <p class="preview-hint">{{ $t('commerceAdmin.logoUpload.replaceHint') }}</p>
          <button class="btn-replace" @click="showUpload = true">
            <i class="bi bi-arrow-clockwise me-1"></i>
            {{ $t('commerceAdmin.logoUpload.replaceLogo') }}
          </button>
        </div>

        <!-- File Upload -->
        <div v-if="showUpload && !uploadedLogo && !existingLogoUrl" class="upload-container">
          <div class="upload-area" @click="$refs.fileInputRef.click()">
            <i class="bi bi-cloud-upload upload-icon"></i>
            <h5>{{ $t('commerceAdmin.logoUpload.selectLogo') }}</h5>
            <p>{{ $t('commerceAdmin.logoUpload.fileFormats') }}</p>
            <p class="upload-hint">{{ $t('commerceAdmin.logoUpload.recommendedSize') }}</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="handleFileUpload"
              style="display: none"
            />
          </div>
        </div>

        <!-- New Logo Upload Area (when existing logo is shown) -->
        <div v-if="showUpload && !uploadedLogo && existingLogoUrl" class="upload-container">
          <div class="upload-area" @click="$refs.fileInputRef.click()">
            <i class="bi bi-cloud-upload upload-icon"></i>
            <h5>{{ $t('commerceAdmin.logoUpload.selectNewLogo') }}</h5>
            <p>{{ $t('commerceAdmin.logoUpload.fileFormats') }}</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="handleFileUpload"
              style="display: none"
            />
          </div>
        </div>

        <!-- New Logo Preview -->
        <div v-if="uploadedLogo" class="logo-preview">
          <div class="preview-container">
            <img
              :src="uploadedLogo.url"
              :alt="$t('commerceAdmin.logoUpload.preview')"
              class="preview-image"
            />
          </div>

          <div class="preview-actions">
            <button class="btn-save" @click="saveLogo">
              <i class="bi bi-check-circle me-1"></i>
              {{ $t('commerceAdmin.logoUpload.saveLogo') }}
            </button>

            <button class="btn-retake" @click="retakeLogo">
              <i class="bi bi-arrow-clockwise me-1"></i>
              {{ $t('commerceAdmin.logoUpload.retake') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logo-upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.logo-upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.logo-upload-container {
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

.logo-upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.logo-upload-title {
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

.logo-upload-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
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
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
}

.upload-hint {
  font-size: 0.85rem !important;
  color: var(--azul-turno) !important;
  font-weight: 500 !important;
  margin-top: 0.5rem !important;
}

/* Existing Logo Preview */
.existing-logo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.preview-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.business-logo-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 123, 255, 0.1);
  color: var(--azul-turno);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
  max-width: 100%;
}

.business-logo-hint i {
  flex-shrink: 0;
}

.preview-hint {
  margin: 1rem 0 0.5rem 0;
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  text-align: center;
}

.btn-replace {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.btn-replace:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 123, 255, 0.3);
}

/* Preview */
.logo-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-container {
  width: 100%;
  max-width: 400px;
  margin-bottom: 1.5rem;
  background: #f8f9fa;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  height: auto;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  object-fit: contain;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.btn-save {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  .logo-upload-container {
    margin: 0.5rem;
    max-height: 95vh;
  }

  .preview-actions {
    flex-direction: column;
  }

  .btn-save,
  .btn-retake {
    width: 100%;
  }
}
</style>
