<template>
  <div>
    <div class="content text-center">
      <div class="d-block d-lg-none">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="commerce?.businessId"
          :loading="loading"
        ></CommerceLogo>
      </div>
      <div class="row align-items-center mb-1 desktop-header-row d-none d-lg-flex">
        <div class="col-auto desktop-logo-wrapper">
          <div class="desktop-commerce-logo">
            <CommerceLogo
              :commerce-id="commerce?.id"
              :business-id="commerce?.businessId"
              :loading="loading"
              class="logo-desktop"
            />
          </div>
        </div>
        <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
          <ComponentMenu
            :title="$t('clientPortal.documents.title')"
            :toggles="toggles"
            component-name="clientPortalDocuments"
            :is-client-portal="true"
            @goBack="goBack"
          />
        </div>
      </div>
      <div class="d-block d-lg-none">
        <ComponentMenu
          :title="$t('clientPortal.documents.title')"
          :toggles="toggles"
          component-name="clientPortalDocuments"
          :is-client-portal="true"
          @goBack="goBack"
        />
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
      <div v-else class="documents-container-modern">
        <div v-if="documents.length === 0" class="empty-state">
          <i class="bi bi-file-earmark"></i>
          <p>{{ $t('clientPortal.documents.noDocuments') }}</p>
        </div>

        <div v-else class="timeline-container">
          <div v-for="(document, index) in documents" :key="document.id" class="timeline-item">
            <!-- Timeline dot -->
            <div class="timeline-dot">
              <div class="dot-inner"></div>
            </div>

            <!-- Timeline line (not for last item) -->
            <div v-if="index < documents.length - 1" class="timeline-line"></div>

            <!-- Document card -->
            <div class="document-card-modern">
              <div class="document-icon-modern">
                <i
                  :class="`bi ${
                    document.type === 'PDF' || document.name?.endsWith('.pdf')
                      ? 'bi-file-pdf-fill'
                      : document.name?.endsWith('.jpg') || document.name?.endsWith('.png')
                      ? 'bi-file-image-fill'
                      : 'bi-file-earmark-text-fill'
                  }`"
                ></i>
              </div>

              <div class="document-content-modern">
                <h6 class="document-title-modern">
                  {{ document.name || $t('clientPortal.documents.unnamed') }}
                </h6>

                <div class="document-meta-modern">
                  <span v-if="document.createdAt" class="meta-item">
                    <i class="bi bi-calendar3"></i>
                    {{ formatDate(document.createdAt) }}
                  </span>
                  <span v-if="document.size" class="meta-item">
                    <i class="bi bi-hdd"></i>
                    {{ formatSize(document.size) }}
                  </span>
                </div>

                <p v-if="document.description" class="document-description-modern">
                  {{ document.description }}
                </p>
              </div>

              <div class="document-action-modern">
                <a
                  v-if="document.url || document.downloadUrl"
                  :href="document.url || document.downloadUrl"
                  target="_blank"
                  class="btn-download-modern"
                  :download="document.name"
                  :title="$t('clientPortal.documents.download')"
                >
                  <i class="bi bi-download"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientDocuments } from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientDocumentsView',
  components: {
    ComponentMenu,
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const commerceSlug = ref(route.params.commerceSlug);

    const loading = ref(true);
    const error = ref('');
    const documents = ref([]);
    const client = ref(null);
    const commerce = ref(null);
    const permissions = ref({});

    // Toggles para ComponentMenu (computed basado en permisos)
    const toggles = computed(() => ({
      'clientPortal.documents.view': permissions.value['client-portal.documents.view'] || false,
      'clientPortal.documents.download': permissions.value['client-portal.documents.view'] || false,
    }));

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
      router.push({ name: 'client-portal-menu', params: { commerceSlug: commerceSlug.value } });
    };

    const loadDocuments = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
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

    const loadPermissions = async () => {
      try {
        const clientPermissions = await getClientPortalPermissions('client-portal', 'documents');
        permissions.value = clientPermissions;
      } catch (err) {
        console.error('Error loading permissions:', err);
        // Permisos por defecto si falla
        permissions.value = {
          'client-portal.documents.view': true,
          'client-portal.documents.download': true,
        };
      }
    };

    onMounted(async () => {
      await loadPermissions();
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
      permissions,
      toggles,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

/* Desktop Header Styles */
.desktop-header-row {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.desktop-logo-wrapper {
  flex: 0 0 auto;
  max-width: 200px;
}

.desktop-commerce-logo {
  display: flex;
  align-items: center;
  max-width: 150px;
  text-align: left;
}

.logo-desktop {
  max-width: 120px;
  max-height: 100px;
  width: auto;
  height: auto;
  margin-bottom: 0;
}

.desktop-menu-wrapper {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;
  text-align: left;
}

/* Documents Container */
.documents-container-modern {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 0.9375rem;
  margin: 0;
}

/* Timeline Container */
.timeline-container {
  position: relative;
  padding: 0.5rem 0;
}

/* Timeline Item */
.timeline-item {
  position: relative;
  padding-left: 3rem;
  margin-bottom: 1rem;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

/* Timeline Dot */
.timeline-dot {
  position: absolute;
  left: 0;
  top: 0.875rem;
  width: 1.5rem;
  height: 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(4, 159, 217, 0.3);
  z-index: 2;
}

.dot-inner {
  width: 0.5rem;
  height: 0.5rem;
  background: white;
  border-radius: 50%;
}

/* Timeline Line */
.timeline-line {
  position: absolute;
  left: 0.75rem;
  top: 2.375rem;
  bottom: -1rem;
  width: 2px;
  background: linear-gradient(180deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  opacity: 0.3;
  z-index: 1;
}

/* Document Card Modern */
.document-card-modern {
  background: var(--color-background);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.document-card-modern:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(4px);
  border-color: rgba(4, 159, 217, 0.2);
}

/* Document Icon */
.document-icon-modern {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.1) 0%, rgba(0, 182, 122, 0.1) 100%);
  border-radius: 0.5rem;
  font-size: 1.25rem;
  color: var(--azul-turno);
}

/* Document Content */
.document-content-modern {
  flex: 1;
  min-width: 0;
}

.document-title-modern {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.375rem 0;
  line-height: 1.3;
}

.document-meta-modern {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.375rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.meta-item i {
  font-size: 0.6875rem;
  opacity: 0.7;
}

.document-description-modern {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Document Action */
.document-action-modern {
  flex-shrink: 0;
}

.btn-download-modern {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.btn-download-modern:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(4, 159, 217, 0.4);
  color: white;
}

.btn-download-modern:active {
  transform: scale(0.95);
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .documents-container-modern {
    padding: 0.75rem;
  }

  .timeline-item {
    padding-left: 2.5rem;
  }

  .timeline-dot {
    width: 1.25rem;
    height: 1.25rem;
  }

  .dot-inner {
    width: 0.375rem;
    height: 0.375rem;
  }

  .timeline-line {
    left: 0.625rem;
  }

  .document-card-modern {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .document-icon-modern {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 1.125rem;
  }

  .document-title-modern {
    font-size: 0.875rem;
  }

  .meta-item {
    font-size: 0.6875rem;
  }

  .btn-download-modern {
    width: 2.25rem;
    height: 2.25rem;
    font-size: 0.9375rem;
  }
}
</style>



