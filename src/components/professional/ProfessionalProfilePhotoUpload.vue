<script>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfilePhotoUrl } from '../../application/services/professional';

export default {
  name: 'ProfessionalProfilePhotoUpload',
  props: {
    professionalId: { type: String, required: true },
    commerceId: { type: String, required: true },
    existingPhoto: { type: [Object, String], default: null },
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const fileInputRef = ref(null);
    const uploadedPhoto = ref(null);
    const resolvedPhotoUrl = ref(null);
    const uploading = ref(false);

    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    // Trigger file select
    const triggerFileSelect = () => {
      if (fileInputRef.value) {
        fileInputRef.value.click();
      }
    };

    // Handle file upload
    const handleFileUpload = event => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!supportedFormats.includes(file.type)) {
        alert(t('collaborator.profilePhoto.invalidFormat') || 'Formato no válido');
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        alert(t('collaborator.profilePhoto.fileTooLarge') || 'Archivo muy grande');
        return;
      }

      uploading.value = true;

      // Create preview URL
      const reader = new FileReader();
      reader.onload = e => {
        uploadedPhoto.value = e.target.result;

        // Create FormData to send file to backend
        const formData = new FormData();
        formData.append('file', file);
        formData.append('professionalId', props.professionalId);
        formData.append('commerceId', props.commerceId);

        // Emit updated event with FormData
        const updatedProfessional = {
          id: props.professionalId,
          profilePhoto: {
            file, // Keep file reference for validation
            url: e.target.result, // Preview URL (base64)
            filename: file.name,
            formData, // Send FormData separately
          },
        };

        emit('updated', updatedProfessional);
        uploading.value = false;
      };

      reader.onerror = () => {
        alert(t('collaborator.profilePhoto.uploadError') || 'Error al leer el archivo');
        uploading.value = false;
      };

      reader.readAsDataURL(file);
    };

    const resolveExistingPhoto = async () => {
      try {
        // Si ya hay una subida nueva en memoria, no sobreescribir
        if (uploadedPhoto.value) return;

        // Si existe URL de foto, obtener la URL firmada
        if (props.existingPhoto) {
          const response = await getProfilePhotoUrl(props.professionalId);
          if (response?.photoUrl) {
            resolvedPhotoUrl.value = response.photoUrl;
            return;
          }
        }

        // Fallback a la prop tal cual
        const photoUrl = props.existingPhoto?.url || props.existingPhoto || null;
        resolvedPhotoUrl.value = photoUrl;
      } catch (e) {
        console.error('Error resolving existing photo:', e);
        resolvedPhotoUrl.value = props.existingPhoto?.url || props.existingPhoto || null;
      }
    };

    onMounted(resolveExistingPhoto);
    watch(() => props.professionalId, resolveExistingPhoto);
    watch(() => props.existingPhoto, resolveExistingPhoto);

    return {
      fileInputRef,
      uploadedPhoto,
      resolvedPhotoUrl,
      uploading,
      triggerFileSelect,
      handleFileUpload,
    };
  },
};
</script>

<template>
  <div class="profile-photo-upload">
    <div class="d-flex align-items-center gap-3">
      <!-- Photo Preview -->
      <div class="photo-preview">
        <img
          v-if="resolvedPhotoUrl || uploadedPhoto"
          :src="uploadedPhoto || resolvedPhotoUrl"
          :alt="$t('collaborator.profilePhoto.current')"
          class="photo-preview-img"
        />
        <div v-else class="photo-placeholder">
          <i class="bi bi-person-circle"></i>
        </div>
      </div>

      <!-- Upload Controls -->
      <div class="d-flex flex-column gap-2">
        <div class="d-flex align-items-center gap-2">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
            @click="triggerFileSelect"
            :disabled="uploading"
          >
            <i v-if="uploading" class="bi bi-hourglass-split me-1"></i>
            <i v-else class="bi bi-camera me-1"></i>
            <span v-if="uploading">{{
              $t('collaborator.profilePhoto.uploading') || 'Cargando...'
            }}</span>
            <span v-else>{{
              existingPhoto || uploadedPhoto
                ? $t('collaborator.profilePhoto.update')
                : $t('collaborator.profilePhoto.upload')
            }}</span>
          </button>
          <span v-if="uploadedPhoto && !uploading" class="small text-muted">
            <i class="bi bi-check-circle text-success"></i>
          </span>
          <span v-if="uploading" class="small text-muted">
            <i class="bi bi-arrow-repeat text-primary"></i>
          </span>
        </div>
        <small class="text-muted">{{ $t('collaborator.profilePhoto.fileFormats') }}</small>
      </div>
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".jpg,.jpeg,.png,.webp"
      style="display: none"
      @change="handleFileUpload"
    />
  </div>
</template>

<style scoped>
.profile-photo-upload {
  padding: 1rem 0;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #e3e6f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.photo-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  color: #adb5bd;
  font-size: 2rem;
}

.btn-size {
  font-size: 0.875rem;
}

/* Success checkmark styles */
.text-success {
  color: #28a745 !important;
}

/* File format text */
.text-muted {
  font-size: 0.75rem;
  line-height: 1.2;
}
</style>
