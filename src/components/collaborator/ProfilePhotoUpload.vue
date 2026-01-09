<script>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getProfilePhotoUrl } from '@/application/services/collaborator';

export default {
  name: 'ProfilePhotoUpload',
  props: {
    collaboratorId: { type: String, required: true },
    commerceId: { type: String, required: true },
    existingPhoto: { type: [Object, String], default: null },
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const fileInputRef = ref(null);
    const uploadedPhoto = ref(null);
    const resolvedPhotoUrl = ref(null);

    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    // Trigger file select
    const triggerFileSelect = () => {
      if (fileInputRef.value) {
        fileInputRef.value.click();
      }
    };

    // Handle file upload
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!supportedFormats.includes(file.type)) {
        alert('Formato no válido');
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        alert('Archivo muy grande');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedPhoto.value = e.target.result;

        // Emit updated event immediately
        const updatedCollaborator = {
          id: props.collaboratorId,
          profilePhoto: {
            file: file,
            url: e.target.result,
            filename: file.name
          }
        };

        emit('updated', updatedCollaborator);
      };

      reader.readAsDataURL(file);
    };

    const resolveExistingPhoto = async () => {
      try {
        // Si ya hay una subida nueva en memoria, no sobreescribir
        if (uploadedPhoto.value) return;

        // Si existe foto previa, intentar obtener URL firmada desde backend
        const url = await getProfilePhotoUrl(props.collaboratorId);
        if (url) {
          resolvedPhotoUrl.value = url;
        } else {
          // Mantener posible string/url que venga por props
          const maybe = props.existingPhoto?.url || props.existingPhoto || null;
          resolvedPhotoUrl.value = maybe;
        }
      } catch (e) {
        // fallback a la prop tal cual
        resolvedPhotoUrl.value = props.existingPhoto?.url || props.existingPhoto || null;
      }
    };

    onMounted(resolveExistingPhoto);
    watch(() => props.collaboratorId, resolveExistingPhoto);
    watch(() => props.existingPhoto, resolveExistingPhoto);

    return {
      fileInputRef,
      uploadedPhoto,
      resolvedPhotoUrl,
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
        >
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
          >
            <i class="bi bi-camera me-1"></i>
            {{ existingPhoto || uploadedPhoto ? $t('collaborator.profilePhoto.update') : $t('collaborator.profilePhoto.upload') }}
          </button>
          <span v-if="uploadedPhoto" class="small text-muted">
            <i class="bi bi-check-circle text-success"></i>
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