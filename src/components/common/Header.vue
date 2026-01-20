<script>
import {
  ref,
  reactive,
  onBeforeMount,
  watch,
  computed,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import { signOut, signInInvited } from '../../application/services/auth';
import { getDateAndHour } from '../../shared/utils/date';
import { messageCollection } from '../../application/firebase';
import { query, where, orderBy, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import { useI18n } from 'vue-i18n';
import { useFirebaseListener } from '../../composables/useFirebaseListener';
import { usePermissions } from '../../composables/usePermissions';
import { useMessageInbox } from '../../composables/useMessageInbox';
import { useChatConversations } from '@/composables/useChatConversations';
import { USER_TYPES, ENVIRONMENTS } from '../../shared/constants';
import { getPermissions } from '../../application/services/permissions';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import LocaleSelector from './LocaleSelector.vue';
import CommerceSelector from './CommerceSelector.vue';
import ModuleSelector from './ModuleSelector.vue';
import Spinner from '../../components/common/Spinner.vue';
import MyUser from '../domain/MyUser.vue';
import MessageNotificationBadge from '../messages/MessageNotificationBadge.vue';
import ChatNotificationBadge from '../messages/ChatNotificationBadge.vue';
import MessageInbox from '../messages/MessageInbox.vue';
import ChatInbox from '../messages/ChatInbox.vue';
import ProfessionalProfileModal from '../professional/ProfessionalProfileModal.vue';

export default {
  components: {
    LocaleSelector,
    CommerceSelector,
    ModuleSelector,
    Spinner,
    MyUser,
    MessageNotificationBadge,
    ChatNotificationBadge,
    MessageInbox,
    ChatInbox,
    ProfessionalProfileModal,
  },
  name: 'Header',
  async setup() {
    const router = useRouter();
    const { t } = useI18n();
    let store = globalStore();

    const loading = ref(false);

    // Professional Profile Modal state
    const isProfessionalModalOpen = ref(false);

    // Initialize permissions composable
    const {
      loadPermissions,
      canAccessInbox,
      canAccessMessageComponents,
      canAccessChatComponents,
      permissionsLoaded,
      canSendMessages,
      canStartChats,
      canSendMassMessages
    } = usePermissions();

    // Initialize message inbox for real-time count
    const { unreadCount: menuUnreadCount } = useMessageInbox();

    // Inicializar chat global para badge de header
    const { startConversationsListener } = useChatConversations();
    const chatListenerStarted = ref(false);

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
      currentModule: {},
      messages: [],
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      medicalManagementSubMenuOption: false,
      toggles: {},
      clientPortalPermissions: {},
    });

    // Computed properties to determine if selectors should be shown (based on store state)
    // This avoids the chicken-and-egg problem of needing refs when menu is closed
    const availableCommerces = ref([]);
    const availableModules = ref([]);

    // Flags to prevent concurrent API calls
    const loadingCommerces = ref(false);
    const loadingModules = ref(false);
    const lastCommerceId = ref(null);
    const lastBusinessId = ref(null);

    // Load available commerces for business/master users
    const loadAvailableCommerces = async () => {
      // Prevent concurrent calls
      if (loadingCommerces.value) return;

      const businessId = state.currentBusiness?.id;
      // Skip if same business and already loaded
      if (businessId === lastBusinessId.value && availableCommerces.value.length > 0) {
        return;
      }

      try {
        loadingCommerces.value = true;
        const userType = state.currentUserType;
        if (userType === USER_TYPES.BUSINESS || userType === USER_TYPES.MASTER) {
          if (state.currentBusiness && state.currentBusiness.id) {
            availableCommerces.value = await store.getAvailableCommerces(
              state.currentBusiness.commerces || []
            );
            lastBusinessId.value = state.currentBusiness.id;
          } else {
            availableCommerces.value = [];
            lastBusinessId.value = null;
          }
        } else if (userType === USER_TYPES.COLLABORATOR) {
          const user = state.currentUser;
          if (user && user.commercesId && user.commercesId.length > 0) {
            const { getCommerceById } = await import('../../application/services/commerce');
            const commercePromises = user.commercesId.map(id => getCommerceById(id));
            const commerceResults = await Promise.all(commercePromises);
            availableCommerces.value = commerceResults.filter(c => c && c.id);
            lastBusinessId.value = 'collaborator'; // Mark as loaded for collaborator
          } else {
            availableCommerces.value = [];
            lastBusinessId.value = null;
          }
        } else {
          availableCommerces.value = [];
          lastBusinessId.value = null;
        }
      } catch (error) {
        availableCommerces.value = [];
      } finally {
        loadingCommerces.value = false;
      }
    };

    // Load available modules for collaborator users
    const loadAvailableModules = async () => {
      // Prevent concurrent calls
      if (loadingModules.value) return;

      const commerceId = state.currentCommerce?.id;
      // Skip if same commerce and already loaded
      if (commerceId === lastCommerceId.value && availableModules.value.length >= 0) {
        return;
      }

      try {
        loadingModules.value = true;
        const userType = state.currentUserType;
        const currentUser = state.currentUser;

        // Only load modules if user is authenticated and is a collaborator
        if (
          userType === USER_TYPES.COLLABORATOR &&
          currentUser &&
          currentUser.id &&
          state.currentCommerce &&
          state.currentCommerce.id
        ) {
          availableModules.value = await store.getAvailableModules(state.currentCommerce.id);
          lastCommerceId.value = state.currentCommerce.id;
        } else {
          availableModules.value = [];
          lastCommerceId.value = null;
        }
      } catch (error) {
        // Silently handle 401 (Unauthorized) errors - user is not authenticated yet
        if (error.response && error.response.status === 401) {
          availableModules.value = [];
        } else {
          availableModules.value = [];
        }
      } finally {
        loadingModules.value = false;
      }
    };

    const getMessages = () => {
      // Determine new query parameters
      let newCollaboratorId = null;
      let newAdministratorId = null;

      if (
        state.currentUserType === USER_TYPES.BUSINESS &&
        state.currentUser &&
        state.currentUser.id
      ) {
        newAdministratorId = state.currentUser.id;
      } else if (
        state.currentUserType === USER_TYPES.COLLABORATOR &&
        state.currentUser &&
        state.currentUser.id
      ) {
        newCollaboratorId = state.currentUser.id;
      }

      // Only restart listener if parameters actually changed
      const paramsChanged =
        messageQueryParams.value.collaboratorId !== newCollaboratorId ||
        messageQueryParams.value.administratorId !== newAdministratorId;

      if (paramsChanged) {
        loading.value = true;
        // Stop existing listener
        messagesListener.stop();

        // Update query parameters
        messageQueryParams.value = {
          collaboratorId: newCollaboratorId,
          administratorId: newAdministratorId,
        };

        // Start listener with new parameters
        if (newCollaboratorId || newAdministratorId) {
          messagesListener.start();
        } else {
          state.messages = [];
          loading.value = false;
        }
      }
    };

    // Watch for changes in messages data and update state
    watch(
      () => messagesListener.data.value,
      newMessages => {
        state.messages = newMessages || [];
        loading.value = false;
      },
      { immediate: true }
    );

    const getUser = async store => {
      state.userName = undefined;
      state.currentUserType = undefined;
      state.currentUser = store.getCurrentUser || null;
      if (state.currentUser !== undefined && state.currentUser !== null) {
        state.userName = state.currentUser.alias || state.currentUser.name;
        // Load permissions when user is set
        await loadPermissions();
      }
      state.currentUserType = store.getCurrentUserType || null;
      const business = store.getCurrentBusiness;
      state.currentBusiness = business && business.id ? business : null;
      const commerce = store.getCurrentCommerce;
      state.currentCommerce = commerce && commerce.id ? commerce : null;
      const module = store.getCurrentModule;
      state.currentModule = module && module.id ? module : null;
      getMessages();
      // Load permissions for business users
      if (state.currentUserType === USER_TYPES.BUSINESS) {
        try {
          state.toggles = await getPermissions('business', 'main-menu');
        } catch (error) {
          state.toggles = {};
        }
      }
      // Reload available commerces and modules when user data changes
      await loadAvailableCommerces();
      await loadAvailableModules();

      // Iniciar listener global de conversaciones de chat para el badge del header
      try {
        const user = state.currentUser;
        if (user && user.id && !chatListenerStarted.value && canAccessChatComponents.value) {
          const role = user.master
            ? 'master'
            : user.businessId
            ? 'administrator'
            : 'collaborator';
          const commerceId = user.commerceId || user.commerce?.id || null;
          startConversationsListener(user.id, role, commerceId);
          chatListenerStarted.value = true;
        }
      } catch (_) {
        // no-op: si falla, simplemente no se muestra el badge de chat
      }
    };

    onBeforeMount(async () => {
      store = globalStore();
      // getUser already calls loadAvailableCommerces and loadAvailableModules
      await getUser(store);
    });

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

      // Load client photo and permissions if in client portal
      // Eliminado: permisos ahora se actualizan vía watcher y localStorage

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

    // Watch specific store properties instead of entire store (much more efficient)
    watch(
      () => store.getCurrentUser,
      async (newUser, oldUser) => {
        // Only reload if user actually changed
        if (newUser?.id !== oldUser?.id) {
          await getUser(store);
        }
      },
      { immediate: true }
    );

    watch(
      () => store.getCurrentUserType,
      async (newType, oldType) => {
        // Only reload if user type actually changed
        if (newType !== oldType) {
          await getUser(store);
        }
      },
      { immediate: true }
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

    // Watch for commerce changes and update header (optimized - no deep watch)
    watch(
      () => store.getCurrentCommerce?.id,
      async (newCommerceId, oldCommerceId) => {
        const newCommerce = store.getCurrentCommerce;
        if (newCommerce && newCommerce.id) {
          state.currentCommerce = newCommerce;
        } else {
          state.currentCommerce = null;
        }
        // Only reload if commerce ID actually changed
        if (newCommerceId !== oldCommerceId && newCommerceId !== lastCommerceId.value) {
          await loadAvailableModules();
        }
      },
      { immediate: true }
    );

    // Watch for business changes (optimized - no deep watch)
    watch(
      () => store.getCurrentBusiness?.id,
      async (newBusinessId, oldBusinessId) => {
        const newBusiness = store.getCurrentBusiness;
        if (newBusiness && newBusiness.id) {
          state.currentBusiness = newBusiness;
        } else {
          state.currentBusiness = null;
        }
        // Only reload if business ID actually changed
        if (newBusinessId !== oldBusinessId && newBusinessId !== lastBusinessId.value) {
          await loadAvailableCommerces();
        }
      },
      { immediate: true }
    );

    // Watch for route changes to reload client photo and permissions
    watch(
      () => router.currentRoute.value.path,
      (newPath) => {
        if (newPath.startsWith('/portal/') || newPath.startsWith('/public/portal/') || newPath.startsWith('/publico/portal/')) {
          // Eliminado: permisos ahora se actualizan vía watcher y localStorage
        } else {
          state.clientPortalPermissions = {};
        }
      }
    );

    // Watch for module changes (only update state, no API call needed - optimized)
    watch(
      () => store.getCurrentModule?.id,
      newModuleId => {
        const newModule = store.getCurrentModule;
        if (newModule && newModule.id) {
          state.currentModule = newModule;
        } else {
          state.currentModule = null;
        }
        // No need to reload modules when module changes - we already have them
      },
      { immediate: true }
    );

    const mobileMenuOpen = ref(false);
    const desktopMenuOpen = ref(false);
    const inboxOpen = ref(false);
    const chatInboxOpen = ref(false);

    // Template refs for CommerceSelector and ModuleSelector components
    const desktopCommerceSelectorRef = ref(null);
    const mobileCommerceSelectorRef = ref(null);
    const desktopCollaboratorCommerceSelectorRef = ref(null);
    const mobileCollaboratorCommerceSelectorRef = ref(null);
    const desktopModuleSelectorRef = ref(null);
    const mobileModuleSelectorRef = ref(null);

    // Computed properties for shouldShow (same logic as CommerceSelector and ModuleSelector)
    const shouldShowDesktopCommerceSelector = computed(() => {
      const userType = state.currentUserType;
      if (!userType || !availableCommerces.value || availableCommerces.value.length === 0)
        return false;
      // Show only when there are multiple commerces (same standard for all user types)
      if (userType === USER_TYPES.BUSINESS) {
        return availableCommerces.value.length > 1;
      }
      if (userType === USER_TYPES.MASTER) {
        return (
          state.currentBusiness && state.currentBusiness.id && availableCommerces.value.length > 1
        );
      }
      if (userType === USER_TYPES.COLLABORATOR) {
        return availableCommerces.value.length > 1;
      }
      return false;
    });

    const shouldShowMobileCommerceSelector = computed(
      () => shouldShowDesktopCommerceSelector.value
    );
    const shouldShowDesktopCollaboratorCommerceSelector = computed(
      () => shouldShowDesktopCommerceSelector.value
    );
    const shouldShowMobileCollaboratorCommerceSelector = computed(
      () => shouldShowDesktopCommerceSelector.value
    );

    const shouldShowDesktopModuleSelector = computed(() => {
      const userType = state.currentUserType;
      if (userType !== USER_TYPES.COLLABORATOR) return false;
      if (!availableModules.value || availableModules.value.length === 0) return false;
      // Show module section when there's at least one module (ModuleSelector will show name or dropdown accordingly)
      return availableModules.value.length > 0;
    });

    const shouldShowMobileModuleSelector = computed(() => shouldShowDesktopModuleSelector.value);

    // Check if current route is a client portal route
    const isClientPortalRoute = computed(() => {
      const path = router.currentRoute.value.path;
      return path.startsWith('/portal/') || path.startsWith('/public/portal/') || path.startsWith('/publico/portal/');
    });

    // Get client portal data from localStorage
    const getClientPortalData = () => {
      try {
        const clientData = localStorage.getItem('clientPortalClient');
        const commerceData = localStorage.getItem('clientPortalCommerce');
        return {
          client: clientData ? JSON.parse(clientData) : null,
          commerce: commerceData ? JSON.parse(commerceData) : null,
        };
      } catch (e) {
        return { client: null, commerce: null };
      }
    };

    // Watcher para permisos en localStorage
    const updateClientPortalPermissions = () => {
      try {
        const permissionsStr = localStorage.getItem('clientPortalPermissions');
        if (permissionsStr) {
          state.clientPortalPermissions = JSON.parse(permissionsStr);
        }
      } catch (err) {
        // Error reading from localStorage
      }
    };

    // Actualizar permisos al montar y cuando cambien en localStorage
    onMounted(() => {
      updateClientPortalPermissions();
      window.addEventListener('storage', updateClientPortalPermissions);
    });
    onBeforeUnmount(() => {
      window.removeEventListener('storage', updateClientPortalPermissions);
    });

    // Check if current route is a public commerce queue route
    const isPublicCommerceQueueRoute = () => {
      const path = router.currentRoute.value.path;
      // Hide menu for public queue routes and attention routes
      return (
        (path.startsWith('/publico/') && path.includes('/comercio/') && path.includes('/filas')) ||
        (path.startsWith('/interno/fila/') && path.includes('/atencion/')) ||
        (path.startsWith('/interno/colaborador/fila/') && path.includes('/atencion/'))
      );
    };

    // Removed duplicate watchers - using store watchers above instead

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

    const toggleInbox = () => {
      inboxOpen.value = !inboxOpen.value;
    };

    const closeInbox = () => {
      inboxOpen.value = false;
    };

    const toggleChatInbox = () => {
      chatInboxOpen.value = !chatInboxOpen.value;
    };

    const closeChatInbox = () => {
      chatInboxOpen.value = false;
    };

    const openProfessionalModal = () => {
      isProfessionalModalOpen.value = true;
    };

    const closeProfessionalModal = () => {
      isProfessionalModalOpen.value = false;
    };

    // Handle commerce change - close menus and refresh user data
    const handleCommerceChanged = async () => {
      // Close both menus
      closeMobileMenu();
      closeDesktopMenu();
      // Refresh user data to reflect commerce change
      await getUser(store);
    };

    // Handle module change - close menus and refresh user data
    const handleModuleChanged = async () => {
      // Close both menus
      closeMobileMenu();
      closeDesktopMenu();
      // Refresh user data to reflect module change
      await getUser(store);
    };

    // Get menu options based on user type - matching exact structure from BusinessMenu, CollaboratorMenu, MasterMenu
    const getMenuOptions = () => {
      // Client Portal menu options
      if (isClientPortalRoute.value) {
        const options = [];
        if (state.clientPortalPermissions['client-portal.menu.consents']) options.push('consents');
        if (state.clientPortalPermissions['client-portal.menu.telemedicine']) options.push('telemedicine');
        if (state.clientPortalPermissions['client-portal.menu.profile']) options.push('profile');
        if (state.clientPortalPermissions['client-portal.menu.documents']) options.push('documents');
        if (state.clientPortalPermissions['client-portal.menu.history']) options.push('history');
        return options;
      }

      const userType = state.currentUserType;
      if (userType === USER_TYPES.BUSINESS) {
        return [
          'dashboard',
          'reports',
          'booking-manage',
          'control-admin',
          'manage-admin',
          'medical-management',
          'configuration',
          'documents',
          'your-plan',
          'business-resume',
          'go-minisite',
          'client-portal',
        ];
      } else if (userType === USER_TYPES.COLLABORATOR) {
        return ['queue-manage', 'booking-manage', 'tracing', 'product-stock', 'dashboard', 'go-minisite', 'client-portal'];
      } else if (userType === USER_TYPES.MASTER) {
        return [
          'business-master-admin',
          'plans-master-admin',
          'features-master-admin',
          'plan-activations-admin',
          'lead-pipeline',
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
          'professionals-admin',
          'surveys-admin',
          'product-admin',
          'outcome-types-admin',
          'company-admin',
          'forms-admin',
          'lgpd-consent-admin',
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

    const getMedicalManagementSubMenuOptions = () => {
      if (state.currentUserType === USER_TYPES.BUSINESS) {
        return [
          'patient-history-item-admin',
          'medications-admin',
          'medical-exams-admin',
          'medical-templates-admin',
          'pdf-templates-admin',
          'audit-log',
        ];
      }
      return [];
    };

    const getBusinessLink = () => {
      const businessKeyName = state.currentBusiness?.keyName;
      if (!businessKeyName) return '#';
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    };

    const getClientPortalLink = () => {
      // Prioritize commerce keyName, fallback to business keyName
      const keyName = state.currentCommerce?.keyName || state.currentBusiness?.keyName;
      if (!keyName) return '#';
      return `/public/portal/${keyName}/login`;
    };

    // Navigate to menu option - matching exact logic from BusinessMenu.goToOption
    const navigateToMenuOption = async (option, closeMenu = true) => {
      try {
        if (!option) return;

        // Client Portal navigation
        if (isClientPortalRoute.value) {
          const routeParams = router.currentRoute.value.params;
          const commerceSlug = routeParams.commerceSlug;

          const routeMap = {
            'consents': 'client-portal-consents',
            'telemedicine': 'client-portal-telemedicine',
            'profile': 'client-portal-profile',
            'documents': 'client-portal-documents',
            'history': 'client-portal-history',
          };

          const routeName = routeMap[option];
          if (routeName) {
            router.push({ name: routeName, params: { commerceSlug } });
          }

          // Close menus
          if (closeMenu) {
            closeMobileMenu();
            closeDesktopMenu();
          }
          return;
        }

        const userType = state.currentUserType;

        if (userType === USER_TYPES.BUSINESS) {
          if (option === 'manage-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            // Don't close menu when toggling submenu
            return;
          } else if (option === 'control-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            // Don't close menu when toggling submenu
            return;
          } else if (option === 'medical-management') {
            state.medicalManagementSubMenuOption = !state.medicalManagementSubMenuOption;
            state.manageSubMenuOption = false;
            state.manageControlSubMenuOption = false;
            // Don't close menu when toggling submenu
            return;
          } else if (option === 'go-minisite') {
            // Special handling for go-minisite - it's a link, not a route
            window.open(getBusinessLink(), '_blank');
            // Close menus if requested
            if (closeMenu) {
              closeMobileMenu();
              closeDesktopMenu();
            }
            return;
          } else if (option === 'client-portal') {
            // Special handling for client-portal - it's a link, not a route
            window.open(getClientPortalLink(), '_blank');
            // Close menus if requested
            if (closeMenu) {
              closeMobileMenu();
              closeDesktopMenu();
            }
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
      } catch (error) {}
    };

    const getMenuTranslationKey = () => {
      // Client Portal translation key
      if (isClientPortalRoute.value) {
        return 'clientPortal.menu';
      }

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

    const logoutClientPortal = () => {
      try {
        // Safely clear localStorage
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('clientPortalSessionToken');
          localStorage.removeItem('clientPortalSessionExpiresAt');
          localStorage.removeItem('clientPortalClient');
          localStorage.removeItem('clientPortalCommerce');
        }

        // Clear store
        store.setCurrentUserType(null);
        store.setCurrentUser(null);
        store.setCurrentCommerce(null);

        // Redirect to login
        const commerceSlug = router.currentRoute.value.params.commerceSlug;
        router.push({ name: 'client-portal-login', params: { commerceSlug } });
      } catch (error) {
        // Try to redirect anyway
        const commerceSlug = router.currentRoute.value.params.commerceSlug;
        router.push({ name: 'client-portal-login', params: { commerceSlug } });
      }
    };

    return {
      state,
      store,
      loading,
      scrolled,
      getDateAndHour,
      logout,
      logoutClientPortal,
      loginInvited,
      getUser,
      USER_TYPES, // Expose for template use
      mobileMenuOpen,
      toggleMobileMenu,
      closeMobileMenu,
      desktopMenuOpen,
      toggleDesktopMenu,
      closeDesktopMenu,
      inboxOpen,
      toggleInbox,
      closeInbox,
      chatInboxOpen,
      toggleChatInbox,
      closeChatInbox,
      isProfessionalModalOpen,
      openProfessionalModal,
      closeProfessionalModal,
      getMenuOptions,
      navigateToMenuOption,
      getMenuTranslationKey,
      getManageSubMenuOptions,
      getControlSubMenuOptions,
      getMedicalManagementSubMenuOptions,
      getBusinessLink,
      getClientPortalLink,
      handleCommerceChanged,
      handleModuleChanged,
      desktopCommerceSelectorRef,
      mobileCommerceSelectorRef,
      desktopCollaboratorCommerceSelectorRef,
      mobileCollaboratorCommerceSelectorRef,
      desktopModuleSelectorRef,
      mobileModuleSelectorRef,
      shouldShowDesktopCommerceSelector,
      shouldShowMobileCommerceSelector,
      shouldShowDesktopCollaboratorCommerceSelector,
      shouldShowMobileCollaboratorCommerceSelector,
      shouldShowDesktopModuleSelector,
      shouldShowMobileModuleSelector,
      isPublicCommerceQueueRoute,
      isClientPortalRoute,
      getClientPortalData,

      // Permissions
      canAccessInbox,
      canAccessMessageComponents,
      canAccessChatComponents,
      permissionsLoaded,
      canSendMessages,
      canStartChats,
      canSendMassMessages,

      // Message count for menu
      menuUnreadCount,

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
            <a class="navbar-brand" href="#" @click.prevent>
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
                state.currentUserType !== USER_TYPES.INVITED &&
                (state.currentUserType === USER_TYPES.COLLABORATOR ||
                  state.currentUserType === USER_TYPES.BUSINESS ||
                  state.currentUserType === USER_TYPES.MASTER) &&
                !isPublicCommerceQueueRoute()
              "
              class="user-info"
            >
              <a class="user-name-link" data-bs-toggle="modal" :data-bs-target="`#userModal`">
                <span class="fw-bold user-name-display">
                  <i class="bi bi-person-circle"></i> {{ state.userName }}
                </span>
                <span
                  v-if="
                    state.currentCommerce &&
                    state.currentCommerce.tag &&
                    (state.currentUserType === USER_TYPES.BUSINESS ||
                      (state.currentUserType === USER_TYPES.MASTER && state.currentBusiness) ||
                      state.currentUserType === USER_TYPES.COLLABORATOR)
                  "
                  class="commerce-name-display"
                >
                  | {{ state.currentCommerce.tag }}
                </span>
                <span
                  v-if="
                    state.currentModule &&
                    state.currentModule.tag &&
                    state.currentUserType === USER_TYPES.COLLABORATOR
                  "
                  class="module-name-display"
                >
                  | {{ state.currentModule.tag }}
                </span>
              </a>

              <!-- Message and Chat Notification Badges -->
              <div v-if="canAccessInbox" class="notification-badges">
                <MessageNotificationBadge @toggle-inbox="toggleInbox" />
                <ChatNotificationBadge @toggle-chat-inbox="toggleChatInbox" />
              </div>

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

            <!-- Client Portal User Info -->
            <div
              v-else-if="isClientPortalRoute && !isPublicCommerceQueueRoute() && getClientPortalData().client"
              class="user-info"
            >
              <a class="user-name-link" data-bs-toggle="modal" :data-bs-target="`#userModal`">
                <span class="fw-bold user-name-display">
                  <i class="bi bi-person-circle"></i>
                  {{
                    getClientPortalData().client
                      ? `${getClientPortalData().client.name || ''} ${
                          getClientPortalData().client.lastName || ''
                        }`.trim() || 'Cliente'
                      : 'Cliente'
                  }}
                </span>
                <span
                  v-if="getClientPortalData().commerce && getClientPortalData().commerce.tag"
                  class="commerce-name-display"
                >
                  | {{ getClientPortalData().commerce.tag }}
                </span>
              </a>

              <!-- Message and Chat Notification Badges -->
              <div v-if="canAccessInbox" class="notification-badges">
                <MessageNotificationBadge @toggle-inbox="toggleInbox" />
                <ChatNotificationBadge @toggle-chat-inbox="toggleChatInbox" />
              </div>

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
          <div
            v-else-if="
              !isPublicCommerceQueueRoute() &&
              state.currentUserType !== USER_TYPES.INVITED &&
              state.currentUser?.name !== 'invitado'
            "
            class="navbar-user-section d-none d-lg-flex"
          >
            <Spinner :show="loading" :ligth="true"></Spinner>
          </div>

          <!-- Mobile Menu Button -->
          <button
            v-if="
              !loading &&
              !isPublicCommerceQueueRoute() &&
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
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
          <!-- Client Portal Mobile Menu Toggle -->
          <button
            v-else-if="isClientPortalRoute && !isPublicCommerceQueueRoute() && getClientPortalData().client"
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
          <div
            v-else-if="
              !isPublicCommerceQueueRoute() &&
              state.currentUserType !== USER_TYPES.INVITED &&
              state.currentUser?.name !== 'invitado'
            "
            class="d-lg-none"
          >
            <Spinner :show="loading" :ligth="true"></Spinner>
          </div>
          <!-- Language Selector for Public Routes (Mobile) -->
          <div v-if="isPublicCommerceQueueRoute()" class="d-lg-none">
            <LocaleSelector></LocaleSelector>
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
          <h5 v-if="!isClientPortalRoute" class="desktop-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{ state.userName || $t('menu') }}
            <span
              v-if="state.currentCommerce && state.currentCommerce.tag"
              class="commerce-name-in-menu"
            >
              | {{ state.currentCommerce.tag }}
            </span>
            <span
              v-if="
                state.currentModule &&
                state.currentModule.tag &&
                state.currentUserType === USER_TYPES.COLLABORATOR
              "
              class="module-name-in-menu"
            >
              | {{ state.currentModule.tag }}
            </span>
          </h5>
          <h5 v-else class="desktop-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{
              getClientPortalData().client
                ? `${getClientPortalData().client.name || ''} ${
                    getClientPortalData().client.lastName || ''
                  }`.trim() || 'Cliente'
                : 'Cliente'
            }}
            <span
              v-if="getClientPortalData().commerce && getClientPortalData().commerce.tag"
              class="commerce-name-in-menu"
            >
              | {{ getClientPortalData().commerce.tag }}
            </span>
          </h5>
          <button class="desktop-menu-close" @click="closeDesktopMenu" aria-label="Close menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="desktop-menu-body">
          <!-- Commerce Section for Business/Master -->
          <div
            v-if="
              (state.currentUserType === USER_TYPES.BUSINESS ||
                (state.currentUserType === USER_TYPES.MASTER &&
                  state.currentBusiness &&
                  state.currentBusiness.id)) &&
              shouldShowDesktopCommerceSelector
            "
            class="desktop-menu-item-wrapper"
          >
            <div class="desktop-menu-label-row">
              <span class="desktop-menu-label-text">{{
                $t('commerceSelector.commerce') || 'Commerce'
              }}</span>
              <CommerceSelector
                ref="desktopCommerceSelectorRef"
                :key="state.currentBusiness?.id || 'no-business'"
                class="desktop-commerce-selector"
                @commerce-changed="handleCommerceChanged"
              ></CommerceSelector>
            </div>
          </div>

          <!-- Commerce and Module Section for Collaborators -->
          <div
            v-if="
              state.currentUserType === USER_TYPES.COLLABORATOR &&
              shouldShowDesktopCollaboratorCommerceSelector
            "
            class="desktop-menu-item-wrapper"
          >
            <div class="desktop-menu-label-row">
              <span class="desktop-menu-label-text">{{
                $t('commerceSelector.commerce') || 'Commerce'
              }}</span>
              <CommerceSelector
                ref="desktopCollaboratorCommerceSelectorRef"
                :key="state.currentCommerce?.id || 'no-commerce'"
                class="desktop-commerce-selector"
                @commerce-changed="handleCommerceChanged"
              ></CommerceSelector>
            </div>
          </div>

          <div
            v-if="
              state.currentUserType === USER_TYPES.COLLABORATOR && shouldShowDesktopModuleSelector
            "
            class="desktop-menu-item-wrapper"
          >
            <div class="desktop-menu-label-row">
              <span class="desktop-menu-label-text">{{
                $t('moduleSelector.module') || 'Module'
              }}</span>
              <ModuleSelector
                ref="desktopModuleSelectorRef"
                :key="state.currentCommerce?.id || 'no-commerce'"
                class="desktop-module-selector"
                @module-changed="handleModuleChanged"
              ></ModuleSelector>
            </div>
          </div>

          <!-- Mi Perfil Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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
                v-if="menuUnreadCount > 0"
                class="message-indicator badge bg-danger rounded-pill ms-auto"
              >
                {{ menuUnreadCount }}
              </span>
            </a>
          </div>

          <!-- Menu Options Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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
                  <a
                    v-if="option === 'go-minisite'"
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style desktop-menu-btn"
                    :href="getBusinessLink()"
                    target="_blank"
                    @click="closeDesktopMenu"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                  <a
                    v-else-if="option === 'client-portal'"
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style desktop-menu-btn"
                    :href="getClientPortalLink()"
                    target="_blank"
                    @click="closeDesktopMenu"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                  <button
                    v-else
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style desktop-menu-btn"
                    @click="navigateToMenuOption(option, true)"
                    :disabled="
                      state.currentUserType === USER_TYPES.BUSINESS &&
                      !state.toggles[`business.main-menu.${option}`]
                    "
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
                    <i
                      v-if="option === 'medical-management'"
                      :class="`bi ${
                        state.medicalManagementSubMenuOption === true
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
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
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
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
                        "
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <!-- Medical Management Submenu -->
                  <div
                    v-if="
                      option === 'medical-management' &&
                      state.medicalManagementSubMenuOption === true
                    "
                    class="desktop-submenu-container"
                  >
                    <div
                      v-for="subOption in getMedicalManagementSubMenuOptions()"
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
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
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

          <!-- Client Portal Menu Options Section -->
          <div v-else-if="isClientPortalRoute" class="desktop-menu-item-wrapper">
            <div class="choose-attention my-3 mt-4">
              <span>{{ $t(`${getMenuTranslationKey()}.choose`) || '¿Qué deseas hacer hoy?' }}</span>
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
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Idioma Section (before logout) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="desktop-menu-item-wrapper"
          >
            <div class="desktop-menu-label-row">
              <span class="desktop-menu-label-text">{{ $t('language') || 'Idioma' }}</span>
              <LocaleSelector class="desktop-locale-selector"></LocaleSelector>
            </div>
          </div>

          <!-- Client Portal Idioma Section -->
          <div v-else-if="isClientPortalRoute" class="desktop-menu-item-wrapper">
            <div class="desktop-menu-label-row">
              <span class="desktop-menu-label-text">{{ $t('language') || 'Idioma' }}</span>
              <LocaleSelector class="desktop-locale-selector"></LocaleSelector>
            </div>
          </div>

          <!-- Logout Section (at the end) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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

          <!-- Client Portal Logout Section -->
          <div v-else-if="isClientPortalRoute" class="desktop-menu-item-wrapper logout-wrapper">
            <button
              class="desktop-menu-item logout-item"
              @click="
                () => {
                  logoutClientPortal();
                  closeDesktopMenu();
                }
              "
            >
              <i class="bi bi-box-arrow-right"></i>
              <span>{{ $t('clientPortal.menu.logout') || 'Cerrar Sesión' }}</span>
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
          <h5 v-if="!isClientPortalRoute" class="mobile-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{ state.userName || $t('menu') }}
            <span
              v-if="state.currentCommerce && state.currentCommerce.tag"
              class="commerce-name-in-menu"
            >
              | {{ state.currentCommerce.tag }}
            </span>
            <span
              v-if="
                state.currentModule &&
                state.currentModule.tag &&
                state.currentUserType === USER_TYPES.COLLABORATOR
              "
              class="module-name-in-menu"
            >
              | {{ state.currentModule.tag }}
            </span>
          </h5>
          <h5 v-else class="mobile-menu-title">
            <i class="bi bi-person-circle me-2"></i>
            {{
              getClientPortalData().client
                ? `${getClientPortalData().client.name || ''} ${
                    getClientPortalData().client.lastName || ''
                  }`.trim() || 'Cliente'
                : 'Cliente'
            }}
            <span
              v-if="getClientPortalData().commerce && getClientPortalData().commerce.tag"
              class="commerce-name-in-menu"
            >
              | {{ getClientPortalData().commerce.tag }}
            </span>
          </h5>
          <button class="mobile-menu-close" @click="closeMobileMenu" aria-label="Close menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="mobile-menu-body">
          <!-- Commerce Section for Business/Master -->
          <div
            v-if="
              (state.currentUserType === USER_TYPES.BUSINESS ||
                (state.currentUserType === USER_TYPES.MASTER &&
                  state.currentBusiness &&
                  state.currentBusiness.id)) &&
              shouldShowMobileCommerceSelector
            "
            class="mobile-menu-item-wrapper"
          >
            <div class="mobile-menu-label-row">
              <span class="mobile-menu-label-text">{{
                $t('commerceSelector.commerce') || 'Commerce'
              }}</span>
              <CommerceSelector
                ref="mobileCommerceSelectorRef"
                :key="state.currentBusiness?.id || 'no-business'"
                class="mobile-commerce-selector"
                @commerce-changed="handleCommerceChanged"
              ></CommerceSelector>
            </div>
          </div>

          <!-- Commerce and Module Section for Collaborators -->
          <div
            v-if="
              state.currentUserType === USER_TYPES.COLLABORATOR &&
              shouldShowMobileCollaboratorCommerceSelector
            "
            class="mobile-menu-item-wrapper"
          >
            <div class="mobile-menu-label-row">
              <span class="mobile-menu-label-text">{{
                $t('commerceSelector.commerce') || 'Commerce'
              }}</span>
              <CommerceSelector
                ref="mobileCollaboratorCommerceSelectorRef"
                :key="state.currentCommerce?.id || 'no-commerce'"
                class="mobile-commerce-selector"
                @commerce-changed="handleCommerceChanged"
              ></CommerceSelector>
            </div>
          </div>

          <div
            v-if="
              state.currentUserType === USER_TYPES.COLLABORATOR && shouldShowMobileModuleSelector
            "
            class="mobile-menu-item-wrapper"
          >
            <div class="mobile-menu-label-row">
              <span class="mobile-menu-label-text">{{
                $t('moduleSelector.module') || 'Module'
              }}</span>
              <ModuleSelector
                ref="mobileModuleSelectorRef"
                :key="state.currentCommerce?.id || 'no-commerce'"
                class="mobile-module-selector"
                @module-changed="handleModuleChanged"
              ></ModuleSelector>
            </div>
          </div>

          <!-- Mi Perfil Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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
                v-if="menuUnreadCount > 0"
                class="message-indicator badge bg-danger rounded-pill ms-auto"
              >
                {{ menuUnreadCount }}
              </span>
            </a>
          </div>

          <!-- Menu Options Section -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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
                <div v-if="option === 'go-minisite'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style mobile-menu-btn"
                    :href="getBusinessLink()"
                    target="_blank"
                    @click="closeMobileMenu"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else-if="option === 'client-portal'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style mobile-menu-btn"
                    :href="getClientPortalLink()"
                    target="_blank"
                    @click="closeMobileMenu"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else>
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-1 btn-style mobile-menu-btn"
                    @click="navigateToMenuOption(option)"
                    :disabled="
                      state.currentUserType === USER_TYPES.BUSINESS &&
                      !state.toggles[`business.main-menu.${option}`]
                    "
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
                    <i
                      v-if="option === 'medical-management'"
                      :class="`bi ${
                        state.medicalManagementSubMenuOption === true
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
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
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
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
                        "
                      >
                        {{ $t(`${getMenuTranslationKey()}.${subOption}`) }}
                        <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <!-- Medical Management Submenu -->
                  <div
                    v-if="
                      option === 'medical-management' &&
                      state.medicalManagementSubMenuOption === true
                    "
                    class="mobile-submenu-container"
                  >
                    <div
                      v-for="subOption in getMedicalManagementSubMenuOptions()"
                      :key="subOption"
                      class="mobile-submenu-item"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-0 mb-1 btn-style mobile-menu-btn mobile-submenu-btn"
                        @click="navigateToMenuOption(subOption)"
                        :disabled="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                        "
                        :title="
                          state.currentUserType === USER_TYPES.BUSINESS &&
                          !state.toggles[`business.main-menu.${subOption}`]
                            ? $t(`${getMenuTranslationKey()}.permissionRequired`)
                            : ''
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

          <!-- Client Portal Menu Options Section (Mobile) -->
          <div v-else-if="isClientPortalRoute" class="mobile-menu-item-wrapper">
            <div class="choose-attention my-3 mt-4">
              <span>{{ $t(`${getMenuTranslationKey()}.choose`) || '¿Qué deseas hacer hoy?' }}</span>
            </div>
            <div class="row">
              <div
                v-for="option in getMenuOptions()"
                :key="option"
                class="d-grid btn-group btn-group-justified mobile-button-wrapper"
              >
                <div class="centered">
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-2 mb-2 btn-style mobile-menu-btn"
                    @click="navigateToMenuOption(option)"
                  >
                    {{ $t(`${getMenuTranslationKey()}.${option}`) }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Idioma Section (before logout) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
            class="mobile-menu-item-wrapper"
          >
            <div class="mobile-menu-label-row">
              <span class="mobile-menu-label-text">{{ $t('language') || 'Idioma' }}</span>
              <LocaleSelector class="mobile-locale-selector"></LocaleSelector>
            </div>
          </div>

          <!-- Client Portal Idioma Section (Mobile) -->
          <div v-else-if="isClientPortalRoute" class="mobile-menu-item-wrapper">
            <div class="mobile-menu-label-row">
              <span class="mobile-menu-label-text">{{ $t('language') || 'Idioma' }}</span>
              <LocaleSelector class="mobile-locale-selector"></LocaleSelector>
            </div>
          </div>

          <!-- Logout Section (at the end) -->
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              state.currentUserType !== USER_TYPES.INVITED &&
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

          <!-- Client Portal Logout Section (Mobile) -->
          <div v-else-if="isClientPortalRoute" class="mobile-menu-item-wrapper logout-wrapper">
            <button
              class="mobile-menu-item logout-item"
              @click="
                () => {
                  logoutClientPortal();
                  closeMobileMenu();
                }
              "
            >
              <i class="bi bi-box-arrow-right"></i>
              <span>{{ $t('clientPortal.menu.logout') || 'Cerrar Sesión' }}</span>
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
              <MyUser
                @toggle-inbox="toggleInbox"
                @open-professional-profile="openProfessionalModal"
              >
              </MyUser>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Professional Profile Modal -->
    <ProfessionalProfileModal
      :is-open="isProfessionalModalOpen"
      :collaborator-id="state.currentUser?.id"
      @close="closeProfessionalModal"
    />

    <!-- Internal Messages and Chat Inboxes -->
    <MessageInbox
      v-if="state.currentUser && state.currentUser.name !== 'invitado' && canAccessInbox"
      :isOpen="inboxOpen"
      :user-role="state.currentUserType || 'collaborator'"
      :user-data="{
        id: state.currentUser?.id,
        businessId: state.currentUser?.businessId,
        commerceId: state.currentUser?.commerceId,
        commerceIds: state.currentUser?.commerceIds,
        commercesId: state.currentUser?.commercesId
      }"
      @close="closeInbox"
    />

    <ChatInbox
      v-if="state.currentUser && state.currentUser.name !== 'invitado' && canAccessInbox"
      :isOpen="chatInboxOpen"
      :user-role="state.currentUserType || 'collaborator'"
      :user-data="{
        id: state.currentUser?.id,
        businessId: state.currentUser?.businessId,
        commerceId: state.currentUser?.commerceId,
        commerceIds: state.currentUser?.commerceIds,
        commercesId: state.currentUser?.commercesId
      }"
      @close="closeChatInbox"
    />

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

.commerce-name-display {
  font-weight: 600;
  opacity: 0.9;
  font-size: 0.95rem;
}

.module-name-display {
  font-weight: 600;
  opacity: 0.9;
  font-size: 0.95rem;
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
  flex-wrap: wrap;
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

.mobile-menu-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

.mobile-menu-label-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--azul-hub, #1f3f92);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.mobile-locale-selector {
  flex: 1;
  min-width: 0;
}

.mobile-locale-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

.mobile-commerce-selector {
  flex: 1;
  min-width: 0;
}

.mobile-commerce-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

.mobile-module-selector {
  flex: 1;
  min-width: 0;
}

.mobile-module-selector select {
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
  flex-wrap: wrap;
}

.commerce-name-in-menu,
.module-name-in-menu {
  font-weight: 500;
  opacity: 0.85;
  font-size: 0.9rem;
  margin-left: 0.25rem;
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

.desktop-menu-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

.desktop-menu-label-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--azul-hub, #1f3f92);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.desktop-locale-selector {
  flex: 1;
  min-width: 0;
}

.desktop-locale-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

.desktop-commerce-selector {
  flex: 1;
  min-width: 0;
}

.desktop-commerce-selector select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gris-default, #e0e0e0);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  background-color: var(--color-background);
}

.desktop-module-selector {
  flex: 1;
  min-width: 0;
}

.desktop-module-selector select {
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

/* User avatar photo styles */
.user-avatar-photo {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 0.25rem;
  vertical-align: middle;
}

.modal-avatar-photo {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 0.375rem;
  vertical-align: middle;
}

/* Notification badges container */
.notification-badges {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .notification-badges {
    gap: 0.5rem;
    margin-right: 0.25rem;
  }
}
</style>
