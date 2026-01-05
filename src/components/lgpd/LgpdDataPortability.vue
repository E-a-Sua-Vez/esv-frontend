<template>
  <div class="lgpd-data-portability">
    <div v-if="loading" class="text-center">
      <Spinner />
      <p class="mt-2">{{ $t('lgpd.portability.generating') }}</p>
    </div>

    <div v-else>
      <div class="row my-2 metric-card">
        <div class="col-12">
          <div class="alert alert-info mb-3">
            <i class="bi bi-info-circle me-2"></i>
            {{ $t('lgpd.portability.description') }}
          </div>

          <div class="mb-3">
            <button
              @click="generateAndDownload"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
              :disabled="loading || !hasExportConsent"
            >
              <i class="bi bi-download"></i>
            </button>
          </div>

          <div v-if="!hasExportConsent" class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {{ $t('lgpd.portability.noConsent') }}
          </div>

          <div v-if="lastExport" class="mt-3">
            <div class="metric-card p-3" style="border-left: 3px solid #0ea5e9">
              <h6 class="mb-2">{{ $t('lgpd.portability.lastExport') }}</h6>
              <p class="mb-1 small">
                <strong>{{ $t('lgpd.portability.fileName') }}:</strong> {{ lastExport.fileName }}
              </p>
              <p class="mb-1 small">
                <strong>{{ $t('lgpd.portability.generatedAt') }}:</strong>
                {{ formatDate(lastExport.generatedAt) }}
              </p>
              <p class="mb-0 small">
                <strong>{{ $t('lgpd.portability.expiresAt') }}:</strong>
                {{ formatDate(lastExport.expiresAt) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../common/Spinner.vue';
import {
  downloadDataPortabilityFile,
  generateDataPortabilityFile,
} from '../../application/services/lgpd-data-portability';
import { checkActiveConsent } from '../../application/services/lgpd-consent';

export default {
  name: 'LgpdDataPortability',
  components: {
    Spinner,
  },
  props: {
    commerceId: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const loading = ref(false);
    const hasExportConsent = ref(false);
    const lastExport = ref(null);

    const checkConsent = async () => {
      try {
        const result = await checkActiveConsent(props.commerceId, props.clientId, 'DATA_EXPORT');
        hasExportConsent.value = result.hasConsent;
      } catch (error) {
        console.error('Error checking consent:', error);
      }
    };

    const generateAndDownload = async () => {
      try {
        loading.value = true;

        // Gerar arquivo
        const result = await generateDataPortabilityFile(props.commerceId, props.clientId);
        lastExport.value = {
          fileName: result.fileName,
          generatedAt: new Date(),
          expiresAt: result.expiresAt,
        };

        // Download
        const blob = await downloadDataPortabilityFile(props.commerceId, props.clientId);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error generating/downloading file:', error);
        alert(error.response?.data?.message || t('lgpd.portability.error'));
      } finally {
        loading.value = false;
      }
    };

    const formatDate = date => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    onMounted(() => {
      checkConsent();
    });

    return {
      loading,
      hasExportConsent,
      lastExport,
      generateAndDownload,
      formatDate,
    };
  },
};
</script>

<style scoped>
.lgpd-data-portability {
  width: 100%;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: flex-start;
  font-size: 0.875rem;
}

.alert i {
  font-size: 1.125rem;
}

.alert-info {
  background: rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(14, 165, 233, 0.2);
  color: #0c4a6e;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #78350f;
}
</style>

