<template>
  <div class="digital-signature-upload">
    <div v-if="currentSignature" class="form-group-modern mb-3">
      <label class="form-label-modern">
        {{ $t('digitalSignature.current') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('digitalSignature.currentHelp') ||
                  'Imagen de la firma digital actualmente asociada al colaborador y usada para firmar documentos.'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <div class="signature-preview">
        <img
          :src="currentSignature"
          alt="Firma Digital"
          class="signature-image"
          @error="handleImageError"
        />
      </div>
    </div>

    <div class="form-group-modern mb-3">
      <label class="form-label-modern">
        {{ $t('digitalSignature.upload') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('digitalSignature.uploadHelp') ||
                  'Selecciona una imagen clara de la firma del profesional (por ejemplo, foto escaneada o firmada en tablet).'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        type="file"
        accept="image/*"
        @change="handleFileSelect"
        class="form-control-modern"
        ref="fileInput"
      />
      <small class="form-text text-muted">
        {{ $t('digitalSignature.uploadHelp') }}
      </small>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label class="form-label-modern">
          {{ $t('digitalSignature.crm') }}
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>
                {{
                  $t('digitalSignature.crmHelp') ||
                    'Número de registro profesional (CRM u organismo equivalente) ligado a la firma digital.'
                }}
              </div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input v-model="crm" type="text" class="form-control-modern" placeholder="123456" />
      </div>
      <div class="col-md-6">
        <label class="form-label-modern">
          {{ $t('digitalSignature.crmState') }}
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>
                {{
                  $t('digitalSignature.crmStateHelp') ||
                    'Estado o provincia asociado al registro profesional (por ejemplo, SP, RJ, BA).'
                }}
              </div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input v-model="crmState" type="text" class="form-control-modern" placeholder="SP" />
      </div>
    </div>

    <div v-if="preview" class="form-group-modern mb-3">
      <label class="form-label-modern">{{ $t('preview') }}</label>
      <div class="signature-preview">
        <img :src="preview" alt="Preview" class="signature-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import Popper from 'vue3-popper';
// NOTA: getDigitalSignatureUrl deprecado - la firma ahora está en Professional

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

const emit = defineEmits(['change']);

const fileInput = ref(null);
const preview = ref(null);
const selectedFile = ref(null);
const crm = ref(props.currentCrm || '');
const crmState = ref(props.currentCrmState || '');

// Carga firma actual (ya viene desde Professional si existe)
const loadCurrentSignature = async () => {
  try {
    if (!preview.value && props.currentSignature) {
      // La firma ya viene correctamente desde el componente padre
      // No necesitamos hacer requests adicionales
      emit('change', {
        field: 'digitalSignature',
        value: {
          digitalSignature: props.currentSignature,
          file: null,
          crm: crm.value,
          crmState: crmState.value,
        }
      });
    }
  } catch (e) {
    console.warn('Error loading signature:', e);
  }
};

onMounted(loadCurrentSignature);
watch(() => props.currentSignature, loadCurrentSignature);

const handleFileSelect = event => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    return; // Silently ignore invalid files
  }

  selectedFile.value = file;
  const reader = new FileReader();
  reader.onload = e => {
    preview.value = e.target.result;
    // Emit updated data immediately (include file for multipart upload)
    emit('change', {
      field: 'digitalSignature',
      value: {
        digitalSignature: preview.value,
        file: selectedFile.value,
        crm: crm.value,
        crmState: crmState.value,
      }
    });
  };
  reader.readAsDataURL(file);
};

// Watch for changes in CRM fields and emit updates
watch([crm, crmState], () => {
  if (preview.value || props.currentSignature) {
    emit('change', {
      field: 'digitalSignature',
      value: {
        digitalSignature: preview.value || props.currentSignature,
        file: selectedFile.value || null,
        crm: crm.value,
        crmState: crmState.value,
      }
    });
  }
});

const handleImageError = () => {
  // Silently handle image errors
};
</script>

<style scoped>
.digital-signature-upload {
  width: 100%;
}

.form-group-modern {
  margin-bottom: 1rem;
}

.form-label-modern {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  margin-bottom: 0.25rem;
  display: block;
}

.form-control-modern {
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
  width: 100%;
}

.form-control-modern:focus {
  border-color: rgba(0, 74, 173, 0.3);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.1);
}

.form-text {
  font-size: 0.75rem;
  color: #6c757d;
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
