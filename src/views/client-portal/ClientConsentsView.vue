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
            :title="$t('clientPortal.consents.title')"
            :toggles="toggles"
            component-name="clientPortalConsents"
            :is-client-portal="true"
            @goBack="goBack"
          />
        </div>
      </div>
      <div class="d-block d-lg-none">
        <ComponentMenu
          :title="$t('clientPortal.consents.title')"
          :toggles="toggles"
          component-name="clientPortalConsents"
          :is-client-portal="true"
          @goBack="goBack"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.consents.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.consents.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="consents-container">
        <!-- Export Button -->
        <div class="d-flex justify-content-end mb-3">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            @click="exportConsents"
            :disabled="consents.length === 0 || !canViewConsents"
          >
            <i class="bi bi-download me-2"></i>
            {{ $t('clientPortal.consents.export') }}
          </button>
        </div>

        <!-- Summary Cards -->
        <ConsentSummaryCards :summary="summary" :active-filter="activeFilter" @filter="setFilter" />

        <!-- Consents List -->
        <div class="consents-list mt-4">
          <div v-if="filteredConsents.length === 0" class="text-center py-5">
            <i class="bi bi-inbox" style="font-size: 3rem; color: var(--gris-elite-1)"></i>
            <p class="mt-3 text-muted">{{ $t('clientPortal.consents.noConsents') }}</p>
          </div>

          <div v-else>
            <ConsentStatusCard
              v-for="consent in filteredConsents"
              :key="consent.id"
              :consent="consent"
              :commerce="commerce"
              @revoke="handleRevoke"
              @view-history="viewHistory"
              @view-terms="viewTerms"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Revoke Modal -->
    <ConsentRevokeModal
      v-if="showRevokeModal"
      :consent="selectedConsent"
      @confirm="confirmRevoke"
      @cancel="cancelRevoke"
    />

    <!-- History Modal -->
    <ConsentHistoryModal v-if="showHistoryModal" :consent="selectedConsent" @close="closeHistory" />

    <!-- Terms Modal -->
    <ConsentTermsModal v-if="showTermsModal" :consent="selectedConsent" @close="closeTerms" />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import {
  validatePortalSession,
  getClientConsents,
  revokeConsent,
} from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import ConsentSummaryCards from '../../components/client-portal/ConsentSummaryCards.vue';
import ConsentStatusCard from '../../components/client-portal/ConsentStatusCard.vue';
import ConsentRevokeModal from '../../components/client-portal/ConsentRevokeModal.vue';
import ConsentHistoryModal from '../../components/client-portal/ConsentHistoryModal.vue';
import ConsentTermsModal from '../../components/client-portal/ConsentTermsModal.vue';
import jsonToCsv from '../../shared/utils/jsonToCsv';

export default {
  name: 'ClientConsentsView',
  components: {
    ComponentMenu,
    CommerceLogo,
    ConsentSummaryCards,
    ConsentStatusCard,
    ConsentRevokeModal,
    ConsentHistoryModal,
    ConsentTermsModal,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const commerceSlug = ref(route.params.commerceSlug);

    const loading = ref(true);
    const error = ref('');
    const client = ref(null);
    const commerce = ref(null);
    const consents = ref([]);
    const activeFilter = ref('all');
    const showRevokeModal = ref(false);
    const showHistoryModal = ref(false);
    const showTermsModal = ref(false);
    const selectedConsent = ref(null);

    // Permisos del cliente
    const permissions = ref({});

    // Toggles para ComponentMenu (computed basado en permisos)
    const toggles = computed(() => ({
      'clientPortal.consents.view': permissions.value['client-portal.consents.view'] || false,
      'clientPortal.consents.export': permissions.value['client-portal.consents.view'] || false,
      'clientPortal.consents.revoke': permissions.value['client-portal.consents.reject'] || false,
    }));

    // Permisos individuales para acciones específicas
    const canViewConsents = computed(
      () => permissions.value['client-portal.consents.view'] || false,
    );
    const canRevokeConsents = computed(
      () => permissions.value['client-portal.consents.reject'] || false,
    );

    let sessionCheckInterval = null;
    let inactivityTimeout = null;

    const summary = computed(() => {
      const s = {
        granted: 0,
        denied: 0,
        pending: 0,
        expired: 0,
        revoked: 0,
        total: consents.value.length,
      };

      consents.value.forEach(consent => {
        const status =
          typeof consent.status === 'string' ? consent.status.toUpperCase() : consent.status;
        if (status === 'GRANTED') s.granted++;
        else if (status === 'DENIED') s.denied++;
        else if (status === 'PENDING') s.pending++;
        else if (status === 'EXPIRED') s.expired++;
        else if (status === 'REVOKED') s.revoked++;
      });

      return s;
    });

    const filteredConsents = computed(() => {
      if (activeFilter.value === 'all') {
        return consents.value;
      }
      return consents.value.filter(c => {
        const status = typeof c.status === 'string' ? c.status.toUpperCase() : c.status;
        return status === activeFilter.value.toUpperCase();
      });
    });

    const setFilter = filter => {
      activeFilter.value = filter;
    };

    const handleRevoke = consent => {
      if (!canRevokeConsents.value) {
        error.value = t('clientPortal.consents.noPermissionRevoke');
        return;
      }
      selectedConsent.value = consent;
      showRevokeModal.value = true;
    };

    const loadPermissions = async () => {
      try {
        const clientPermissions = await getClientPortalPermissions('client-portal', 'consents');
        permissions.value = clientPermissions;
      } catch (err) {
        console.error('Error loading permissions:', err);
        // Si falla, damos permisos por defecto para no bloquear
        permissions.value = {
          'client-portal.consents.view': true,
          'client-portal.consents.accept': true,
          'client-portal.consents.reject': true,
        };
      }
    };

    const confirmRevoke = async reason => {
      if (!selectedConsent.value) {
        return;
      }

      try {
        loading.value = true;
        error.value = '';

        await revokeConsent(selectedConsent.value.id, reason);

        showRevokeModal.value = false;
        selectedConsent.value = null;

        // Recarregar consentimentos
        await loadConsents();
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.consents.revokeError');
      } finally {
        loading.value = false;
      }
    };

    const cancelRevoke = () => {
      showRevokeModal.value = false;
      selectedConsent.value = null;
    };

    const viewHistory = consent => {
      selectedConsent.value = consent;
      showHistoryModal.value = true;
    };

    const closeHistory = () => {
      showHistoryModal.value = false;
      selectedConsent.value = null;
    };

    const viewTerms = consent => {
      selectedConsent.value = consent;
      showTermsModal.value = true;
    };

    const closeTerms = () => {
      showTermsModal.value = false;
      selectedConsent.value = null;
    };

    const goBack = () => {
      router.push({ name: 'client-portal-menu', params: { commerceSlug: commerceSlug.value } });
    };

    const exportConsents = () => {
      if (consents.value.length === 0) {
        return;
      }

      // Preparar datos para exportación (Art. 9º LGPD)
      const exportData = consents.value.map(consent => ({
        'Tipo de Consentimiento': consent.consentType || consent.type || 'N/A',
        Status:
          t(`clientPortal.consents.status.${(consent.status || '').toLowerCase()}`) ||
          consent.status,
        'Concedido em': consent.grantedAt
          ? new Date(consent.grantedAt).toLocaleString('pt-BR')
          : 'N/A',
        'Expira em': consent.expiresAt
          ? new Date(consent.expiresAt).toLocaleString('pt-BR')
          : 'Não expira',
        'Revogado em': consent.revokedAt
          ? new Date(consent.revokedAt).toLocaleString('pt-BR')
          : 'N/A',
        Método: consent.consentMethod || 'N/A',
        Finalidade: consent.purpose || 'N/A',
        'Base Legal': consent.legalBasis || 'N/A',
        Descrição: consent.description || 'N/A',
        Notas: consent.notes || 'N/A',
      }));

      // Exportar como CSV
      const csv = jsonToCsv(exportData);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `consentimentos-lgpd-${new Date().toISOString().split('T')[0]}.csv`,
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const loadConsents = async () => {
      if (!client.value || !commerce.value) {
        return;
      }

      try {
        loading.value = true;
        error.value = '';

        // Buscar consentimentos via API do portal
        const response = await getClientConsents(commerce.value.id, client.value.id);

        if (response && response.consents) {
          consents.value = response.consents;
        } else {
          consents.value = [];
        }
      } catch (err) {
        error.value = err.response?.data?.message || t('clientPortal.consents.loadError');
        consents.value = [];
      } finally {
        loading.value = false;
      }
    };

    const validateSession = async () => {
      const token = localStorage.getItem('clientPortalSessionToken');
      const expiresAt = localStorage.getItem('clientPortalSessionExpiresAt');

      if (!token) {
        router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
        return;
      }

      // Si el token existe y no ha expirado, asumir válido (evitar doble validación)
      if (expiresAt && new Date(expiresAt) > new Date()) {
        // Cargar datos desde localStorage si existen
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');
        if (storedClient) {
          try {
            client.value = JSON.parse(storedClient);
          } catch (e) {
            console.error('Error parsing stored client:', e);
          }
        }
        if (storedCommerce) {
          try {
            commerce.value = JSON.parse(storedCommerce);
          } catch (e) {
            console.error('Error parsing stored commerce:', e);
          }
        }

        // Carregar consentimentos
        await loadConsents();
        return;
      }

      try {
        const response = await validatePortalSession(token);
        if (response && response.valid && !response.expired) {
          client.value = response.client;
          commerce.value = response.commerce;

          // Carregar consentimentos
          await loadConsents();
        } else {
          router.push({
            name: 'client-portal-login',
            params: { commerceSlug: commerceSlug.value },
          });
        }
      } catch (err) {
        error.value = err.response?.data?.message || t('clientPortal.consents.sessionError');
        if (err.response?.status === 401 || err.response?.status === 403) {
          setTimeout(
            () =>
              router.push({
                name: 'client-portal-login',
                params: { commerceSlug: commerceSlug.value },
              }),
            2000,
          );
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      // Carregar dados do localStorage
      const storedClient = localStorage.getItem('clientPortalClient');
      const storedCommerce = localStorage.getItem('clientPortalCommerce');
      if (storedClient) {
        try {
          client.value = JSON.parse(storedClient);
        } catch (e) {
          console.error('Error parsing stored client:', e);
        }
      }
      if (storedCommerce) {
        try {
          commerce.value = JSON.parse(storedCommerce);
        } catch (e) {
          console.error('Error parsing stored commerce:', e);
        }
      }

      // Validar sessão e carregar dados
      await validateSession();

      // Cargar permisos
      await loadPermissions();

      // Iniciar monitoramento de sessão
      const token = localStorage.getItem('clientPortalSessionToken');
      if (token) {
        startSessionMonitoring();
      }
    });

    // Session management - timeout de inatividade
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Verificar cada 5 minutos

    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      inactivityTimeout = setTimeout(() => {
        router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
      }, INACTIVITY_TIMEOUT_MS);
    };

    const startSessionMonitoring = () => {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
      });

      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      sessionCheckInterval = setInterval(async () => {
        const token = localStorage.getItem('clientPortalSessionToken');
        if (token) {
          try {
            const response = await validatePortalSession(token);
            if (!response || !response.valid || response.expired) {
              router.push({
                name: 'client-portal-login',
                params: { commerceSlug: commerceSlug.value },
              });
            }
          } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              router.push({
                name: 'client-portal-login',
                params: { commerceSlug: commerceSlug.value },
              });
            }
          }
        }
      }, SESSION_CHECK_INTERVAL_MS);

      resetInactivityTimer();
    };

    const stopSessionMonitoring = () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
      }
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
    };

    onUnmounted(() => {
      stopSessionMonitoring();
    });

    return {
      loading,
      error,
      client,
      commerce,
      consents,
      summary,
      activeFilter,
      filteredConsents,
      showRevokeModal,
      showHistoryModal,
      toggles,
      showTermsModal,
      selectedConsent,
      setFilter,
      handleRevoke,
      confirmRevoke,
      cancelRevoke,
      viewHistory,
      closeHistory,
      viewTerms,
      closeTerms,
      goBack,
      exportConsents,
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

.consents-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.consents-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .consents-container {
    padding: 0.5rem;
  }
}
</style>
