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
      currentCommerce: {},
      messages: [],
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
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
      state.currentCommerce = store.getCurrentCommerce;
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

      // Fix aria-hidden accessibility issue: blur focused elements when modal is hidden
      const userModal = document.getElementById('userModal');
      if (userModal) {
        const handleModalHidden = () => {
          // Blur any focused elements inside the modal to prevent aria-hidden warning
          const focusedElement = userModal.querySelector(':focus');
          if (focusedElement && focusedElement instanceof HTMLElement) {
            focusedElement.blur();
          }
        };
        userModal.addEventListener('hidden.bs.modal', handleModalHidden);
        // Store handler for cleanup
        userModal._modalHiddenHandler = handleModalHidden;
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMainContentPadding);

      // Clean up modal event listener
      const userModal = document.getElementById('userModal');
      if (userModal && userModal._modalHiddenHandler) {
        userModal.removeEventListener('hidden.bs.modal', userModal._modalHiddenHandler);
        delete userModal._modalHiddenHandler;
      }
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
    const desktopMenuOpen = ref(false);

    const toggleMobileMenu = () => {
      mobileMenuOpen.value = !mobileMenuOpen.value;
    };

    const closeMobileMenu = () => {
      mobileMenuOpen.value = false;
    };

    const toggleDesktopMenu = () => {
      desktopMenuOpen.value = !desktopMenuOpen.value;
    };

    const closeDesktopMenu = () => {
      desktopMenuOpen.value = false;
    };

    // Get menu options based on user type - matching exact structure from BusinessMenu, CollaboratorMenu, MasterMenu
    const getMenuOptions = () => {
      const userType = state.currentUserType;
      if (userType === USER_TYPES.BUSINESS) {
        return [
          'dashboard',
          'reports',
          'booking-manage',
          'control-admin',
          'manage-admin',
          'configuration',
          'documents',
          'your-plan',
          'business-resume',
        ];
      } else if (userType === USER_TYPES.COLLABORATOR) {
        return ['queue-manage', 'booking-manage', 'tracing', 'product-stock', 'dashboard'];
      } else if (userType === USER_TYPES.MASTER) {
        return [
          'business-master-admin',
          'plans-master-admin',
          'features-master-admin',
          'plan-activations-admin',
        ];
      }
      return [];
    };

    // Get submenu options for business
    const getManageSubMenuOptions = () => {
      if (state.currentUserType === USER_TYPES.BUSINESS) {
        return [
          'commerce-admin',
          'service-admin',
          'modules-admin',
          'queues-admin',
          'collaborators-admin',
          'surveys-admin',
          'product-admin',
          'outcome-types-admin',
          'company-admin',
          'forms-admin',
          'patient-history-item-admin',
          'permissions-admin',
        ];
      }
      return [];
    };

    const getControlSubMenuOptions = () => {
      if (state.currentUserType === USER_TYPES.BUSINESS) {
        return ['tracing', 'product-stock', 'financial'];
      }
      return [];
    };

    // Navigate to menu option - matching exact logic from BusinessMenu.goToOption
    const navigateToMenuOption = async (option, closeMenu = true) => {
      try {
        if (!option) return;

        const userType = state.currentUserType;

        if (userType === USER_TYPES.BUSINESS) {
          if (option === 'manage-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
            // Don't close menu when toggling submenu
            return;
          } else if (option === 'control-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
            // Don't close menu when toggling submenu
            return;
          } else {
            router.push({ path: `/interno/negocio/${option}` });
          }
        } else if (userType === USER_TYPES.COLLABORATOR) {
          const commerceId = state.currentCommerce?.id || state.currentUser?.commerceId || '';
          if (option === 'queue-manage') {
            router.push({ path: `/interno/commerce/${commerceId}/colaborador/filas` });
          } else if (option === 'booking-manage') {
            router.push({ path: `/interno/commerce/${commerceId}/colaborador/bookings` });
          } else if (option === 'dashboard') {
            router.push({ path: '/interno/colaborador/dashboard' });
          } else if (option === 'tracing') {
            router.push({ path: '/interno/colaborador/tracing' });
          } else if (option === 'product-stock') {
            router.push({ path: '/interno/colaborador/product-stock' });
          }
        } else if (userType === USER_TYPES.MASTER) {
          router.push({ path: `/interno/master/${option}` });
        }

        // Only close menus if we actually navigated (not just toggled submenu)
        if (closeMenu) {
          closeMobileMenu();
          closeDesktopMenu();
        }
      } catch (error) {
        console.error('Error navigating to menu option:', error);
      }
    };

    const getMenuTranslationKey = () => {
      const userType = state.currentUserType;
      if (userType === USER_TYPES.BUSINESS) {
        return 'businessMenu';
      } else if (userType === USER_TYPES.COLLABORATOR) {
        return 'collaboratorMenu';
      } else if (userType === USER_TYPES.MASTER) {
        return 'masterMenu';
      }
      return '';
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
      desktopMenuOpen,
      toggleDesktopMenu,
      closeDesktopMenu,
      getMenuOptions,
      navigateToMenuOption,
      getMenuTranslationKey,
      getManageSubMenuOptions,
      getControlSubMenuOptions,
    };
  },
};
</script>

<template>
  <div>
    <div class="header-wrapper">
      <nav
        class="navbar navbar-expand-lg fixed-top navbar-light modern-nav"
        :class="{ scrolled: scrolled }"
      >
        <div class="container-fluid nav-container">
          <div class="navbar-brand-wrapper">
            <a class="navbar-brand" href="/">
              <img :src="$t('hubLogoBlanco')" alt="Hub" class="logo" />
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
                <span class="fw-bold user-name-display">
                  <i class="bi bi-person-circle"></i> {{ state.userName }}
                </span>
                <span
                  v-if="state.messages.length > 0"
                  class="message-indicator badge bg-danger rounded-pill px-2 py-1 mx-1"
                >
                  <i class="bi bi-envelope-fill"></i> {{ state.messages.length || 0 }}
                </span>
              </a>
              <button
                class="user-menu-trigger-icon"
                @click="toggleDesktopMenu"
                :class="{ active: desktopMenuOpen }"
                aria-label="Toggle menu"
                :title="desktopMenuOpen ? $t('close') : $t('menu')"
              >
                <i class="bi bi-list user-menu-icon" :class="{ rotated: desktopMenuOpen }"></i>
                <span class="menu-label">{{
                  desktopMenuOpen ? $t('close') || 'Cerrar' : $t('menu') || 'Menú'
                }}</span>
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
            <span class="hamburger-icon" :class="{ active: mobileMenuOpen }">
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

      <!-- Desktop Side Menu Overlay -->
      <div
        class="desktop-menu-overlay d-none d-lg-block"
        :class="{ active: desktopMenuOpen }"
        @click="closeDesktopMenu"
      ></div>

      <!-- Desktop Side Menu -->
      <div class="desktop-side-menu d-none d-lg-block" :class="{ active: desktopMenuOpen }">
        <div class="desktop-menu-header">
          <h5 class="desktop-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{ state.userName || $t('menu') }}
          </h5>
          <button class="desktop-menu-close" @click="closeDesktopMenu" aria-label="Close menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="desktop-menu-body">
          <!-- Idioma Section -->
          <div class="desktop-menu-item-wrapper">
            <div class="desktop-menu-label">
              <span>{{ $t('language') || 'Idioma' }}</span>
            </div>
            <LocaleSelector class="desktop-locale-selector"></LocaleSelector>
          </div>

          <!-- Mi Perfil Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="desktop-menu-item-wrapper"
          >
            <a
              class="desktop-menu-item"
              data-bs-toggle="modal"
              :data-bs-target="`#userModal`"
              @click="closeDesktopMenu"
              data-bs-dismiss="offcanvas"
            >
              <i class="bi bi-person-circle"></i>
              <span>{{ $t('myUser.title') || 'Mi Perfil' }}</span>
              <span
                v-if="state.messages.length > 0"
                class="message-indicator badge bg-danger rounded-pill ms-auto"
              >
                {{ state.messages.length || 0 }}
              </span>
            </a>
          </div>

          <!-- Menu Options Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="desktop-menu-item-wrapper"
          >
            <div class="choose-attention my-3 mt-4">
              <span>{{ $t(`${getMenuTranslationKey()}.choose`) || 'Menu' }}</span>
            </div>
            <div class="row">
              <div
                v-for="option in getMenuOptions()"
                :key="option"
                class="d-grid btn-group btn-group-justified desktop-button-wrapper"
              >
                <div class="centered">
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style desktop-menu-btn"
                    @click="navigateToMenuOption(option, true)"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i
                      v-if="option === 'manage-admin'"
                      :class="`bi ${
                        state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'control-admin'"
                      :class="`bi ${
                        state.manageControlSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                  </button>
                  <!-- Manage Admin Submenu -->
                  <div
                    v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                    class="desktop-submenu-container"
                  >
                    <div
                      v-for="subOption in getManageSubMenuOptions()"
                      :key="subOption"
                      class="desktop-submenu-item"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style desktop-menu-btn desktop-submenu-btn"
                        @click="
                          navigateToMenuOption(subOption);
                          closeDesktopMenu();
                        "
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <!-- Control Admin Submenu -->
                  <div
                    v-if="option === 'control-admin' && state.manageControlSubMenuOption === true"
                    class="desktop-submenu-container"
                  >
                    <div
                      v-for="subOption in getControlSubMenuOptions()"
                      :key="subOption"
                      class="desktop-submenu-item"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style desktop-menu-btn desktop-submenu-btn"
                        @click="
                          navigateToMenuOption(subOption);
                          closeDesktopMenu();
                        "
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Logout Section (at the end) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="desktop-menu-item-wrapper logout-wrapper"
          >
            <button
              class="desktop-menu-item logout-item"
              @click="
                logout();
                closeDesktopMenu();
              "
            >
              <i class="bi bi-box-arrow-right"></i>
              <span>{{ $t('logout') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Off-Canvas Menu -->
      <div
        class="mobile-menu-overlay"
        :class="{ active: mobileMenuOpen }"
        @click="closeMobileMenu"
      ></div>
      <div class="mobile-menu d-lg-none" :class="{ active: mobileMenuOpen }">
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
          <!-- Idioma Section -->
          <div class="mobile-menu-item-wrapper">
            <div class="mobile-menu-label">
              <span>{{ $t('language') || 'Idioma' }}</span>
            </div>
            <LocaleSelector class="mobile-locale-selector"></LocaleSelector>
          </div>

          <!-- Mi Perfil Section -->
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
              <span>{{ $t('myUser.title') || 'Mi Perfil' }}</span>
              <span
                v-if="state.messages.length > 0"
                class="message-indicator badge bg-danger rounded-pill ms-auto"
              >
                {{ state.messages.length || 0 }}
              </span>
            </a>
          </div>

          <!-- Menu Options Section -->
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
            <div class="choose-attention my-3 mt-4">
              <span>{{ $t(`${getMenuTranslationKey()}.choose`) || 'Menu' }}</span>
            </div>
            <div class="row">
              <div
                v-for="option in getMenuOptions()"
                :key="option"
                class="d-grid btn-group btn-group-justified mobile-button-wrapper"
              >
                <div>
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-1 btn-style mobile-menu-btn"
                    @click="navigateToMenuOption(option)"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i
                      v-if="option === 'manage-admin'"
                      :class="`bi ${
                        state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'control-admin'"
                      :class="`bi ${
                        state.manageControlSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                  </button>
                  <!-- Manage Admin Submenu -->
                  <div
                    v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                    class="mobile-submenu-container"
                  >
                    <div
                      v-for="subOption in getManageSubMenuOptions()"
                      :key="subOption"
                      class="mobile-submenu-item"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-0 mb-1 btn-style mobile-menu-btn mobile-submenu-btn"
                        @click="navigateToMenuOption(subOption)"
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <!-- Control Admin Submenu -->
                  <div
                    v-if="option === 'control-admin' && state.manageControlSubMenuOption === true"
                    class="mobile-submenu-container"
                  >
                    <div
                      v-for="subOption in getControlSubMenuOptions()"
                      :key="subOption"
                      class="mobile-submenu-item"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-0 mb-1 btn-style mobile-menu-btn mobile-submenu-btn"
                        @click="navigateToMenuOption(subOption)"
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Logout Section (at the end) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="mobile-menu-item-wrapper logout-wrapper"
          >
            <button
              class="mobile-menu-item logout-item"
              @click="
                logout();
                closeMobileMenu();
              "
            >
              <i class="bi bi-box-arrow-right"></i>
              <span>{{ $t('logout') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal User - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
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
    </Teleport>
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
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.user-name-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  color: var(--color-background);
}

.user-name-link i {
  font-size: 1.2rem;
}

/* Desktop Menu Trigger Icon */
.user-menu-trigger-icon {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 0.5rem;
  position: relative;
  overflow: hidden;
  height: fit-content;
}

.user-menu-trigger-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.user-menu-trigger-icon:hover::before {
  width: 100px;
  height: 100px;
}

.user-menu-trigger-icon:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.user-menu-trigger-icon:active {
  transform: translateY(0);
}

.user-menu-trigger-icon.active {
  background-color: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  animation: menuPulse 2s ease-in-out infinite;
}

.user-name-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-menu-icon {
  font-size: 1.2rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.user-menu-icon.rotated {
  transform: rotate(90deg);
}

.menu-label {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  position: relative;
  z-index: 1;
  transition: opacity 0.2s ease;
}

@keyframes menuPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 255, 255, 0);
  }
}

.message-indicator {
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
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
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-title {
  margin: 0;
  font-size: 1rem;
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
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.mobile-menu-item-wrapper {
  border-bottom: 1px solid var(--gris-default, #e0e0e0);
  padding: 0.4rem 0;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 1rem;
  color: var(--color-text, #333);
  text-decoration: none;
  font-size: 0.95rem;
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

.mobile-menu-label {
  padding: 0.3rem 1rem 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--azul-hub, #1f3f92);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mobile-locale-selector {
  padding: 0 1rem 0.3rem;
  width: 100%;
}

.mobile-locale-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

/* Mobile menu button styles - matching BusinessMenu standard */
.choose-attention {
  padding-bottom: 0.25rem;
  font-size: 0.85rem;
  line-height: 1rem;
  font-weight: 700;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
  text-align: center;
}

.btn-style {
  line-height: 1rem;
  padding: 0.65rem 0rem;
}

.btn-light {
  --bs-btn-bg: #dcddde !important;
}

/* Mobile menu button responsive adjustments - matching BusinessMenu */
@media (max-width: 991px) {
  .mobile-button-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin-bottom: 0.5rem;
  }

  .mobile-button-wrapper > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .mobile-menu-btn.col-8 {
    flex: 0 0 auto;
    width: 66.666667%;
    margin-left: auto;
    margin-right: auto;
  }

  /* Mobile submenu styles */
  .mobile-submenu-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.4rem;
    margin-bottom: 0.4rem;
  }

  .mobile-submenu-item {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .mobile-submenu-btn {
    width: 66.666667%;
    margin-left: auto;
    margin-right: auto;
  }
}

.logout-wrapper {
  margin-top: auto;
  border-top: 2px solid var(--gris-default, #e0e0e0);
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  position: sticky;
  bottom: 0;
  background-color: var(--color-background);
}

@media (max-width: 400px) {
  .mobile-menu {
    width: 90%;
  }
}

/* Desktop Side Menu Styles */
.desktop-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1035;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.desktop-menu-overlay.active {
  opacity: 1;
  visibility: visible;
}

.desktop-side-menu {
  position: fixed;
  top: 0;
  right: -400px;
  width: 380px;
  max-width: 90vw;
  height: 100vh;
  background-color: var(--color-background);
  box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1040;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.desktop-side-menu.active {
  right: 0;
}

.desktop-menu-header {
  background: linear-gradient(135deg, var(--azul-hub, #1f3f92) 0%, rgba(31, 63, 146, 0.95) 100%);
  color: var(--color-background);
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.desktop-menu-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.desktop-menu-close {
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
  border-radius: 0.25rem;
}

.desktop-menu-close:hover {
  transform: rotate(90deg);
  background-color: rgba(255, 255, 255, 0.1);
}

.desktop-menu-body {
  flex: 1;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.desktop-menu-item-wrapper {
  border-bottom: 1px solid var(--gris-default, #e0e0e0);
  padding: 0.4rem 0;
}

.desktop-menu-item {
  display: flex;
  align-items: center;
  padding: 0.6rem 1rem;
  color: var(--color-text, #333);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background-color 0.2s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.desktop-menu-item:hover,
.desktop-menu-item:focus {
  background-color: var(--gris-clear, #f5f5f5);
  color: var(--azul-hub, #1f3f92);
}

.desktop-menu-item i {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  width: 24px;
  text-align: center;
}

.desktop-menu-item.logout-item {
  color: var(--rojo-warning, #dc3545);
}

.desktop-menu-item.logout-item:hover {
  background-color: rgba(220, 53, 69, 0.1);
  color: var(--rojo-warning, #dc3545);
}

.desktop-menu-label {
  padding: 0.3rem 1rem 0.15rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--azul-hub, #1f3f92);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.desktop-locale-selector {
  padding: 0 1rem 0.3rem;
  width: 100%;
}

.desktop-locale-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

.desktop-button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.desktop-button-wrapper > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.desktop-menu-btn.col-8 {
  flex: 0 0 auto;
  width: 66.666667%;
  margin-left: auto;
  margin-right: auto;
}

.desktop-submenu-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.desktop-submenu-item {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.desktop-submenu-btn {
  width: 66.666667%;
  margin-left: auto;
  margin-right: auto;
}

.desktop-menu-item-wrapper.logout-wrapper {
  margin-top: auto;
  border-top: 2px solid var(--gris-default, #e0e0e0);
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  position: sticky;
  bottom: 0;
  background-color: var(--color-background);
}

/* Desktop menu responsive adjustments */
@media (min-width: 992px) {
  .desktop-side-menu {
    width: 400px;
  }
}
</style>
