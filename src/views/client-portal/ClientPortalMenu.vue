<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :loading="false"
      ></CommerceLogo>

      <!-- Welcome Section -->
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('clientPortal.menu.welcome', { name: clientName }) }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.menu.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.menu.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
          <div class="mt-3">
            <button @click="logout" class="btn btn-outline-danger">
              {{ $t('clientPortal.menu.logout') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Menu Options -->
      <div v-else class="portal-menu-container">
        <div class="portal-menu-card">
          <div class="portal-menu-content">
            <div class="row">
              <div
                v-for="option in menuOptions"
                :key="option"
                class="col-12 col-md-6 col-lg-4 mb-3"
              >
                <button
                  type="button"
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill portal-menu-btn"
                  @click="goToOption(option)"
                >
                  <i :class="`bi ${getOptionIcon(option)} me-2`"></i>
                  {{ $t(`clientPortal.menu.${option}`) }}
                </button>
              </div>
            </div>

            <!-- Logout Button -->
            <div class="row mt-4">
              <div class="col-12">
                <button type="button" class="btn btn-outline-secondary btn-sm" @click="logout">
                  <i class="bi bi-box-arrow-right me-2"></i>
                  {{ $t('clientPortal.menu.logout') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { validatePortalSession } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientPortalMenu',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(true);
    const error = ref('');
    const client = ref(null);
    const commerce = ref(null);
    const sessionToken = ref('');

    const menuOptions = ref(['consents', 'telemedicine', 'profile', 'documents', 'history']);

    const clientName = computed(() => {
      if (client.value) {
        return `${client.value.name || ''} ${client.value.lastName || ''}`.trim() || 'Cliente';
      }
      return 'Cliente';
    });

    const getOptionIcon = option => {
      const icons = {
        consents: 'bi-shield-check',
        telemedicine: 'bi-camera-video',
        profile: 'bi-person-circle',
        documents: 'bi-file-earmark-text',
        history: 'bi-clock-history',
      };
      return icons[option] || 'bi-circle';
    };

    const goToOption = async option => {
      try {
        if (option === 'consents') {
          await router.push({ path: '/portal/consents' });
        } else if (option === 'telemedicine') {
          await router.push({ path: '/portal/telemedicine' });
        } else if (option === 'profile') {
          await router.push({ path: '/portal/profile' });
        } else if (option === 'documents') {
          await router.push({ path: '/portal/documents' });
        } else if (option === 'history') {
          await router.push({ path: '/portal/history' });
        }
      } catch (err) {
        error.value = err.message || t('clientPortal.menu.navigationError');
      }
    };

    const logout = () => {
      localStorage.removeItem('clientPortalSessionToken');
      localStorage.removeItem('clientPortalSessionExpiresAt');
      localStorage.removeItem('clientPortalClient');
      localStorage.removeItem('clientPortalCommerce');
      router.push({ path: '/portal/login' });
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
          sessionToken.value = token;

          // Atualizar dados no localStorage
          if (response.client) {
            localStorage.setItem('clientPortalClient', JSON.stringify(response.client));
          }
          if (response.commerce) {
            localStorage.setItem('clientPortalCommerce', JSON.stringify(response.commerce));
          }
        } else {
          // Sessão inválida ou expirada
          logout();
        }
      } catch (err) {
        error.value = err.response?.data?.message || t('clientPortal.menu.sessionError');
        // Se erro 401 ou 403, fazer logout
        if (err.response?.status === 401 || err.response?.status === 403) {
          setTimeout(() => logout(), 2000);
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      // Tentar carregar dados do localStorage primeiro
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

      // Validar sessão
      await validateSession();

      // Iniciar monitoramento de sessão se válida
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
        logout();
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
              logout();
            }
          } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
              logout();
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
      menuOptions,
      clientName,
      getOptionIcon,
      goToOption,
      logout,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.portal-menu-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.portal-menu-card {
  width: 100%;
  max-width: 800px;
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
}

.portal-menu-content {
  padding: 1.5rem;
}

.portal-menu-btn {
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 60px;
}

.portal-menu-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 74, 173, 0.4);
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .portal-menu-content {
    padding: 1rem;
  }

  .portal-menu-btn {
    padding: 0.875rem 1.5rem;
    font-size: 0.95rem;
    min-height: 55px;
  }
}
</style>
