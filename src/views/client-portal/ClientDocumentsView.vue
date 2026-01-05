<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :loading="false"
      ></CommerceLogo>

      <!-- Header -->
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('clientPortal.documents.title') }}</span>
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-link text-muted" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>
            {{ $t('clientPortal.documents.backToMenu') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.documents.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.documents.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
        </div>
      </div>

      <!-- Documents Content -->
      <div v-else class="documents-container">
        <div v-if="documents.length === 0" class="text-center py-5">
          <i class="bi bi-file-earmark" style="font-size: 3rem; color: var(--gris-elite-1)"></i>
          <p class="mt-3 text-muted">{{ $t('clientPortal.documents.noDocuments') }}</p>
        </div>

        <div v-else class="documents-list">
          <div v-for="document in documents" :key="document.id" class="document-card">
            <div class="document-icon">
              <i
                :class="`bi ${
                  document.type === 'PDF' || document.name?.endsWith('.pdf')
                    ? 'bi-file-pdf-fill text-danger'
                    : document.name?.endsWith('.jpg') || document.name?.endsWith('.png')
                    ? 'bi-file-image-fill text-primary'
                    : 'bi-file-earmark-text-fill'
                }`"
              ></i>
            </div>
            <div class="document-info">
              <h6 class="document-name">
                {{ document.name || $t('clientPortal.documents.unnamed') }}
              </h6>
              <p class="document-meta">
                <span v-if="document.createdAt">
                  <i class="bi bi-calendar me-1"></i>
                  {{ formatDate(document.createdAt) }}
                </span>
                <span v-if="document.size" class="ms-3">
                  <i class="bi bi-file-earmark me-1"></i>
                  {{ formatSize(document.size) }}
                </span>
              </p>
              <p v-if="document.description" class="document-description">
                {{ document.description }}
              </p>
            </div>
            <div class="document-actions">
              <a
                v-if="document.url || document.downloadUrl"
                :href="document.url || document.downloadUrl"
                target="_blank"
                class="btn btn-sm btn-dark rounded-pill"
                :download="document.name"
              >
                <i class="bi bi-download me-2"></i>
                {{ $t('clientPortal.documents.download') }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientDocuments } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientDocumentsView',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(true);
    const error = ref('');
    const documents = ref([]);
    const client = ref(null);
    const commerce = ref(null);

    const formatDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatSize = bytes => {
      if (!bytes) return '';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const goBack = () => {
      router.push({ path: '/portal' });
    };

    const loadDocuments = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ path: '/portal/login' });
          return;
        }

        client.value = JSON.parse(storedClient);
        commerce.value = JSON.parse(storedCommerce);

        // Obtener documentos
        const response = await getClientDocuments(commerce.value.id, client.value.id);
        documents.value = response || [];
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.documents.loadError');
        console.error('Error loading documents:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadDocuments();
    });

    return {
      loading,
      error,
      documents,
      client,
      commerce,
      formatDate,
      formatSize,
      goBack,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.documents-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.document-card {
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.3s ease;
}

.document-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.document-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--color-text);
}

.document-meta {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
}

.document-description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
}

.document-actions {
  flex-shrink: 0;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .documents-container {
    padding: 0.5rem;
  }

  .document-card {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .document-actions {
    width: 100%;
  }

  .document-actions .btn {
    width: 100%;
  }
}
</style>
