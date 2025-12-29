<template>
  <div class="digital-signature-icp">
    <div v-if="!isSigned" class="signature-form">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">
            <i class="bi bi-shield-check"></i>
            {{ $t('digitalSignature.icp.title') }}
          </h5>
        </div>
        <div class="card-body">
          <div v-if="error" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle"></i> {{ error }}
          </div>

          <div v-if="loading" class="text-center">
            <Spinner />
            <p class="mt-2">{{ $t('digitalSignature.icp.processing') }}</p>
          </div>

          <div v-else>
            <div class="mb-3">
              <label class="form-label">
                {{ $t('digitalSignature.icp.certificate') }}
                <span class="text-danger">*</span>
              </label>
              <input
                type="file"
                accept=".pem,.crt,.cer,.pfx"
                @change="handleCertificateSelect"
                class="form-control"
                ref="certificateInput"
                :disabled="loading"
              />
              <small class="form-text text-muted">
                {{ $t('digitalSignature.icp.certificateHelp') }}
              </small>
            </div>

            <div class="mb-3">
              <label class="form-label">
                {{ $t('digitalSignature.icp.privateKey') }}
                <span class="text-danger">*</span>
              </label>
              <input
                type="file"
                accept=".pem,.key"
                @change="handlePrivateKeySelect"
                class="form-control"
                ref="privateKeyInput"
                :disabled="loading"
              />
              <small class="form-text text-muted">
                {{ $t('digitalSignature.icp.privateKeyHelp') }}
              </small>
            </div>

            <div class="mb-3">
              <label class="form-label">{{ $t('digitalSignature.icp.password') }}</label>
              <input
                v-model="password"
                type="password"
                class="form-control"
                :placeholder="$t('digitalSignature.icp.passwordPlaceholder')"
                :disabled="loading"
              />
              <small class="form-text text-muted">
                {{ $t('digitalSignature.icp.passwordHelp') }}
              </small>
            </div>

            <div v-if="certificateInfo" class="alert alert-info">
              <h6>
                <i class="bi bi-info-circle"></i> {{ $t('digitalSignature.icp.certificateInfo') }}
              </h6>
              <ul class="mb-0">
                <li>
                  <strong>{{ $t('digitalSignature.icp.issuer') }}:</strong>
                  {{ certificateInfo.issuer }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.subject') }}:</strong>
                  {{ certificateInfo.subject }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.validFrom') }}:</strong>
                  {{ formatDate(certificateInfo.validFrom) }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.validTo') }}:</strong>
                  {{ formatDate(certificateInfo.validTo) }}
                </li>
              </ul>
            </div>

            <div class="d-flex gap-2">
              <button
                @click="validateCertificate"
                class="btn btn-outline-primary"
                :disabled="!certificatePem || loading"
              >
                <i class="bi bi-check-circle"></i> {{ $t('digitalSignature.icp.validate') }}
              </button>
              <button @click="signDocument" class="btn btn-primary" :disabled="!canSign || loading">
                <i class="bi bi-pen"></i> {{ $t('digitalSignature.icp.sign') }}
              </button>
              <button @click="cancel" class="btn btn-secondary" :disabled="loading">
                {{ $t('cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="signature-status">
      <div class="card border-success">
        <div class="card-header bg-success text-white">
          <h5 class="mb-0">
            <i class="bi bi-check-circle"></i>
            {{ $t('digitalSignature.icp.signed') }}
          </h5>
        </div>
        <div class="card-body">
          <div v-if="signatureInfo" class="signature-details">
            <p class="mb-2">
              <strong>{{ $t('digitalSignature.icp.signedAt') }}:</strong>
              {{ formatDate(signatureInfo.signedAt) }}
            </p>
            <p class="mb-2">
              <strong>{{ $t('digitalSignature.icp.signedBy') }}:</strong>
              {{ signatureInfo.signedBy }}
            </p>
            <div v-if="signatureInfo.certificateInfo" class="mt-3">
              <h6>{{ $t('digitalSignature.icp.certificateInfo') }}</h6>
              <ul class="mb-0">
                <li>
                  <strong>{{ $t('digitalSignature.icp.issuer') }}:</strong>
                  {{ signatureInfo.certificateInfo.issuer }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.subject') }}:</strong>
                  {{ signatureInfo.certificateInfo.subject }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.validFrom') }}:</strong>
                  {{ formatDate(signatureInfo.certificateInfo.validFrom) }}
                </li>
                <li>
                  <strong>{{ $t('digitalSignature.icp.validTo') }}:</strong>
                  {{ formatDate(signatureInfo.certificateInfo.validTo) }}
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-3">
            <button @click="verifySignature" class="btn btn-outline-primary" :disabled="verifying">
              <i class="bi bi-shield-check"></i>
              {{
                verifying ? $t('digitalSignature.icp.verifying') : $t('digitalSignature.icp.verify')
              }}
            </button>
          </div>
          <div v-if="verificationResult" class="mt-3">
            <div
              :class="verificationResult.valid ? 'alert alert-success' : 'alert alert-danger'"
              role="alert"
            >
              <i :class="verificationResult.valid ? 'bi bi-check-circle' : 'bi bi-x-circle'"></i>
              {{
                verificationResult.valid
                  ? $t('digitalSignature.icp.valid')
                  : $t('digitalSignature.icp.invalid')
              }}
              <div
                v-if="verificationResult.errors && verificationResult.errors.length > 0"
                class="mt-2"
              >
                <ul class="mb-0">
                  <li v-for="(error, index) in verificationResult.errors" :key="index">
                    {{ error }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from './Spinner.vue';
import {
  validateCertificate as validateCertificateService,
  signDocument as signDocumentService,
  verifySignature as verifySignatureService,
} from '../../application/services/digital-signature';
import {
  signPrescription,
  verifyPrescriptionSignature,
} from '../../application/services/prescription';
import {
  signExamOrder,
  verifyExamOrderSignature,
} from '../../application/services/medical-exam-order';
import {
  signReference,
  verifyReferenceSignature,
} from '../../application/services/medical-reference';

export default {
  name: 'DigitalSignatureICP',
  components: {
    Spinner,
  },
  props: {
    documentType: {
      type: String,
      required: true,
      validator: value => ['prescription', 'exam_order', 'reference'].includes(value),
    },
    documentId: {
      type: String,
      required: true,
    },
    isSigned: {
      type: Boolean,
      default: false,
    },
    signatureInfo: {
      type: Object,
      default: null,
    },
  },
  emits: ['signed', 'verified', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const verifying = ref(false);
    const error = ref('');
    const certificatePem = ref('');
    const privateKeyPem = ref('');
    const password = ref('');
    const certificateInfo = ref(null);
    const verificationResult = ref(null);

    const canSign = computed(
      () => certificatePem.value && privateKeyPem.value && certificateInfo.value?.valid
    );

    const handleCertificateSelect = async event => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        certificatePem.value = text;
        error.value = '';
        certificateInfo.value = null;
      } catch (err) {
        error.value = t('digitalSignature.icp.errorReadingCertificate');
      }
    };

    const handlePrivateKeySelect = async event => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        privateKeyPem.value = text;
        error.value = '';
      } catch (err) {
        error.value = t('digitalSignature.icp.errorReadingPrivateKey');
      }
    };

    const validateCertificate = async () => {
      if (!certificatePem.value) {
        error.value = t('digitalSignature.icp.certificateRequired');
        return;
      }

      try {
        loading.value = true;
        error.value = '';
        const result = await validateCertificateService(certificatePem.value);
        certificateInfo.value = result;

        if (!result.valid) {
          error.value = result.errors?.join(', ') || t('digitalSignature.icp.invalidCertificate');
        }
      } catch (err) {
        error.value = err.message || t('digitalSignature.icp.errorValidating');
      } finally {
        loading.value = false;
      }
    };

    const signDocument = async () => {
      if (!canSign.value) {
        error.value = t('digitalSignature.icp.cannotSign');
        return;
      }

      try {
        loading.value = true;
        error.value = '';

        let result;
        const signatureData = {
          certificatePem: certificatePem.value,
          privateKeyPem: privateKeyPem.value,
          password: password.value || undefined,
        };

        switch (props.documentType) {
          case 'prescription':
            result = await signPrescription(props.documentId, signatureData);
            break;
          case 'exam_order':
            result = await signExamOrder(props.documentId, signatureData);
            break;
          case 'reference':
            result = await signReference(props.documentId, signatureData);
            break;
          default:
            throw new Error('Invalid document type');
        }

        emit('signed', result);
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('digitalSignature.icp.errorSigning');
      } finally {
        loading.value = false;
      }
    };

    const verifySignature = async () => {
      try {
        verifying.value = true;
        error.value = '';

        let result;
        switch (props.documentType) {
          case 'prescription':
            result = await verifyPrescriptionSignature(props.documentId);
            break;
          case 'exam_order':
            result = await verifyExamOrderSignature(props.documentId);
            break;
          case 'reference':
            result = await verifyReferenceSignature(props.documentId);
            break;
          default:
            throw new Error('Invalid document type');
        }

        verificationResult.value = result;
        emit('verified', result);
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('digitalSignature.icp.errorVerifying');
      } finally {
        verifying.value = false;
      }
    };

    const cancel = () => {
      emit('cancel');
    };

    const formatDate = date => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleString();
    };

    return {
      loading,
      verifying,
      error,
      certificatePem,
      privateKeyPem,
      password,
      certificateInfo,
      verificationResult,
      canSign,
      handleCertificateSelect,
      handlePrivateKeySelect,
      validateCertificate,
      signDocument,
      verifySignature,
      cancel,
      formatDate,
    };
  },
};
</script>

<style scoped>
.digital-signature-icp {
  margin: 1rem 0;
}

.signature-preview {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  background: #f8f9fa;
  text-align: center;
}

.signature-image {
  max-width: 100%;
  max-height: 200px;
}

.signature-details {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
}

.card-header {
  font-weight: 600;
}

.alert ul {
  margin-top: 0.5rem;
}
</style>
