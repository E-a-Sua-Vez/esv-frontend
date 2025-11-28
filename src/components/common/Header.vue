<script>
import { ref, reactive, onBeforeMount, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import { signOut, signInInvited } from '../../application/services/auth';
import { getDateAndHour } from '../../shared/utils/date';
import { messageCollection } from '../../application/firebase';
import { query, where, orderBy, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import { useI18n } from 'vue-i18n';
import { useFirebaseListener } from '../../composables/useFirebaseListener';
import { USER_TYPES, ENVIRONMENTS } from '../../shared/constants';
import LocaleSelector from './LocaleSelector.vue';
import Spinner from '../../components/common/Spinner.vue';
import MyUser from '../domain/MyUser.vue';

export default {
  components: { LocaleSelector, Spinner, MyUser },
  name: 'Header',
  async setup() {
    const router = useRouter();
    const { t } = useI18n();
    let store = globalStore();

    const loading = ref(false);

    // Track query parameters for dynamic listener
    const messageQueryParams = ref({ collaboratorId: null, administratorId: null });

    // Create Firebase listener at top level (composable rule)
    const messagesListener = useFirebaseListener((onSnapshot, onError) => {
      const { collaboratorId, administratorId } = messageQueryParams.value;

      if (collaboratorId) {
        const messageQuery = query(
          messageCollection,
          where('collaboratorId', '==', collaboratorId),
          where('active', '==', true),
          where('read', '==', false),
          orderBy('createdAt', 'asc')
        );
        return firestoreOnSnapshot(messageQuery, onSnapshot, onError);
      } else if (administratorId) {
        const messageQuery = query(
          messageCollection,
          where('administratorId', '==', administratorId),
          where('active', '==', true),
          where('read', '==', false),
          orderBy('createdAt', 'asc')
        );
        return firestoreOnSnapshot(messageQuery, onSnapshot, onError);
      }

      // Return no-op unsubscribe if no query
      return () => {};
    });

    const state = reactive({
      userName: '',
      currentUserType: '',
      currentUser: {},
      currentBusiness: {},
      messages: [],
    });

    // Watch for changes in messages data and update state
    watch(
      () => messagesListener.data.value,
      newMessages => {
        state.messages = newMessages || [];
        loading.value = false;
      },
      { immediate: true }
    );

    const getUser = store => {
      state.userName = undefined;
      state.currentUserType = undefined;
      state.currentUser = store.getCurrentUser;
      if (state.currentUser !== undefined && state.currentUser !== null) {
        state.userName = state.currentUser.alias || state.currentUser.name;
      }
      state.currentUserType = store.getCurrentUserType;
      state.currentBusiness = store.getCurrentBusiness;
      getMessages();
    };

    onBeforeMount(() => {
      store = globalStore();
      getUser(store);
    });

    const getMessages = () => {
      loading.value = true;

      // Stop existing listener
      messagesListener.stop();

      // Update query parameters based on user type
      if (
        state.currentUserType === USER_TYPES.BUSINESS &&
        state.currentUser &&
        state.currentUser.id
      ) {
        messageQueryParams.value = {
          collaboratorId: null,
          administratorId: state.currentUser.id,
        };
        messagesListener.start();
      } else if (
        state.currentUserType === USER_TYPES.COLLABORATOR &&
        state.currentUser &&
        state.currentUser.id
      ) {
        messageQueryParams.value = {
          collaboratorId: state.currentUser.id,
          administratorId: null,
        };
        messagesListener.start();
      } else {
        messageQueryParams.value = {
          collaboratorId: null,
          administratorId: null,
        };
        state.messages = [];
        loading.value = false;
      }
    };

    const loginInvited = async () => {
      const environment = import.meta.env.VITE_NODE_ENV || ENVIRONMENTS.LOCAL;
      const currentUser = store.getCurrentUser;
      const currentUserType = store.getCurrentUserType;
      if (environment !== ENVIRONMENTS.LOCAL && (!currentUserType || !currentUser)) {
        await signOut(undefined, currentUserType);
        await store.resetSession();
        const user = await signInInvited();
        store.setCurrentUser(user);
        store.setCurrentUserType(USER_TYPES.INVITED);
      }
    };

    const scrolled = ref(false);

    const handleScroll = () => {
      scrolled.value = window.scrollY > 20;
    };

    const updateMainContentPadding = () => {
      // Dynamically update padding based on actual header height
      const header = document.querySelector('.modern-nav');
      const mainContent = document.querySelector('.main-content-wrapper');
      if (header) {
        const headerHeight = header.offsetHeight;
        // Add extra padding (25px) to ensure content is never covered
        const paddingValue = `${headerHeight + 25}px`;
        // Set CSS variable for use in CSS
        document.documentElement.style.setProperty('--header-height', paddingValue);
        // Also set directly on main content wrapper with !important equivalent
        if (mainContent) {
          mainContent.style.setProperty('padding-top', paddingValue, 'important');
        }
      }
    };

    onMounted(() => {
      window.addEventListener('scroll', handleScroll);
      handleScroll();

      // Update padding when header size changes
      updateMainContentPadding();

      // Use ResizeObserver to watch for header height changes
      const header = document.querySelector('.modern-nav');
      if (header && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
          updateMainContentPadding();
        });
        resizeObserver.observe(header);

        // Also listen to window resize
        window.addEventListener('resize', updateMainContentPadding);
      } else {
        // Fallback: just update on resize
        window.addEventListener('resize', updateMainContentPadding);
      }

      // Initial update after a small delay to ensure DOM is ready
      setTimeout(updateMainContentPadding, 100);
      setTimeout(updateMainContentPadding, 300);
      setTimeout(updateMainContentPadding, 500);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMainContentPadding);
    });

    const logout = async () => {
      try {
        loading.value = true;
        const currentUser = store.getCurrentUser;
        const currentUserType = store.getCurrentUserType;
        await signOut(currentUser.email, currentUserType);
        await store.resetSession();
        let path = '/';
        if (currentUserType === USER_TYPES.BUSINESS) {
          path = '/publico/negocio/login';
        } else if (currentUserType === USER_TYPES.COLLABORATOR) {
          path = '/publico/colaborador/login';
        } else if (currentUserType === USER_TYPES.MASTER) {
          path = '/publico/master/login';
        }
        messagesListener.stop();
        loading.value = false;
        router.push({ path, replace: true }).then(() => {
          router.go();
        });
      } catch (error) {
        loading.value = false;
      }
    };

    const buildMessageFirstPasswordChange = () => {
      if (state.currentUser && !state.currentUser.firstPasswordChanged) {
        const message = {
          id: 'first-password-change',
          title: t('myUser.message.2.title'),
          content: t('myUser.message.2.content'),
          icon: t('myUser.message.2.icon'),
          active: state.currentUser.firstPasswordChanged,
          createdAt: new Date(),
          read: !state.currentUser.firstPasswordChanged,
          type: 'SYSTEM',
        };
        const messageCodes = state.messages.map(message => message.id);
        if (state.messages && !messageCodes.includes(message.id)) {
          state.messages.push(message);
        }
      }
    };

    const buildMessageWhatsappStatus = async () => {
      if (
        state.currentBusiness &&
        state.currentBusiness.whatsappConnection &&
        state.currentBusiness.whatsappConnection.idConnection &&
        state.currentBusiness.whatsappConnection.connected === false
      ) {
        const message = {
          id: 'whatsapp-disconnected',
          title: t('myUser.message.3.title'),
          content: t('myUser.message.3.content'),
          icon: t('myUser.message.3.icon'),
          active: state.currentBusiness.whatsappConnection.connected,
          createdAt: new Date(),
          read: !state.currentBusiness.whatsappConnection.connected,
          type: 'SYSTEM',
        };
        const messageCodes = state.messages.map(message => message.id);
        if (state.messages && !messageCodes.includes(message.id)) {
          state.messages.push(message);
        }
      }
    };

    const changeData = computed(() => {
      const { messages } = state;
      return {
        messages,
      };
    });

    watch(
      () => store,
      async (newStore, oldStore) => {
        await getUser(newStore);
      },
      { immediate: true, deep: true }
    );

    watch(changeData, async () => {
      buildMessageFirstPasswordChange();
      buildMessageWhatsappStatus();
    });

    // Close mobile menu on route change
    watch(
      () => router.currentRoute.value.path,
      () => {
        mobileMenuOpen.value = false;
      }
    );

    const mobileMenuOpen = ref(false);

    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value;
    };

    const closeMobileMenu = () => {
      mobileMenuOpen.value = false;
    };

    return {
      state,
      store,
      loading,
      scrolled,
      getDateAndHour,
      logout,
      loginInvited,
      getUser,
      USER_TYPES, // Expose for template use
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
    };
  },
};
</script>

<template>
  <div>
    <div class="header-wrapper">
      <nav class="navbar navbar-expand-lg fixed-top navbar-light modern-nav" :class="{ 'scrolled': scrolled }">
        <div class="container-fluid nav-container">
          <div class="navbar-brand-wrapper">
            <a class="navbar-brand" href="/">
              <img :src="$t('hubLogoBlanco')" alt="Hub" class="logo">
            </a>
            <LocaleSelector class="d-none d-lg-block"></LocaleSelector>
          </div>

          <!-- Desktop User Section -->
          <div v-if="!loading" class="navbar-user-section d-none d-lg-flex">
            <div
              v-if="
                state.currentUser &&
                state.currentUser.name !== 'invitado' &&
                (state.currentUserType === USER_TYPES.COLLABORATOR ||
                  state.currentUserType === USER_TYPES.BUSINESS ||
                  state.currentUserType === USER_TYPES.MASTER)
              "
              class="user-info"
            >
              <a class="user-name-link" data-bs-toggle="modal" :data-bs-target="`#userModal`">
                <span class="fw-bold">
                  <i class="bi bi-person-circle"></i> {{ state.userName }}
                </span>
                <span
                  v-if="state.messages.length > 0"
                  class="message-indicator badge bg-danger rounded-pill px-2 py-1 mx-1"
                >
                  <i class="bi bi-envelope-fill"></i> {{ state.messages.length || 0 }}
                </span>
              </a>
              <button class="logout-btn btn btn-light rounded-pill" @click="logout()">
                {{ $t('logout') }} <i class="bi bi-box-arrow-right"></i>
              </button>
            </div>
          </div>
          <div v-else class="navbar-user-section d-none d-lg-flex">
            <Spinner :show="!loading" :ligth="true"></Spinner>
          </div>

          <!-- Mobile Menu Button -->
          <button
            v-if="!loading"
            class="mobile-menu-toggle d-lg-none"
            @click="toggleMobileMenu"
            :aria-expanded="mobileMenuOpen"
            aria-label="Toggle navigation"
          >
            <span class="hamburger-icon" :class="{ 'active': mobileMenuOpen }">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          <div v-else class="d-lg-none">
            <Spinner :show="!loading" :ligth="true"></Spinner>
          </div>
        </div>
      </nav>

      <!-- Mobile Off-Canvas Menu -->
      <div class="mobile-menu-overlay" :class="{ 'active': mobileMenuOpen }" @click="closeMobileMenu"></div>
      <div class="mobile-menu d-lg-none" :class="{ 'active': mobileMenuOpen }">
        <div class="mobile-menu-header">
          <h5 class="mobile-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{ state.userName || $t('menu') }}
          </h5>
          <button class="mobile-menu-close" @click="closeMobileMenu" aria-label="Close menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="mobile-menu-body">
          <div class="mobile-menu-item-wrapper">
            <LocaleSelector class="mobile-locale-selector"></LocaleSelector>
          </div>
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="mobile-menu-item-wrapper"
          >
              <a
                class="mobile-menu-item"
                data-bs-toggle="modal"
                :data-bs-target="`#userModal`"
                @click="closeMobileMenu"
                data-bs-dismiss="offcanvas"
              >
              <i class="bi bi-person-circle"></i>
              <span>{{ state.userName }}</span>
              <span
                v-if="state.messages.length > 0"
                class="message-indicator badge bg-danger rounded-pill ms-auto"
              >
                {{ state.messages.length || 0 }}
              </span>
            </a>
            <button class="mobile-menu-item logout-item" @click="logout(); closeMobileMenu();">
              <i class="bi bi-box-arrow-right"></i>
              <span>{{ $t('logout') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal User -->
    <div
      class="modal fade"
      id="userModal"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-circle"></i> {{ $t('myUser.title') }}
            </h5>
            <button
              id="close-modal"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center pb-3">
            <MyUser :messages="state.messages"> </MyUser>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-wrapper {
  margin-bottom: 0 !important;
}

.header-wrapper > nav,
.header-wrapper nav,
.header-wrapper .navbar,
.header-wrapper .modern-nav {
  margin-bottom: 0 !important;
}

.modern-nav {
  background: rgba(31, 63, 146, 0.98);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  padding: 0.75rem 1rem;
  min-height: 70px;
  height: auto;
  display: flex;
  align-items: center;
  margin-bottom: 0 !important;
  z-index: 1030;
  width: 100%;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.modern-nav.scrolled {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  background: rgba(31, 63, 146, 0.99);
}

.navbar-brand-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

.logo {
  height: 45px;
  width: auto;
  max-width: 150px;
  object-fit: contain;
  transition: transform 0.2s;
}

.logo:hover {
  transform: scale(1.05);
}

.navbar-user-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  min-width: 0;
  justify-content: flex-end;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name-link {
  color: var(--color-background);
  text-decoration: none;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.2s;
}

.user-name-link:hover {
  opacity: 0.9;
  color: var(--color-background);
}

.user-name-link i {
  font-size: 1.2rem;
}

.message-indicator {
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.logout-btn {
  color: var(--azul-hub);
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  border: none;
  font-weight: 600;
  transition: all 0.2s;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.user-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.user-subtitle {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Large screens - ensure proper spacing */
@media (min-width: 992px) {
  .nav-container {
    flex-wrap: nowrap;
  }
}

/* Tablet and medium screens */
@media (max-width: 991px) {
  .modern-nav {
    min-height: 70px;
    padding: 0.65rem 0.85rem;
  }

  .nav-container {
    flex-wrap: nowrap;
    gap: 1rem;
    justify-content: space-between;
  }

  .navbar-brand-wrapper {
    flex: 1 1 auto;
    gap: 0.75rem;
    justify-content: flex-start;
    min-width: 0;
  }

  .logo {
    height: 35px;
    max-width: 120px;
  }
}

/* Small tablets and large phones */
@media (max-width: 768px) {
  .modern-nav {
    min-height: 65px;
    padding: 0.6rem 0.8rem;
  }

  .nav-container {
    gap: 0.75rem;
  }

  .navbar-brand-wrapper {
    gap: 0.5rem;
  }

  .logo {
    height: 32px;
    max-width: 110px;
  }
}

/* Mobile phones */
@media (max-width: 576px) {
  .modern-nav {
    padding: 0.5rem 0.75rem;
    min-height: 60px;
  }

  .nav-container {
    gap: 0.5rem;
  }

  .navbar-brand-wrapper {
    gap: 0.4rem;
  }

  .logo {
    height: 30px;
    max-width: 100px;
  }
}

/* Extra small phones */
@media (max-width: 400px) {
  .modern-nav {
    padding: 0.4rem 0.6rem;
    min-height: 60px;
  }

  .nav-container {
    gap: 0.3rem;
  }

  .navbar-brand-wrapper {
    gap: 0.3rem;
  }

  .logo {
    height: 28px;
    max-width: 90px;
  }
}

/* Mobile Menu Styles */
.mobile-menu-toggle {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1040;
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 24px;
  height: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hamburger-icon span {
  width: 100%;
  height: 3px;
  background-color: var(--color-background);
  border-radius: 3px;
  transition: all 0.3s ease;
  transform-origin: center;
}

.hamburger-icon.active span:nth-child(1) {
  transform: rotate(45deg) translate(7px, 7px);
}

.hamburger-icon.active span:nth-child(2) {
  opacity: 0;
  transform: translateX(-10px);
}

.hamburger-icon.active span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -7px);
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1035;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.mobile-menu-overlay.active {
  opacity: 1;
  visibility: visible;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: -100%;
  width: 85%;
  max-width: 320px;
  height: 100%;
  background-color: var(--color-background);
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1040;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.mobile-menu.active {
  right: 0;
}

.mobile-menu-header {
  background: linear-gradient(135deg, var(--azul-hub, #1f3f92) 0%, rgba(31, 63, 146, 0.95) 100%);
  color: var(--color-background);
  padding: 1.25rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.mobile-menu-close {
  background: none;
  border: none;
  color: var(--color-background);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.mobile-menu-close:hover {
  transform: rotate(90deg);
}

.mobile-menu-body {
  flex: 1;
  padding: 1rem 0;
}

.mobile-menu-item-wrapper {
  border-bottom: 1px solid var(--gris-default, #e0e0e0);
  padding: 0.75rem 0;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  color: var(--color-text, #333);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.mobile-menu-item:hover,
.mobile-menu-item:focus {
  background-color: var(--gris-clear, #f5f5f5);
  color: var(--azul-hub, #1f3f92);
}

.mobile-menu-item i {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  width: 24px;
  text-align: center;
}

.mobile-menu-item.logout-item {
  color: var(--rojo-warning, #dc3545);
}

.mobile-menu-item.logout-item:hover {
  background-color: rgba(220, 53, 69, 0.1);
  color: var(--rojo-warning, #dc3545);
}

.mobile-locale-selector {
  padding: 0 1.25rem;
  width: 100%;
}

.mobile-locale-selector select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 1rem;
  background-color: var(--color-background);
}

@media (max-width: 400px) {
  .mobile-menu {
    width: 90%;
  }
}
</style>
