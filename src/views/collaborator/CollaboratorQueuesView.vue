<script>
import { ref, reactive, onBeforeMount, watch, computed, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import {
  getGroupedQueueByCommerceId,
  getAverageAttentionDuration,
} from '../../application/services/queue';
import { getCollaboratorById, updateModule } from '../../application/services/collaborator';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import {
  updatedAvailableAttentionsByCommerce,
  updatedProcessingAttentionsByCommerce,
  updatedTerminatedAttentionsByCommerce,
} from '../../application/firebase';
import { getQueueByCommerce } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorQueuesView',
  components: {
    CommerceLogo,
    Message,
    VueRecaptcha,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    DesktopPageHeader,
    Popper,
  },
  async setup() {
    const router = useRouter();
    const route = useRoute();

    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    const { id } = route.params;

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    // Use global commerce and module from store
    const commerce = computed(() => store.getCurrentCommerce);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      business: {},
      queue: {},
      queues: [],
      groupedQueues: [],
      collaborator: {},
      modules: ref({}),
      activeCommerce: false,
      captcha: false,
      queueStatus: {},
      queueProcessingStatus: {},
      queueTerminatedStatus: {}, // Track terminated attentions count per queue
      toggles: {},
      queueAverageDurations: {}, // Cache for average attention durations
      queueAverageDurationsIntelligent: {}, // Track which queues use intelligent estimation for average
      queueAverageDurationsLoaded: {}, // Track which queues have already loaded their average duration
      queueAverageDurationsLoading: {}, // Track which queues are currently loading to prevent concurrent calls
    });

    const loadCommerceData = async () => {
      if (!commerce.value || !commerce.value.id) {
        state.queues = [];
        state.modules = [];
        return;
      }
      try {
        // Use commerce from store if it already has queues, otherwise fetch
        if (commerce.value.queues && commerce.value.queues.length > 0) {
          state.queues = commerce.value.queues;
        } else {
          const commerceById = await getCommerceById(commerce.value.id);
          state.queues = commerceById.queues || [];
          // Update store with full commerce data if we fetched it
          if (commerceById && commerceById.id) {
            await store.setCurrentCommerce(commerceById);
          }
        }
        await initQueues();
        state.modules = await getActiveModulesByCommerceId(commerce.value.id);
        // Set module if not already set
        if (!module.value && state.modules && state.modules.length > 0) {
          const collaboratorModule = state.modules.find(m => m.id === state.collaborator.moduleId);
          if (collaboratorModule) {
            await store.setCurrentModule(collaboratorModule);
          } else if (state.modules.length > 0) {
            // Auto-select first module if collaborator's module not found
            await store.setCurrentModule(state.modules[0]);
          }
        }
      } catch (error) {
        // Error loading commerce data
      }
    };

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.collaborator = state.currentUser;
        if (!state.collaborator || !state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }
        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.collaborator.commerceId) {
            const initialCommerce = await getCommerceById(state.collaborator.commerceId);
            if (initialCommerce && initialCommerce.id) {
              await store.setCurrentCommerce(initialCommerce);
            }
          }
          // If still no commerce, try commercesId (multiple commerces)
          if (
            (!commerce.value || !commerce.value.id) &&
            state.collaborator.commercesId &&
            state.collaborator.commercesId.length > 0
          ) {
            const firstCommerceId = state.collaborator.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }
        await loadCommerceData();

        // Initialize attentions listener with current commerce AFTER queues are loaded
        // This ensures queues exist before we try to update their status
        if (commerce.value && commerce.value.id && state.queues && state.queues.length > 0) {
          initializeAttentionsListener(commerce.value.id);
        }

        store.setCurrentQueue(undefined);
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    // Watch for commerce changes
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (!newCommerce || !newCommerce.id) return;
        if (oldCommerce && oldCommerce.id === newCommerce.id) return;
        try {
          loading.value = true;
          // Clear data
          state.queues = [];
          state.modules = [];
          state.queue = {};
          state.queueStatus = {};
          state.queueTerminatedStatus = {}; // Reset terminated status when commerce changes
          state.queueAverageDurationsLoaded = {}; // Reset loaded flags when commerce changes
          state.queueAverageDurationsLoading = {}; // Reset loading flags when commerce changes

          await loadCommerceData();

          // Reinitialize attentions listener with new commerce AFTER queues are loaded
          if (state.queues && state.queues.length > 0) {
            initializeAttentionsListener(newCommerce.id);
          }
          alertError.value = '';
          loading.value = false;
        } catch (error) {
          alertError.value = error.response?.status || 500;
          loading.value = false;
        }
      },
      { deep: true }
    );

    // Watch for module changes
    watch(
      module,
      async (newModule, oldModule) => {
        if (oldModule && oldModule.id === newModule?.id) return;
        // Module change might affect queue filtering, reload if needed
        if (newModule && newModule.id && commerce.value && commerce.value.id) {
          try {
            loading.value = true;
            await initQueues();
            // Re-check queue status after queues are reloaded
            if (
              attentionsWrapper.value &&
              processingAttentionsWrapper.value &&
              terminatedAttentionsWrapper.value
            ) {
              await checkQueueStatus(
                attentionsWrapper.value,
                processingAttentionsWrapper.value,
                terminatedAttentionsWrapper.value
              );
            }
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { deep: true }
    );

    // Watch for queues changes to ensure status is updated
    watch(
      () => state.queues?.length,
      async (newLength, oldLength) => {
        // When queues are loaded or change, update status
        if (newLength > 0 && newLength !== oldLength) {
          initializeQueueStatus();
          // If listener is already initialized, check status
          if (
            attentionsWrapper.value &&
            processingAttentionsWrapper.value &&
            terminatedAttentionsWrapper.value
          ) {
            await checkQueueStatus(
              attentionsWrapper.value,
              processingAttentionsWrapper.value,
              terminatedAttentionsWrapper.value
            );
          }
        }
      }
    );

    const checkQueueStatus = async (
      attentionsRef,
      processingAttentionsRef,
      terminatedAttentionsRef
    ) => {
      // Ensure we have queues loaded first
      if (!state.queues || state.queues.length === 0) {
        return;
      }

      // Always initialize all queues to 0 first
      initializeQueueStatus();

      // Get the value from refs, ensuring they're arrays
      const attentionsArray =
        attentionsRef && attentionsRef.value && Array.isArray(attentionsRef.value)
          ? attentionsRef.value
          : [];
      const processingAttentionsArray =
        processingAttentionsRef &&
        processingAttentionsRef.value &&
        Array.isArray(processingAttentionsRef.value)
          ? processingAttentionsRef.value
          : [];
      const terminatedAttentionsArray =
        terminatedAttentionsRef &&
        terminatedAttentionsRef.value &&
        Array.isArray(terminatedAttentionsRef.value)
          ? terminatedAttentionsRef.value
          : [];

      try {
        // Group pending attentions by queue
        const filteredPendingByQueue = attentionsArray.reduce((acc, attention) => {
          if (attention && attention.queueId) {
            const queueId = attention.queueId;
            if (!acc[queueId]) {
              acc[queueId] = [];
            }
            acc[queueId].push(attention);
          }
          return acc;
        }, {});

        // Check if stages are enabled for this commerce
        const isStagesEnabled =
          commerce.value && getActiveFeature(commerce.value, 'attention-stages-enabled', 'PRODUCT');

        // Group terminated attentions by queue FIRST
        // Also create a Set of terminated attention IDs to avoid double counting
        const terminatedAttentionIds = new Set();
        const filteredTerminatedByQueue = terminatedAttentionsArray.reduce((acc, attention) => {
          if (attention && attention.queueId) {
            const queueId = attention.queueId;
            if (!acc[queueId]) {
              acc[queueId] = [];
            }
            acc[queueId].push(attention);
            // Track terminated attention IDs
            if (attention.id) {
              terminatedAttentionIds.add(attention.id);
            }
          }
          return acc;
        }, {});

        // Group processing attentions by queue, separating CHECKOUT stage attentions
        const filteredProcessingByQueue = {};
        const checkoutAttentionsByQueue = {}; // Atentions in CHECKOUT stage (but not yet terminated)

        processingAttentionsArray.forEach(attention => {
          if (attention && attention.queueId) {
            const queueId = attention.queueId;
            const attentionId = attention.id || attention.attentionId;

            // Check if attention is already fully terminated (should not be in processing array, but check to be safe)
            const isTerminated =
              attention.status === 'TERMINATED' ||
              attention.status === 'RATED' ||
              attention.status === 'SKIPED' ||
              (isStagesEnabled && attention.currentStage === 'TERMINATED') ||
              (attentionId && terminatedAttentionIds.has(attentionId));

            // If stages enabled and attention is in CHECKOUT stage (but NOT terminated), count it as checkout
            if (isStagesEnabled && attention.currentStage === 'CHECKOUT' && !isTerminated) {
              if (!checkoutAttentionsByQueue[queueId]) {
                checkoutAttentionsByQueue[queueId] = [];
              }
              checkoutAttentionsByQueue[queueId].push(attention);
            } else if (!isTerminated) {
              // Regular processing attention (not in CHECKOUT stage and not terminated)
              if (!filteredProcessingByQueue[queueId]) {
                filteredProcessingByQueue[queueId] = [];
              }
              filteredProcessingByQueue[queueId].push(attention);
            }
            // If isTerminated, skip it (should be in terminatedAttentionsArray instead)
          }
        });

        // Update all queues
        state.queues.forEach(queue => {
          if (queue && queue.id) {
            // Update pending count
            if (filteredPendingByQueue[queue.id]) {
              const pendingCount = filteredPendingByQueue[queue.id].length;
              state.queueStatus[queue.id] = pendingCount;
            } else {
              // Explicitly set to 0 if no pending attentions for this queue
              state.queueStatus[queue.id] = 0;
            }

            // Update processing count from Firebase (excluding CHECKOUT stage attentions)
            if (filteredProcessingByQueue[queue.id]) {
              state.queueProcessingStatus[queue.id] = filteredProcessingByQueue[queue.id].length;
            } else {
              // Explicitly set to 0 if no processing attentions for this queue
              state.queueProcessingStatus[queue.id] = 0;
            }

            // Update terminated count from Firebase
            // Include: terminated attentions + CHECKOUT stage attentions (when stages enabled)
            let terminatedCount = 0;
            if (filteredTerminatedByQueue[queue.id]) {
              terminatedCount += filteredTerminatedByQueue[queue.id].length;
            }
            if (checkoutAttentionsByQueue[queue.id]) {
              terminatedCount += checkoutAttentionsByQueue[queue.id].length;
            }
            state.queueTerminatedStatus[queue.id] = terminatedCount;
          }
        });
      } catch (error) {
        console.error('Error checking queue status:', error);
        initializeQueueStatus();
      }
    };

    // Get attentions refs - these are reactive refs that Firebase will update
    // They always start as empty arrays and get populated by Firebase snapshots
    // Use wrapper refs so we can update them when commerce changes
    const attentionsWrapper = ref(null);
    const processingAttentionsWrapper = ref(null);
    const terminatedAttentionsWrapper = ref(null);
    let attentions = null;
    let processingAttentions = null;
    let terminatedAttentions = null;

    // Initialize attentions listeners with commerce from store or route
    const initializeAttentionsListener = commerceId => {
      if (!commerceId) {
        // If no commerce, clear attentions and reset status
        attentionsWrapper.value = null;
        processingAttentionsWrapper.value = null;
        terminatedAttentionsWrapper.value = null;
        initializeQueueStatus();
        return;
      }

      // Clean up previous listeners if exist
      if (attentions && attentions._unsubscribe) {
        attentions._unsubscribe();
        attentions = null;
      }
      if (processingAttentions && processingAttentions._unsubscribe) {
        processingAttentions._unsubscribe();
        processingAttentions = null;
      }
      if (terminatedAttentions && terminatedAttentions._unsubscribe) {
        terminatedAttentions._unsubscribe();
        terminatedAttentions = null;
      }

      // Reset queue status before creating new listeners
      initializeQueueStatus();

      // Create new listeners for pending, processing, and terminated attentions
      attentions = updatedAvailableAttentionsByCommerce(commerceId);
      attentionsWrapper.value = attentions;

      processingAttentions = updatedProcessingAttentionsByCommerce(commerceId);
      processingAttentionsWrapper.value = processingAttentions;

      terminatedAttentions = updatedTerminatedAttentionsByCommerce(commerceId);
      terminatedAttentionsWrapper.value = terminatedAttentions;

      // Force initial check after a brief moment to allow Firebase to initialize
      // The watch will handle updates, but we ensure initial state is correct
      setTimeout(() => {
        if (
          attentionsWrapper.value &&
          processingAttentionsWrapper.value &&
          terminatedAttentionsWrapper.value
        ) {
          checkQueueStatus(
            attentionsWrapper.value,
            processingAttentionsWrapper.value,
            terminatedAttentionsWrapper.value
          );
        }
      }, 100);
    };

    const initQueues = async () => {
      if (
        commerce.value &&
        getActiveFeature(commerce.value, 'attention-queue-typegrouped', 'PRODUCT')
      ) {
        state.groupedQueues = await getGroupedQueueByCommerceId(commerce.value.id);
        if (Object.keys(state.groupedQueues).length > 0 && state.collaborator.type === 'STANDARD') {
          const collaboratorQueues = state.groupedQueues['COLLABORATOR'].filter(
            queue => queue.collaboratorId === state.collaborator.id
          );
          const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
          const queues = [...collaboratorQueues, ...otherQueues];
          state.queues = queues;
        }
        if (
          Object.keys(state.groupedQueues).length > 0 &&
          state.collaborator.type === 'ASSISTANT'
        ) {
          const otherQueues = state.queues.filter(queue => queue.type !== 'COLLABORATOR');
          const queues = [...otherQueues];
          state.queues = queues;
        }
      }
      // Initialize queue status after queues are loaded
      initializeQueueStatus();

      // NOTE: Average duration loading is disabled - not showing this data
      // // Load average durations for all queues (only once when queues are loaded)
      // if (state.queues && state.queues.length > 0) {
      //   state.queues.forEach(queue => {
      //     if (queue && queue.id) {
      //       updateQueueAverageDuration(queue.id);
      //     }
      //   });
      // }

      // Trigger checkQueueStatus if listener is already initialized
      if (
        attentionsWrapper.value &&
        processingAttentionsWrapper.value &&
        terminatedAttentionsWrapper.value
      ) {
        await checkQueueStatus(
          attentionsWrapper.value,
          processingAttentionsWrapper.value,
          terminatedAttentionsWrapper.value
        );
      }
    };

    const isActiveCommerce = () => commerce.value && commerce.value.active === true;

    const isActiveModules = () => module.value && state.modules.length > 0;

    const getLineAttentions = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        store.setCurrentQueue(state.queue);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const getQueue = async queueIn => {
      state.queue = queueIn;
      store.setCurrentQueue(state.queue);
      if (captchaEnabled) {
        await validateCaptchaOk(true);
      } else {
        // If no captcha, navigate directly to attentions page
        await getLineAttentions();
      }
    };

    const validateCaptchaOk = async response => {
      if (response) {
        state.captcha = true;
        getLineAttentions();
      }
    };

    const validateCaptchaError = () => {
      state.captcha = false;
    };

    const moduleSelect = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const id = state.collaborator.id;
        if (!module.value || !module.value.id) {
          alertError.value = 'No module selected';
          loading.value = false;
          return;
        }
        const body = { module: module.value.id };
        await updateModule(id, body);
        // Update the collaborator's moduleId after successful update
        state.collaborator.moduleId = module.value.id;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const goBack = () => {
      router.push({ path: '/interno/colaborador/menu' });
    };

    const initializeQueueStatus = () => {
      if (state.queues && state.queues.length > 0) {
        state.queues.forEach(queue => {
          if (queue && queue.id) {
            state.queueStatus[queue.id] = 0;
            state.queueProcessingStatus[queue.id] = 0;
            state.queueTerminatedStatus[queue.id] = 0;
          }
        });
      }
    };
    // Function to update average attention duration for a queue
    const updateQueueAverageDuration = async queueId => {
      if (!queueId) return;

      // Skip if already loaded to avoid redundant API calls
      if (state.queueAverageDurationsLoaded[queueId]) {
        return;
      }

      // Skip if currently loading to prevent concurrent calls
      if (state.queueAverageDurationsLoading[queueId]) {
        return;
      }

      // Mark as loading
      state.queueAverageDurationsLoading[queueId] = true;

      try {
        const result = await getAverageAttentionDuration(queueId, 'median');
        if (result && result.duration && result.duration > 0) {
          // Convert minutes to display format
          const minutes = Math.round(result.duration);
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          let display = '';
          if (hours > 0) {
            display = `${hours}h ${mins}min`;
          } else {
            display = `${mins} min`;
          }
          state.queueAverageDurations[queueId] = display;
          state.queueAverageDurationsIntelligent[queueId] = result.success || false;
          state.queueAverageDurationsLoaded[queueId] = true; // Mark as loaded
          state.queueAverageDurationsLoading[queueId] = false; // Mark as not loading
        } else {
          // Fallback: use queue's estimatedTime if available
          const queue = state.queues.find(q => q.id === queueId);
          if (queue && queue.estimatedTime) {
            const minutes = queue.estimatedTime;
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            let display = '';
            if (hours > 0) {
              display = `${hours}h ${mins}min`;
            } else {
              display = `${mins} min`;
            }
            state.queueAverageDurations[queueId] = display;
            state.queueAverageDurationsIntelligent[queueId] = false;
            state.queueAverageDurationsLoaded[queueId] = true; // Mark as loaded
            state.queueAverageDurationsLoading[queueId] = false; // Mark as not loading
          } else {
            state.queueAverageDurations[queueId] = 'N/A';
            state.queueAverageDurationsIntelligent[queueId] = false;
            state.queueAverageDurationsLoaded[queueId] = true; // Mark as loaded
            state.queueAverageDurationsLoading[queueId] = false; // Mark as not loading
          }
        }
      } catch (error) {
        console.warn('Failed to get average attention duration for queue', queueId, error);
        // Fallback
        const queue = state.queues.find(q => q.id === queueId);
        if (queue && queue.estimatedTime) {
          const minutes = queue.estimatedTime;
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          let display = '';
          if (hours > 0) {
            display = `${hours}h ${mins}min`;
          } else {
            display = `${mins} min`;
          }
          state.queueAverageDurations[queueId] = display;
        } else {
          state.queueAverageDurations[queueId] = 'N/A';
        }
        state.queueAverageDurationsIntelligent[queueId] = false;
        state.queueAverageDurationsLoaded[queueId] = true; // Mark as loaded even on error
        state.queueAverageDurationsLoading[queueId] = false; // Mark as not loading
      }
    };

    // Function to get queue metrics - accessing reactive state directly
    const getQueueMetrics = queueId => {
      // Safety check: if queueId is not provided or invalid, return default values
      if (!queueId) {
        return {
          pending: 0,
          processing: 0,
          terminated: 0,
          total: 0,
          priority: 'low',
          priorityColor: '#28a745',
        };
      }

      const pending = state.queueStatus[queueId] || 0;
      const processing = state.queueProcessingStatus[queueId] || 0;
      const terminated = state.queueTerminatedStatus[queueId] || 0;
      const total = pending + processing + terminated;

      // Determine priority/urgency
      let priority = 'low';
      let priorityColor = '#28a745';
      if (pending > 10) {
        priority = 'high';
        priorityColor = '#dc3545';
      } else if (pending > 5) {
        priority = 'medium';
        priorityColor = '#ffc107';
      }

      return {
        pending,
        processing,
        terminated,
        total,
        priority,
        priorityColor,
      };
    };

    // Debounce timer for attention watcher
    let attentionWatcherTimer = null;

    // Watch attentions ref values for changes (both pending and processing)
    // Watch the wrappers so we can track when the refs themselves change
    watch(
      () => {
        // Safely access both attentions refs via wrappers
        try {
          const currentAttentionsRef = attentionsWrapper.value;
          const currentProcessingAttentionsRef = processingAttentionsWrapper.value;
          const currentTerminatedAttentionsRef = terminatedAttentionsWrapper.value;
          const pendingArray =
            currentAttentionsRef &&
            currentAttentionsRef.value !== undefined &&
            currentAttentionsRef.value !== null &&
            Array.isArray(currentAttentionsRef.value)
              ? currentAttentionsRef.value
              : [];
          const processingArray =
            currentProcessingAttentionsRef &&
            currentProcessingAttentionsRef.value !== undefined &&
            currentProcessingAttentionsRef.value !== null &&
            Array.isArray(currentProcessingAttentionsRef.value)
              ? currentProcessingAttentionsRef.value
              : [];
          const terminatedArray =
            currentTerminatedAttentionsRef &&
            currentTerminatedAttentionsRef.value !== undefined &&
            currentTerminatedAttentionsRef.value !== null &&
            Array.isArray(currentTerminatedAttentionsRef.value)
              ? currentTerminatedAttentionsRef.value
              : [];
          // Return a string representation for deep comparison (combine all three)
          return JSON.stringify({
            pending: pendingArray.map(a => ({ id: a.id, queueId: a.queueId })),
            processing: processingArray.map(a => ({ id: a.id, queueId: a.queueId })),
            terminated: terminatedArray.map(a => ({ id: a.id, queueId: a.queueId })),
          });
        } catch (error) {
          // Error accessing attentions.value
        }
        return JSON.stringify({ pending: [], processing: [], terminated: [] });
      },
      async (newValue, oldValue) => {
        // Only process if value actually changed
        if (newValue === oldValue && oldValue !== undefined) {
          return;
        }

        // Clear existing timer
        if (attentionWatcherTimer) {
          clearTimeout(attentionWatcherTimer);
        }

        // Debounce: wait 300ms before processing to batch rapid Firebase updates
        attentionWatcherTimer = setTimeout(async () => {
          // Get the actual arrays from the refs
          const currentAttentionsRef = attentionsWrapper.value;
          const currentProcessingAttentionsRef = processingAttentionsWrapper.value;
          const currentTerminatedAttentionsRef = terminatedAttentionsWrapper.value;
          if (
            !currentAttentionsRef ||
            !currentProcessingAttentionsRef ||
            !currentTerminatedAttentionsRef
          ) {
            initializeQueueStatus();
            return;
          }

          // Always call checkQueueStatus - it will handle empty arrays correctly
          await checkQueueStatus(
            currentAttentionsRef,
            currentProcessingAttentionsRef,
            currentTerminatedAttentionsRef
          );
        }, 300); // 300ms debounce for Firebase updates
      },
      { immediate: true }
    );

    // Cleanup listeners on component unmount
    onUnmounted(() => {
      if (attentions && attentions._unsubscribe) {
        attentions._unsubscribe();
      }
      if (processingAttentions && processingAttentions._unsubscribe) {
        processingAttentions._unsubscribe();
      }
      if (terminatedAttentions && terminatedAttentions._unsubscribe) {
        terminatedAttentions._unsubscribe();
      }
      // Clear attention watcher timer
      if (attentionWatcherTimer) {
        clearTimeout(attentionWatcherTimer);
      }
    });

    // Computed property to sort queues: COLLABORATOR queues first, then SELECT_SERVICE (geral), then others
    const sortedQueues = computed(() => {
      if (!state.queues || state.queues.length === 0) return [];

      // Filter active queues only
      const activeQueues = state.queues.filter(queue => queue && queue.active && queue.id);

      // 1. Collaborator queues (dedicated to this collaborator)
      const collaboratorQueues = activeQueues.filter(
        queue => queue.type === 'COLLABORATOR' && queue.collaboratorId === state.collaborator?.id
      );

      // 2. General queues (SELECT_SERVICE type)
      const generalQueues = activeQueues.filter(queue => queue.type === 'SELECT_SERVICE');

      // 3. Other queues (not COLLABORATOR and not SELECT_SERVICE)
      const otherQueues = activeQueues.filter(
        queue => queue.type !== 'COLLABORATOR' && queue.type !== 'SELECT_SERVICE'
      );

      return [...collaboratorQueues, ...generalQueues, ...otherQueues];
    });

    // Helper function to check if a queue is dedicated to the collaborator
    const isDedicatedQueue = queue =>
      queue && queue.type === 'COLLABORATOR' && queue.collaboratorId === state.collaborator?.id;

    return {
      siteKey,
      state,
      captchaEnabled,
      loading,
      alertError,
      commerce,
      module,
      getQueue,
      isActiveCommerce,
      getLineAttentions,
      validateCaptchaOk,
      validateCaptchaError,
      moduleSelect,
      isActiveModules,
      goBack,
      getQueueMetrics,
      sortedQueues,
      isDedicatedQueue,
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="commerce?.logo || state.business?.logo" :business-id="state.business?.id" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`collaboratorQueuesView.welcome`)"
          :toggles="state.toggles"
          component-name="collaboratorQueuesView"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
          <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
            <Message
              :title="$t('businessQueuesAdmin.message.4.title')"
              :content="$t('businessQueuesAdmin.message.4.content')"
            />
          </div>
          <div v-if="!isActiveModules() && !loading">
            <Message
              :title="$t('collaboratorQueuesView.message.2.title')"
              :content="$t('collaboratorQueuesView.message.2.content')"
            />
          </div>
        </div>
        <div id="queues" v-if="isActiveModules() && !loading">
          <div v-if="isActiveCommerce()">
            <div class="choose-attention">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div class="queues-rows">
              <template v-for="queue in sortedQueues">
                <div
                  v-if="queue && queue.active && queue.id"
                  :key="queue.id"
                  class="queue-row-modern"
                  :class="{
                    'queue-row-dedicated': isDedicatedQueue(queue),
                    'queue-row-compact': !isDedicatedQueue(queue),
                    'queue-row-high-priority': getQueueMetrics(queue.id).priority === 'high',
                    'queue-row-medium-priority': getQueueMetrics(queue.id).priority === 'medium',
                    'queue-row-low-priority': getQueueMetrics(queue.id).priority === 'low',
                  }"
                >
                  <div v-if="captchaEnabled === true">
                    <VueRecaptcha
                      :sitekey="siteKey"
                      @verify="validateCaptchaOk"
                      @error="validateCaptchaError"
                    >
                      <div class="queue-row-content" @click="getQueue(queue)">
                        <div class="queue-row-header">
                          <div class="queue-row-icon-wrapper">
                            <i
                              v-if="queue.type === 'COLLABORATOR'"
                              class="bi bi-person-fill queue-row-icon"
                            ></i>
                            <i v-else class="bi bi-people-fill queue-row-icon"></i>
                          </div>
                          <div class="queue-row-title-section">
                            <h5 class="queue-row-title">{{ queue.name }}</h5>
                            <span
                              v-if="queue.type === 'COLLABORATOR'"
                              class="queue-row-badge queue-row-badge-collaborator"
                            >
                              <i class="bi bi-person-badge"></i>
                              {{ $t('collaboratorQueuesView.dedicated') }}
                            </span>
                          </div>
                        </div>
                        <div class="queue-row-metrics">
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-pending">
                              <i class="bi bi-clock-history"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">
                                Checkin
                                <span
                                  class="spy-live-indicator"
                                  title="Actualización en tiempo real"
                                >
                                  <span class="spy-live-dot"></span>
                                </span>
                              </div>
                              <div class="queue-metric-value queue-metric-value-pending">
                                {{ getQueueMetrics(queue.id).pending }}
                              </div>
                            </div>
                          </div>
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-processing">
                              <i class="bi bi-play-circle-fill"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">En Atendimento</div>
                              <div class="queue-metric-value queue-metric-value-processing">
                                {{ getQueueMetrics(queue.id).processing }}
                              </div>
                            </div>
                          </div>
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-terminated">
                              <i class="bi bi-check-circle-fill"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">Checkout</div>
                              <div class="queue-metric-value queue-metric-value-terminated">
                                {{ getQueueMetrics(queue.id).terminated }}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="queue-row-footer">
                          <div class="queue-row-status">
                            <span
                              :class="`queue-status-indicator queue-status-${
                                queue.active ? 'active' : 'inactive'
                              }`"
                            ></span>
                            <span class="queue-status-text">{{
                              queue.active
                                ? $t('collaboratorQueuesView.active')
                                : $t('collaboratorQueuesView.inactive')
                            }}</span>
                          </div>
                          <div class="queue-row-action">
                            <i class="bi bi-arrow-right-circle"></i>
                          </div>
                        </div>
                      </div>
                    </VueRecaptcha>
                  </div>
                  <div v-else class="queue-row-content" @click="getQueue(queue)">
                    <div class="queue-row-header">
                      <div class="queue-row-icon-wrapper">
                        <i
                          v-if="queue.type === 'COLLABORATOR'"
                          class="bi bi-person-fill queue-row-icon"
                        ></i>
                        <i v-else class="bi bi-people-fill queue-row-icon"></i>
                      </div>
                      <div class="queue-row-title-section">
                        <h5 class="queue-row-title">{{ queue.name }}</h5>
                        <span
                          v-if="queue.type === 'COLLABORATOR'"
                          class="queue-row-badge queue-row-badge-collaborator"
                        >
                          <i class="bi bi-person-badge"></i>
                          {{ $t('collaboratorQueuesView.dedicated') }}
                        </span>
                      </div>
                    </div>
                    <div class="queue-row-metrics">
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-pending">
                          <i class="bi bi-clock-history"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">Checkin</div>
                          <div class="queue-metric-value queue-metric-value-pending">
                            {{ getQueueMetrics(queue.id).pending }}
                          </div>
                        </div>
                      </div>
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-processing">
                          <i class="bi bi-play-circle-fill"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">En Atendimento</div>
                          <div class="queue-metric-value queue-metric-value-processing">
                            {{ getQueueMetrics(queue.id).processing }}
                          </div>
                        </div>
                      </div>
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-terminated">
                          <i class="bi bi-check-circle-fill"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">Checkout</div>
                          <div class="queue-metric-value queue-metric-value-terminated">
                            {{ getQueueMetrics(queue.id).terminated }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="queue-row-footer">
                      <div class="queue-row-status">
                        <span
                          :class="`queue-status-indicator queue-status-${
                            queue.active ? 'active' : 'inactive'
                          }`"
                        ></span>
                        <span class="queue-status-text">{{
                          queue.active
                            ? $t('collaboratorQueuesView.active')
                            : $t('collaboratorQueuesView.inactive')
                        }}</span>
                      </div>
                      <div class="queue-row-action">
                        <i class="bi bi-arrow-right-circle"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div v-if="!isActiveCommerce() && !loading">
            <Message
              :title="$t('collaboratorQueuesView.message.1.title')"
              :content="$t('collaboratorQueuesView.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="commerce?.logo || state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('collaboratorQueuesView.welcome')"
          :toggles="state.toggles"
          component-name="collaboratorQueuesView"
          @go-back="goBack"
        />
        <div v-if="(!commerce || !commerce.id) && !loading" class="control-box">
          <Message
            :title="$t('businessQueuesAdmin.message.4.title')"
            :content="$t('businessQueuesAdmin.message.4.content')"
          />
        </div>
        <div v-if="!isActiveModules() && !loading">
          <Message
            :title="$t('collaboratorQueuesView.message.2.title')"
            :content="$t('collaboratorQueuesView.message.2.content')"
          />
        </div>
        <div id="queues" v-if="isActiveModules() && !loading">
          <div v-if="isActiveCommerce()">
            <div class="choose-attention">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div class="queues-rows">
              <template v-for="queue in sortedQueues">
                <div
                  v-if="queue && queue.active && queue.id"
                  :key="queue.id"
                  class="queue-row-modern"
                  :class="{
                    'queue-row-dedicated': isDedicatedQueue(queue),
                    'queue-row-compact': !isDedicatedQueue(queue),
                    'queue-row-high-priority': getQueueMetrics(queue.id).priority === 'high',
                    'queue-row-medium-priority': getQueueMetrics(queue.id).priority === 'medium',
                    'queue-row-low-priority': getQueueMetrics(queue.id).priority === 'low',
                  }"
                >
                  <div v-if="captchaEnabled === true">
                    <VueRecaptcha
                      :sitekey="siteKey"
                      @verify="validateCaptchaOk"
                      @error="validateCaptchaError"
                    >
                      <div class="queue-row-content" @click="getQueue(queue)">
                        <div class="queue-row-header">
                          <div class="queue-row-icon-wrapper">
                            <i
                              v-if="queue.type === 'COLLABORATOR'"
                              class="bi bi-person-fill queue-row-icon"
                            ></i>
                            <i v-else class="bi bi-people-fill queue-row-icon"></i>
                          </div>
                          <div class="queue-row-title-section">
                            <h5 class="queue-row-title">{{ queue.name }}</h5>
                            <span
                              v-if="queue.type === 'COLLABORATOR'"
                              class="queue-row-badge queue-row-badge-collaborator"
                            >
                              <i class="bi bi-person-badge"></i>
                              {{ $t('collaboratorQueuesView.dedicated') }}
                            </span>
                          </div>
                        </div>
                        <div class="queue-row-metrics">
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-pending">
                              <i class="bi bi-clock-history"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">
                                Checkin
                                <span
                                  class="spy-live-indicator"
                                  title="Actualización en tiempo real"
                                >
                                  <span class="spy-live-dot"></span>
                                </span>
                              </div>
                              <div class="queue-metric-value queue-metric-value-pending">
                                {{ getQueueMetrics(queue.id).pending }}
                              </div>
                            </div>
                          </div>
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-processing">
                              <i class="bi bi-play-circle-fill"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">En Atendimento</div>
                              <div class="queue-metric-value queue-metric-value-processing">
                                {{ getQueueMetrics(queue.id).processing }}
                              </div>
                            </div>
                          </div>
                          <div class="queue-metric-item">
                            <div class="queue-metric-icon queue-metric-terminated">
                              <i class="bi bi-check-circle-fill"></i>
                            </div>
                            <div class="queue-metric-content">
                              <div class="queue-metric-label">Checkout</div>
                              <div class="queue-metric-value queue-metric-value-terminated">
                                {{ getQueueMetrics(queue.id).terminated }}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="queue-row-footer">
                          <div class="queue-row-status">
                            <span
                              :class="`queue-status-indicator queue-status-${
                                queue.active ? 'active' : 'inactive'
                              }`"
                            ></span>
                            <span class="queue-status-text">{{
                              queue.active
                                ? $t('collaboratorQueuesView.active')
                                : $t('collaboratorQueuesView.inactive')
                            }}</span>
                          </div>
                          <div class="queue-row-action">
                            <i class="bi bi-arrow-right-circle"></i>
                          </div>
                        </div>
                      </div>
                    </VueRecaptcha>
                  </div>
                  <div v-else class="queue-row-content" @click="getQueue(queue)">
                    <div class="queue-row-header">
                      <div class="queue-row-icon-wrapper">
                        <i
                          v-if="queue.type === 'COLLABORATOR'"
                          class="bi bi-person-fill queue-row-icon"
                        ></i>
                        <i v-else class="bi bi-people-fill queue-row-icon"></i>
                      </div>
                      <div class="queue-row-title-section">
                        <h5 class="queue-row-title">{{ queue.name }}</h5>
                        <span
                          v-if="queue.type === 'COLLABORATOR'"
                          class="queue-row-badge queue-row-badge-collaborator"
                        >
                          <i class="bi bi-person-badge"></i>
                          {{ $t('collaboratorQueuesView.dedicated') }}
                        </span>
                      </div>
                    </div>
                    <div class="queue-row-metrics">
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-pending">
                          <i class="bi bi-clock-history"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">Checkin</div>
                          <div class="queue-metric-value queue-metric-value-pending">
                            {{ getQueueMetrics(queue.id).pending }}
                          </div>
                        </div>
                      </div>
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-processing">
                          <i class="bi bi-play-circle-fill"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">En Atendimento</div>
                          <div class="queue-metric-value queue-metric-value-processing">
                            {{ getQueueMetrics(queue.id).processing }}
                          </div>
                        </div>
                      </div>
                      <div class="queue-metric-item">
                        <div class="queue-metric-icon queue-metric-terminated">
                          <i class="bi bi-check-circle-fill"></i>
                        </div>
                        <div class="queue-metric-content">
                          <div class="queue-metric-label">Checkout</div>
                          <div class="queue-metric-value queue-metric-value-terminated">
                            {{ getQueueMetrics(queue.id).terminated }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="queue-row-footer">
                      <div class="queue-row-status">
                        <span
                          :class="`queue-status-indicator queue-status-${
                            queue.active ? 'active' : 'inactive'
                          }`"
                        ></span>
                        <span class="queue-status-text">{{
                          queue.active
                            ? $t('collaboratorQueuesView.active')
                            : $t('collaboratorQueuesView.inactive')
                        }}</span>
                      </div>
                      <div class="queue-row-action">
                        <i class="bi bi-arrow-right-circle"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div v-if="!isActiveCommerce() && !loading">
            <Message
              :title="$t('collaboratorQueuesView.message.1.title')"
              :content="$t('collaboratorQueuesView.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-top: 1rem;
  padding-bottom: 1rem;
  margin-top: 0;
  margin-bottom: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: 0.01em;
  text-align: center;
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

.indicator {
  font-size: 0.7rem;
}

/* Modern Queue Rows Layout */
.queues-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0;
}

/* Queue Row Modern Design */
.queue-row-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  border: 2px solid rgba(169, 169, 169, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

/* Dedicated queue (collaborator's queue) - keeps full padding */
.queue-row-modern.queue-row-dedicated {
  padding: 1rem 1.25rem;
  margin-bottom: 0.75rem;
}

/* Compact queue (other queues) - very reduced vertical padding */
.queue-row-modern.queue-row-compact {
  padding: 0.25rem 1.25rem;
}

/* Reduce internal element sizes for compact queues */
.queue-row-modern.queue-row-compact .queue-row-icon-wrapper {
  width: 36px;
  height: 36px;
}

.queue-row-modern.queue-row-compact .queue-row-icon {
  font-size: 1.2rem;
}

.queue-row-modern.queue-row-compact .queue-row-title {
  font-size: 0.95rem;
  margin: 0 0 0.2rem 0;
}

.queue-row-modern.queue-row-compact .queue-row-metrics {
  padding: 0.4rem 0.75rem;
}

.queue-row-modern.queue-row-compact .queue-metric-item {
  padding: 0.35rem 0.6rem;
  min-width: 110px;
}

.queue-row-modern.queue-row-compact .queue-metric-icon {
  width: 28px;
  height: 28px;
  font-size: 0.9rem;
}

.queue-row-modern.queue-row-compact .queue-metric-value {
  font-size: 1rem;
}

.queue-row-modern.queue-row-compact .queue-metric-label {
  font-size: 0.45rem;
}

.queue-row-modern::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 5px;
  height: 100%;
  background: var(--queue-priority-color, #004aad);
  transition: all 0.4s ease;
  z-index: 1;
}

.queue-row-modern::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(0, 74, 173, 0.05) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.queue-row-modern:hover {
  transform: translateX(6px) scale(1.01);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.3);
}

.queue-row-modern:hover::after {
  opacity: 1;
}

.queue-row-modern.queue-row-high-priority {
  --queue-priority-color: #dc3545;
  border-left: 5px solid #dc3545;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 245, 245, 0.98) 100%);
}

.queue-row-modern.queue-row-medium-priority {
  --queue-priority-color: #ffc107;
  border-left: 5px solid #ffc107;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 251, 245, 0.98) 100%);
}

.queue-row-modern.queue-row-low-priority {
  --queue-priority-color: #28a745;
  border-left: 5px solid #28a745;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 255, 248, 0.98) 100%);
}

.queue-row-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5rem;
  position: relative;
  z-index: 2;
  cursor: pointer;
}

.queue-row-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 0 0 auto;
  min-width: 200px;
}

.queue-row-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.15);
  transition: all 0.3s ease;
}

.queue-row-modern:hover .queue-row-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.25);
}

.queue-row-icon {
  font-size: 1.5rem;
  color: #004aad;
  transition: all 0.3s ease;
}

.queue-row-modern:hover .queue-row-icon {
  color: #00c2cb;
}

.queue-row-title-section {
  flex: 1;
  min-width: 0;
}

.queue-row-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 74, 173, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-row-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow: 0 1px 3px rgba(0, 74, 173, 0.12);
}

.queue-row-badge-collaborator {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.2);
}

.queue-row-metrics {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  border-left: 1px solid rgba(169, 169, 169, 0.1);
  border-right: 1px solid rgba(169, 169, 169, 0.1);
  background: linear-gradient(135deg, rgba(248, 249, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
  border-radius: 8px;
  flex: 1 1 auto;
  justify-content: center;
}

.queue-metric-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 7px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.6);
  flex: 0 0 auto;
  min-width: 120px;
}

.queue-metric-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.queue-metric-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.queue-metric-item:hover .queue-metric-icon {
  transform: scale(1.1);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.queue-metric-pending {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.2) 0%, rgba(255, 193, 7, 0.2) 100%);
  color: #ff9800;
  border: 2px solid rgba(255, 152, 0, 0.3);
}

.queue-metric-processing {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.2) 0%, rgba(0, 123, 255, 0.2) 100%);
  color: #00c2cb;
  border: 2px solid rgba(0, 194, 203, 0.3);
}

.queue-metric-terminated {
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.2) 0%, rgba(32, 201, 151, 0.2) 100%);
  color: #28a745;
  border: 2px solid rgba(40, 167, 69, 0.3);
}

.queue-metric-time {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.2) 0%, rgba(255, 193, 7, 0.2) 100%);
  color: #f9c322;
  border: 2px solid rgba(249, 195, 34, 0.3);
}

.queue-metric-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.queue-metric-label {
  font-size: 0.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 0.15rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: nowrap;
  line-height: 1.2;
  min-width: 0;
  max-width: 100%;
}

.ai-badge {
  display: inline-block;
  color: #ffc107;
  font-size: 0.7rem;
  cursor: help;
  vertical-align: middle;
  animation: sparkle 2s ease-in-out infinite;
}

.ai-badge i {
  filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.5));
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.queue-metric-value {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.queue-metric-value-pending {
  color: #ff9800;
  background: linear-gradient(135deg, #ff9800 0%, #ff6f00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-metric-value-processing {
  color: #00c2cb;
  background: linear-gradient(135deg, #00c2cb 0%, #007bff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-metric-value-terminated {
  color: #28a745;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-metric-value-time {
  color: #f9c322;
  background: linear-gradient(135deg, #f9c322 0%, #ff9800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-row-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 0 0 auto;
  min-width: 180px;
  padding-left: 1rem;
  border-left: 1px solid rgba(169, 169, 169, 0.1);
}

.queue-row-status {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.queue-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2);
}

.queue-status-active {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  animation: pulse-dot 2s ease-in-out infinite;
}

.queue-status-inactive {
  background: #6c757d;
  box-shadow: 0 0 0 3px rgba(108, 117, 125, 0.2);
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.2);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 6px rgba(40, 167, 69, 0.1);
  }
}

.queue-status-text {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.queue-row-action {
  font-size: 1.25rem;
  color: #004aad;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
}

.queue-row-modern:hover .queue-row-action {
  transform: translateX(6px) scale(1.1);
  color: #00c2cb;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.2) 100%);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.2);
}

/* Live Indicator Styles */
.spy-live-indicator {
  display: inline-flex;
  align-items: center;
  position: relative;
  margin-left: 0.3rem;
  vertical-align: middle;
}

.spy-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #28a745;
  animation: pulse-live 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
  display: inline-block;
}

@keyframes pulse-live {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 4px rgba(40, 167, 69, 0);
    opacity: 0.8;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
    opacity: 1;
  }
}

/* Responsive adjustments - Mobile: Keep row style but more compact */
@media (max-width: 768px) {
  .queues-rows {
    gap: 0.5rem;
  }

  .queue-row-modern {
    padding: 0.5rem 0.75rem;
    border-radius: 12px;
  }

  .queue-row-modern.queue-row-dedicated {
    padding: 0.75rem 0.75rem;
    margin-bottom: 0.5rem;
  }

  .queue-row-modern.queue-row-compact {
    padding: 0.2rem 0.75rem;
  }

  .queue-row-content {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: nowrap;
  }

  .queue-row-header {
    min-width: 100%;
    width: 100%;
    flex: 0 0 100%;
    justify-content: center;
    text-align: center;
    gap: 0.5rem;
  }

  .queue-row-title-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .queue-row-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .queue-row-modern.queue-row-compact .queue-row-icon-wrapper {
    width: 28px;
    height: 28px;
  }

  .queue-row-icon {
    font-size: 1rem;
  }

  .queue-row-modern.queue-row-compact .queue-row-icon {
    font-size: 0.9rem;
  }

  .queue-row-title {
    font-size: 0.9rem;
    margin: 0;
  }

  .queue-row-modern.queue-row-compact .queue-row-title {
    font-size: 0.85rem;
  }

  .queue-row-badge {
    font-size: 0.5rem;
    padding: 0.15rem 0.4rem;
  }

  .queue-row-metrics {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border-left: none;
    border-right: none;
    border-top: 1px solid rgba(169, 169, 169, 0.1);
    border-bottom: 1px solid rgba(169, 169, 169, 0.1);
    width: 100%;
    flex: 0 0 auto;
    justify-content: center;
  }

  .queue-row-modern.queue-row-compact .queue-row-metrics {
    padding: 0.3rem 0.4rem;
    gap: 0.4rem;
  }

  .queue-metric-item {
    min-width: auto;
    flex: 0 0 auto;
    padding: 0.3rem 0.5rem;
    gap: 0.4rem;
  }

  .queue-row-modern.queue-row-compact .queue-metric-item {
    padding: 0.25rem 0.4rem;
    min-width: 90px;
  }

  .queue-metric-icon {
    width: 24px;
    height: 24px;
    font-size: 0.85rem;
  }

  .queue-row-modern.queue-row-compact .queue-metric-icon {
    width: 22px;
    height: 22px;
    font-size: 0.8rem;
  }

  .queue-metric-value {
    font-size: 0.95rem;
  }

  .queue-row-modern.queue-row-compact .queue-metric-value {
    font-size: 0.9rem;
  }

  .queue-metric-label {
    font-size: 0.4rem;
  }

  .queue-row-modern.queue-row-compact .queue-metric-label {
    font-size: 0.38rem;
  }

  .queue-row-footer {
    min-width: 100%;
    width: 100%;
    flex: 0 0 100%;
    padding-left: 0;
    padding-top: 0.5rem;
    border-left: none;
    border-top: 1px solid rgba(169, 169, 169, 0.1);
    justify-content: center;
    gap: 0.5rem;
  }

  .queue-row-status {
    justify-content: center;
  }

  .queue-status-text {
    font-size: 0.6rem;
  }

  .queue-row-action {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
}

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
</style>
