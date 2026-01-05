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
          <span>{{ $t('clientPortal.consents.title') }}</span>
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-link text-muted" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>
            {{ $t('clientPortal.consents.backToMenu') }}
          </button>
        </div>
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
            :disabled="consents.length === 0"
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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  validatePortalSession,
  getClientConsents,
  revokeConsent,
} from '../../application/services/client-portal';
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
    CommerceLogo,
    ConsentSummaryCards,
    ConsentStatusCard,
    ConsentRevokeModal,
    ConsentHistoryModal,
    ConsentTermsModal,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

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
      selectedConsent.value = consent;
      showRevokeModal.value = true;
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
      router.push({ path: '/portal' });
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
      if (!token) {
        router.push({ path: '/portal/login' });
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
          router.push({ path: '/portal/login' });
        }
      } catch (err) {
        error.value = err.response?.data?.message || t('clientPortal.consents.sessionError');
        if (err.response?.status === 401 || err.response?.status === 403) {
          setTimeout(() => router.push({ path: '/portal/login' }), 2000);
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

      // Iniciar monitoramento de sessão
      const token = localStorage.getItem('clientPortalSessionToken');
      if (token) {
        startSessionMonitoring();
      }
    });

    // Session management - timeout de inatividade
    let sessionCheckInterval = null;
    let inactivityTimeout = null;
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Verificar cada 5 minutos

    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      inactivityTimeout = setTimeout(() => {
        console.log('Session expired due to inactivity');
        router.push({ path: '/portal/login' });
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
              router.push({ path: '/portal/login' });
            }
          } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              router.push({ path: '/portal/login' });
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
