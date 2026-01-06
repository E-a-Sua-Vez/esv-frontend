<template>
  <div class="document-verification-container">
    <div class="verification-card">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('documentVerification.verifying') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <div class="error-icon">
          <i class="bi bi-x-circle-fill"></i>
        </div>
        <h2>{{ $t('documentVerification.error.title') }}</h2>
        <p>{{ error }}</p>
        <button @click="retryVerification" class="btn btn-primary">
          {{ $t('documentVerification.retry') }}
        </button>
      </div>

      <!-- Success State -->
      <div v-else-if="verificationData" class="success-state">
        <!-- Valid Document -->
        <div v-if="verificationData.valid" class="valid-document">
          <div class="valid-icon">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <h2>{{ $t('documentVerification.valid.title') }}</h2>
          <p class="valid-message">{{ verificationData.message }}</p>

          <!-- Document Information -->
          <div class="document-info">
            <div class="info-section">
              <h3>{{ $t('documentVerification.documentInfo.title') }}</h3>
              <div class="info-grid">
                <div class="info-item" v-if="verificationData.prescriptionId">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.prescriptionId')
                  }}</span>
                  <span class="info-value">{{ verificationData.prescriptionId }}</span>
                </div>
                <div class="info-item" v-if="verificationData.examOrderId">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.examOrderId')
                  }}</span>
                  <span class="info-value">{{ verificationData.examOrderId }}</span>
                </div>
                <div class="info-item" v-if="verificationData.referenceId">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.referenceId')
                  }}</span>
                  <span class="info-value">{{ verificationData.referenceId }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ $t('documentVerification.documentInfo.date') }}</span>
                  <span class="info-value">{{ formatDate(verificationData.date) }}</span>
                </div>
                <div class="info-item" v-if="verificationData.doctorName">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.doctorName')
                  }}</span>
                  <span class="info-value">{{ verificationData.doctorName }}</span>
                </div>
                <div class="info-item" v-if="verificationData.doctorLicense">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.doctorLicense')
                  }}</span>
                  <span class="info-value">{{ verificationData.doctorLicense }}</span>
                </div>
                <div class="info-item" v-if="verificationData.doctorOriginName">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.doctorOriginName')
                  }}</span>
                  <span class="info-value">{{ verificationData.doctorOriginName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{
                    $t('documentVerification.documentInfo.commerceName')
                  }}</span>
                  <span class="info-value">{{ verificationData.commerceName }}</span>
                </div>
              </div>
            </div>

            <!-- Integrity Check -->
            <div class="integrity-section">
              <h3>{{ $t('documentVerification.integrity.title') }}</h3>
              <div class="integrity-status" :class="{ tampered: verificationData.tampered }">
                <i
                  :class="
                    verificationData.tampered
                      ? 'bi bi-exclamation-triangle-fill'
                      : 'bi bi-shield-check-fill'
                  "
                ></i>
                <span v-if="verificationData.tampered">
                  {{ $t('documentVerification.integrity.tampered') }}
                </span>
                <span v-else>
                  {{ $t('documentVerification.integrity.valid') }}
                </span>
              </div>
              <div class="document-hash" v-if="verificationData.documentHash">
                <span class="hash-label">{{ $t('documentVerification.integrity.hash') }}</span>
                <code class="hash-value">{{ verificationData.documentHash }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Invalid Document -->
        <div v-else class="invalid-document">
          <div class="invalid-icon">
            <i class="bi bi-x-circle-fill"></i>
          </div>
          <h2>{{ $t('documentVerification.invalid.title') }}</h2>
          <p>{{ verificationData.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const verificationData = ref(null);

const documentType = ref(null);
const documentId = ref(null);

onMounted(async () => {
  // Obtener tipo de documento y ID de la ruta
  documentType.value = route.params.type; // 'prescription', 'exam-order', 'reference'
  documentId.value = route.params.id;

  await verifyDocument();
});

const verifyDocument = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Determinar endpoint según tipo de documento
    let endpoint = '';
    if (documentType.value === 'prescription') {
      endpoint = `/prescription/public/prescription/verify/${documentId.value}`;
    } else if (documentType.value === 'exam-order') {
      endpoint = `/medical-exam-order/public/exam-order/verify/${documentId.value}`;
    } else if (documentType.value === 'reference') {
      endpoint = `/medical-reference/public/reference/verify/${documentId.value}`;
    } else {
      throw new Error('Tipo de documento no válido');
    }

    const response = await axios.get(endpoint);
    verificationData.value = response.data;
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      err.message ||
      'Error al verificar el documento. Por favor, intente nuevamente.';
  } finally {
    loading.value = false;
  }
};

const retryVerification = () => {
  verifyDocument();
};

const formatDate = dateString => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
</script>

<style scoped>
.document-verification-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.verification-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  padding: 3rem;
}

.loading-state,
.error-state,
.success-state {
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-icon,
.valid-icon,
.invalid-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-icon {
  color: #dc3545;
}

.valid-icon {
  color: #28a745;
}

.invalid-icon {
  color: #dc3545;
}

h2 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.valid-message {
  color: #28a745;
  font-weight: 500;
  margin-bottom: 2rem;
}

.document-info {
  text-align: left;
  margin-top: 2rem;
}

.info-section,
.integrity-section {
  margin-bottom: 2rem;
}

.info-section h3,
.integrity-section h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 1rem;
  color: #333;
  font-weight: 600;
}

.integrity-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  background: #d4edda;
  color: #155724;
  margin-bottom: 1rem;
}

.integrity-status.tampered {
  background: #f8d7da;
  color: #721c24;
}

.integrity-status i {
  font-size: 1.5rem;
}

.document-hash {
  margin-top: 1rem;
}

.hash-label {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.hash-value {
  display: block;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.75rem;
  word-break: break-all;
  color: #333;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (max-width: 768px) {
  .verification-card {
    padding: 2rem 1.5rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>


