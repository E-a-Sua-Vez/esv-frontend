<template>
  <div class="digital-signature-upload">
    <div class="card">
      <div class="card-header">
        <h5><i class="bi bi-pen"></i> {{ $t('digitalSignature.title') }}</h5>
      </div>
      <div class="card-body">
        <div v-if="currentSignature" class="mb-3">
          <label class="form-label">{{ $t('digitalSignature.current') }}</label>
          <div class="signature-preview">
            <img
              :src="currentSignature"
              alt="Firma Digital"
              class="signature-image"
              @error="handleImageError"
            />
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">{{ $t('digitalSignature.upload') }}</label>
          <input
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="form-control"
            ref="fileInput"
          />
          <small class="form-text text-muted">
            {{ $t('digitalSignature.uploadHelp') }}
          </small>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-6">
            <label class="form-label">{{ $t('digitalSignature.crm') }}</label>
            <input v-model="crm" type="text" class="form-control" placeholder="123456" />
          </div>
          <div class="col-md-6">
            <label class="form-label">{{ $t('digitalSignature.crmState') }}</label>
            <input v-model="crmState" type="text" class="form-control" placeholder="SP" />
          </div>
        </div>

        <div v-if="preview" class="mb-3">
          <label class="form-label">{{ $t('preview') }}</label>
          <div class="signature-preview">
            <img :src="preview" alt="Preview" class="signature-image" />
          </div>
        </div>

        <div class="d-flex gap-2">
          <button @click="uploadSignature" class="btn btn-primary" :disabled="uploading">
            <span v-if="uploading" class="spinner-border spinner-border-sm me-2"></span>
            {{ $t('save') }}
          </button>
          <button @click="clearForm" class="btn btn-secondary">{{ $t('cancel') }}</button>
        </div>

        <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
        <div v-if="success" class="alert alert-success mt-3">
          {{ $t('digitalSignature.uploadSuccess') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { updateDigitalSignature } from '../../application/services/collaborator';
import { globalStore } from '../../stores';

const props = defineProps({
  collaboratorId: {
    type: String,
    required: true,
  },
  currentSignature: {
    type: String,
    default: null,
  },
  currentCrm: {
    type: String,
    default: null,
  },
  currentCrmState: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['updated']);

const store = globalStore();
const fileInput = ref(null);
const preview = ref(null);
const crm = ref(props.currentCrm || '');
const crmState = ref(props.currentCrmState || '');
const uploading = ref(false);
const error = ref(null);
const success = ref(false);

const handleFileSelect = event => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = 'Por favor, selecione um arquivo de imagem';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    preview.value = e.target.result;
    error.value = null;
  };
  reader.readAsDataURL(file);
};

const uploadSignature = async () => {
  try {
    uploading.value = true;
    error.value = null;
    success.value = false;

    await updateDigitalSignature(
      props.collaboratorId,
      preview.value || props.currentSignature,
      crm.value,
      crmState.value
    );

    success.value = true;
    emit('updated', {
      digitalSignature: preview.value || props.currentSignature,
      crm: crm.value,
      crmState: crmState.value,
    });

    setTimeout(() => {
      success.value = false;
      clearForm();
    }, 3000);
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Error al actualizar firma digital';
  } finally {
    uploading.value = false;
  }
};

const clearForm = () => {
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  preview.value = null;
  error.value = null;
};

const handleImageError = () => {
  // Handle image load error
};
</script>

<style scoped>
.digital-signature-upload {
  max-width: 600px;
}

.signature-preview {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  background: #f8f9fa;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.signature-image {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}
</style>
