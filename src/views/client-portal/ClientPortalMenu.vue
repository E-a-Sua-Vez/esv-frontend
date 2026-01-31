<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none mobile-menu-layout">
      <div class="content text-center">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="commerce?.businessId"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t('clientPortal.menu.welcome', { name: clientName })"
          :toggles="toggles"
          component-name="clientPortalMenu"
          :is-client-portal="true"
          @goBack="logout"
        />

        <!-- Loading/Error States -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">{{ $t('clientPortal.menu.loading') }}</span>
          </div>
          <p class="mt-3 text-muted">{{ $t('clientPortal.menu.loading') }}</p>
        </div>
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

        <!-- Mobile Toggle between Menu and Spy -->
        <div v-else id="menu-mobile">
          <div class="sub-menu-spy">
            <span v-if="showMobileMenuSide" @click="onShowMobileSpySide()">
              {{ $t('clientPortal.menu.seeSpy') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
            <span v-else @click="onShowMobileMenuSide()">
              {{ $t('clientPortal.menu.seeMenu') }}<i class="bi bi-arrow-left-circle-fill mx-1"></i>
            </span>
          </div>
          <div class="mobile-content-wrapper">
            <Transition name="slide" mode="out-in">
              <div
                v-if="showMobileMenuSide === true"
                id="menu-side-mobile"
                :key="`menu-side-mobile`"
              >
                <div class="choose-attention my-3 mt-4">
                  <span>{{ $t('clientPortal.menu.choose') }}</span>
                </div>
                <div class="row mobile-cards-grid">
                  <div
                    v-for="option in menuOptions"
                    :key="option"
                    class="col-8 mobile-card-wrapper"
                  >
                    <div
                      class="menu-card mobile-menu-card"
                      @click="goToOption(option)"
                    >
                      <div class="card-icon">
                        <i :class="`bi ${getOptionIcon(option)}`"></i>
                      </div>
                      <div class="card-text">{{ $t(`clientPortal.menu.${option}`) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else-if="showMobileSpySide" id="spy-side-mobile" :key="`spy-side-mobile`">
                <ClientPortalSpy
                  :upcoming-bookings="upcomingBookings"
                  :last-attention="lastAttention"
                  :pending-consents="pendingConsentsCount"
                  :recent-documents="recentDocuments"
                  :commerce="commerce"
                />
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block desktop-menu-layout">
      <div class="content text-center">
        <div class="row align-items-center mb-1 desktop-header-row">
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
              :title="$t('clientPortal.menu.welcome', { name: clientName })"
              :toggles="toggles"
              component-name="clientPortalMenu"
              :is-client-portal="true"
              @goBack="logout"
            />
          </div>
        </div>

        <!-- Loading/Error States -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">{{ $t('clientPortal.menu.loading') }}</span>
          </div>
          <p class="mt-3 text-muted">{{ $t('clientPortal.menu.loading') }}</p>
        </div>
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

        <!-- Desktop 2-Column Layout -->
        <div v-else id="menu-desktop" class="row desktop-menu-content">
          <div id="menu-side" class="col-lg-5 desktop-menu-column">
            <div class="choose-attention my-3 mb-4">
              <span>{{ $t('clientPortal.menu.choose') }}</span>
            </div>
            <div class="row menu-cards-grid">
              <div
                v-for="option in menuOptions"
                :key="option"
                class="col-12 col-md-6 col-lg-4 menu-card-wrapper"
              >
                <div
                  class="menu-card"
                  @click="goToOption(option)"
                >
                  <div class="card-icon">
                    <i :class="`bi ${getOptionIcon(option)}`"></i>
                  </div>
                  <div class="card-text">{{ $t(`clientPortal.menu.${option}`) }}</div>
                </div>
              </div>
            </div>
          </div>
          <div id="spy-side" class="col-lg-7 desktop-spy-column" v-if="!loading">
            <ClientPortalSpy
              :upcoming-bookings="upcomingBookings"
              :last-attention="lastAttention"
              :pending-consents="pendingConsentsCount"
              :recent-documents="recentDocuments"
              :commerce="commerce"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { validatePortalSession } from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import { globalStore } from '../../stores';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ClientPortalSpy from '../../components/client-portal/ClientPortalSpy.vue';

export default {
  name: 'ClientPortalMenu',
  components: {
    CommerceLogo,
    ComponentMenu,
    ClientPortalSpy,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const store = globalStore();

    const loading = ref(true);
    const error = ref('');
    const client = ref(null);
    const commerce = ref(null);
    const sessionToken = ref('');
    const commerceSlug = ref(route.params.commerceSlug);

    // Permisos del cliente
    const permissions = ref({});
    const menuOptions = computed(() => {
      const options = [];
      if (permissions.value['client-portal.menu.consents']) options.push('consents');
      if (permissions.value['client-portal.menu.telemedicine']) options.push('telemedicine');
      if (permissions.value['client-portal.menu.profile']) options.push('profile');
      if (permissions.value['client-portal.menu.documents']) options.push('documents');
      if (permissions.value['client-portal.menu.history']) options.push('history');
      return options;
    });

    // Toggles para ComponentMenu
    const toggles = reactive({
      'clientPortal.menu.view': true,
    });

    // Mobile toggle between menu and spy
    const showMobileMenuSide = ref(true);
    const showMobileSpySide = ref(false);

    // Spy data
    const upcomingBookings = ref([]);
    const lastAttention = ref(null);
    const pendingConsentsCount = ref(0);
    const recentDocuments = ref([]);

    // Session management variables
    let sessionCheckInterval = null;
    let inactivityTimeout = null;
    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
    const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Verificar cada 5 minutos

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
        const slug = commerceSlug.value;
        if (option === 'consents') {
          await router.push({ name: 'client-portal-consents', params: { commerceSlug: slug } });
        } else if (option === 'telemedicine') {
          await router.push({ name: 'client-portal-telemedicine', params: { commerceSlug: slug } });
        } else if (option === 'profile') {
          await router.push({ name: 'client-portal-profile', params: { commerceSlug: slug } });
        } else if (option === 'documents') {
          await router.push({ name: 'client-portal-documents', params: { commerceSlug: slug } });
        } else if (option === 'history') {
          await router.push({ name: 'client-portal-history', params: { commerceSlug: slug } });
        }
      } catch (err) {
        error.value = err.message || t('clientPortal.menu.navigationError');
      }
    };

    const logout = async () => {
      // Limpiar localStorage
      localStorage.removeItem('clientPortalSessionToken');
      localStorage.removeItem('clientPortalSessionExpiresAt');
      localStorage.removeItem('clientPortalClient');
      localStorage.removeItem('clientPortalCommerce');

      // Limpiar store
      await store.setCurrentUserType('client');
      await store.setCurrentUser(null);
      await store.setCurrentCommerce(null);
      await store.setCurrentPermissions(null);

      router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
    };

    const onShowMobileMenuSide = () => {
      showMobileMenuSide.value = true;
      showMobileSpySide.value = false;
    };

    const onShowMobileSpySide = () => {
      showMobileMenuSide.value = false;
      showMobileSpySide.value = true;
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
        sessionToken.value = token;
        loading.value = false;
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

    const loadPermissions = async clientPortalSessionToken => {
      try {
        // Asegurar token válido: usar argumento o el almacenado
        const token = clientPortalSessionToken || localStorage.getItem('clientPortalSessionToken');
        const clientPermissions = await getClientPortalPermissions(
          'client-portal',
          'menu',
          undefined,
          token,
        );

        // Si la respuesta viene vacía o sin permisos verdaderos, aplicamos default
        const hasAnyPermission =
          clientPermissions && Object.values(clientPermissions).some(v => !!v);
        if (!clientPermissions || !hasAnyPermission) {
          const defaultPermissions = {
            'client-portal.menu.consents': true,
            'client-portal.menu.telemedicine': true,
            'client-portal.menu.profile': true,
            'client-portal.menu.documents': true,
            'client-portal.menu.history': true,
          };
          permissions.value = defaultPermissions;
          localStorage.setItem('clientPortalPermissions', JSON.stringify(defaultPermissions));
        } else {
          permissions.value = clientPermissions;
          localStorage.setItem('clientPortalPermissions', JSON.stringify(clientPermissions));
        }
      } catch (err) {
        // Si falla, usamos todos los permisos por defecto para no bloquear al cliente
        const defaultPermissions = {
          'client-portal.menu.consents': true,
          'client-portal.menu.telemedicine': true,
          'client-portal.menu.profile': true,
          'client-portal.menu.documents': true,
          'client-portal.menu.history': true,
        };
        permissions.value = defaultPermissions;
        localStorage.setItem('clientPortalPermissions', JSON.stringify(defaultPermissions));
      }
    };

    onMounted(async () => {
      // Tentar carregar dados do localStorage primeiro
      const storedClient = localStorage.getItem('clientPortalClient');
      const storedCommerce = localStorage.getItem('clientPortalCommerce');
      const clientPortalSessionToken = localStorage.getItem('clientPortalSessionToken');

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

      // Validar sessão solo si no hay datos o token expirado
      await validateSession();

      // Cargar permisos
      await loadPermissions(clientPortalSessionToken);

      // Iniciar monitoramento de sessão se válida
      if (client.value && commerce.value) {
        startSessionMonitoring();
      }
    });

    // Session management functions
    const resetInactivityTimer = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }
      inactivityTimeout = setTimeout(() => {
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
      toggles,
      showMobileMenuSide,
      showMobileSpySide,
      upcomingBookings,
      lastAttention,
      pendingConsentsCount,
      recentDocuments,
      clientName,
      getOptionIcon,
      goToOption,
      logout,
      onShowMobileMenuSide,
      onShowMobileSpySide,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}

.btn-style {
  line-height: 1rem;
  padding: 0.65rem 0rem;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

/* Mobile Layout */
.mobile-menu-layout {
  width: 100%;
}

.sub-menu-spy {
  margin: 2rem 0 1rem 0;
  display: flex;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: var(--azul-turno);
  cursor: pointer;
}

.sub-menu-spy span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.mobile-content-wrapper {
  position: relative;
  overflow: hidden;
}

.mobile-button-wrapper {
  margin-bottom: 0.25rem;
}

.mobile-button-wrapper .btn {
  width: 66.666667%;
  margin-left: auto;
  margin-right: auto;
}

/* Slide transition for mobile */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Desktop Layout */
.desktop-menu-layout {
  width: 100%;
}

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

.desktop-menu-content {
  padding: 0 1rem;
  min-height: 60vh;
}

.desktop-menu-column {
  padding: 1rem;
  border-right: 1px solid var(--gris-clear);
}

.desktop-spy-column {
  padding: 1rem;
}

.menu-buttons-grid {
  gap: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
}

.menu-button-wrapper {
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  margin-bottom: 0.5rem;
}

.menu-button-wrapper > div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.menu-button-wrapper .btn,
.mobile-button-wrapper .btn {
  width: 100%;
  max-width: 100%;
  font-size: 0.85rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
}

.menu-button-wrapper .btn:hover,
.mobile-button-wrapper .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.menu-button-wrapper .btn:active,
.mobile-button-wrapper .btn:active {
  transform: translateY(0);
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .desktop-menu-column {
    border-right: none;
    border-bottom: 1px solid var(--gris-clear);
    padding-bottom: 2rem;
    margin-bottom: 2rem;
  }
}

@media (max-width: 991px) {
  .choose-attention {
    font-size: 0.95rem;
  }

  .menu-button-wrapper .btn,
  .mobile-button-wrapper .btn {
    font-size: 0.9rem;
  }
}

/* New card-based menu styles */
.menu-cards-grid {
  gap: 0.5rem;
  justify-content: center;
}

.menu-card-wrapper {
  display: flex;
  justify-content: center;
}

.menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.5rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #007bff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100px;
  width: 120px;
  text-decoration: none;
  color: inherit;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.12);
  border-color: var(--azul-turno);
}

.card-icon {
  font-size: 1.25rem;
  color: var(--azul-turno);
  margin-bottom: 0.15rem;
  position: relative;
}

.card-text {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  color: #333;
  line-height: 1.1;
  max-width: 100%;
  word-wrap: break-word;
  hyphens: auto;
  padding: 0 0.1rem;
}

/* Mobile card styles */
.mobile-cards-grid {
  gap: 0.5rem;
  justify-content: center;
}

.mobile-card-wrapper {
  display: flex;
  justify-content: center;
  padding: 0.25rem;
}

.mobile-menu-card {
  height: 100px;
  padding: 0.75rem 0.5rem;
  width: 140px; /* Consistent width for regular buttons */
}

.mobile-menu-card .card-icon {
  font-size: 1.25rem;
  margin-bottom: 0.2rem;
}

.mobile-menu-card .card-text {
  font-size: 0.7rem; /* Reduced for long text */
  font-weight: 500;
  word-wrap: break-word;
  hyphens: auto;
  line-height: 1.1;
  padding: 0 0.1rem;
}
</style>
