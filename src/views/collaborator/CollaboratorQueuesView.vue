<script>
import { ref, reactive, onBeforeMount, watch, computed, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import { getGroupedQueueByCommerceId, getEstimatedWaitTime, getAverageAttentionDuration } from '../../application/services/queue';
import { getCollaboratorById, updateModule } from '../../application/services/collaborator';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { updatedAvailableAttentionsByCommerce } from '../../application/firebase';
import { getQueueByCommerce } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import { getProcessingAttentionDetailsByQueue } from '../../application/services/attention';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
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
      queue: {},
      queues: [],
      groupedQueues: [],
      collaborator: {},
      modules: ref({}),
      activeCommerce: false,
      captcha: false,
      queueStatus: {},
      queueProcessingStatus: {},
      toggles: {},
      queueIntelligentEstimation: {}, // Track which queues use intelligent estimation
      queueEstimatedTimes: {}, // Cache for estimated wait times
      queueAverageDurations: {}, // Cache for average attention durations
      queueAverageDurationsIntelligent: {}, // Track which queues use intelligent estimation for average
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
            if (attentionsWrapper.value && attentionsWrapper.value.value) {
              await checkQueueStatus(attentionsWrapper.value);
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
          if (attentionsWrapper.value && attentionsWrapper.value.value) {
            await checkQueueStatus(attentionsWrapper.value);
          }
        }
      }
    );

    const checkQueueStatus = async attentionsRef => {
      // Ensure we have queues loaded first
      if (!state.queues || state.queues.length === 0) {
        return;
      }

      // Ensure we have a valid ref with a value
      if (!attentionsRef) {
        initializeQueueStatus();
        return;
      }

      // Get the value from ref, ensuring it's an array
      const attentionsArray =
        attentionsRef.value && Array.isArray(attentionsRef.value) ? attentionsRef.value : [];

      // Always initialize all queues to 0 first
      initializeQueueStatus();

      // If no attentions, all queues are already set to 0
      if (attentionsArray.length === 0) {
        return;
      }

      try {
        const filteredAttentionsByQueue = attentionsArray.reduce((acc, attention) => {
          if (attention && attention.queueId) {
            const queueId = attention.queueId;
            if (!acc[queueId]) {
              acc[queueId] = [];
            }
            acc[queueId].push(attention);
          }
          return acc;
        }, {});

        // Update only queues that have attentions
        state.queues.forEach(queue => {
          if (queue && queue.id) {
            // Always update average duration (independent of pending count)
            updateQueueAverageDuration(queue.id);

            if (filteredAttentionsByQueue[queue.id]) {
              const attentionsCount = filteredAttentionsByQueue[queue.id].length;
              state.queueStatus[queue.id] = attentionsCount;
              // Update estimated time with intelligent estimation
              updateQueueEstimatedTime(queue.id, attentionsCount);
            } else {
              // Explicitly set to 0 if no attentions for this queue
              state.queueStatus[queue.id] = 0;
              updateQueueEstimatedTime(queue.id, 0);
            }
            // Load processing attentions count for each queue (async, but don't await)
            getProcessingAttentionDetailsByQueue(queue.id)
              .then(processingAttentions => {
                state.queueProcessingStatus[queue.id] = processingAttentions?.length || 0;
              })
              .catch(() => {
                state.queueProcessingStatus[queue.id] = 0;
              });
          }
        });
      } catch (error) {
        initializeQueueStatus();
      }
    };

    // Get attentions ref - this is a reactive ref that Firebase will update
    // It always starts as an empty array and gets populated by Firebase snapshot
    // Use a wrapper ref so we can update it when commerce changes
    const attentionsWrapper = ref(null);
    let attentions = null;
    const attentionsUnsubscribe = null;

    // Initialize attentions listener with commerce from store or route
    const initializeAttentionsListener = commerceId => {
      if (!commerceId) {
        // If no commerce, clear attentions and reset status
        attentionsWrapper.value = null;
        initializeQueueStatus();
        return;
      }

      // Clean up previous listener if exists
      if (attentions && attentions._unsubscribe) {
        attentions._unsubscribe();
        attentions = null;
      }

      // Reset queue status before creating new listener
      initializeQueueStatus();

      // Create new listener
      attentions = updatedAvailableAttentionsByCommerce(commerceId);
      attentionsWrapper.value = attentions;

      // Force initial check after a brief moment to allow Firebase to initialize
      // The watch will handle updates, but we ensure initial state is correct
      setTimeout(() => {
        if (attentionsWrapper.value && attentionsWrapper.value.value) {
          checkQueueStatus(attentionsWrapper.value);
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
      // Trigger checkQueueStatus if listener is already initialized
      if (attentionsWrapper.value && attentionsWrapper.value.value) {
        await checkQueueStatus(attentionsWrapper.value);
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
          }
        });
      }
    };

    // Function to update average attention duration for a queue
    const updateQueueAverageDuration = async (queueId) => {
      if (!queueId) return;

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
          } else {
            state.queueAverageDurations[queueId] = 'N/A';
            state.queueAverageDurationsIntelligent[queueId] = false;
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
      }
    };

    // Function to update estimated time for a queue
    const updateQueueEstimatedTime = async (queueId, pendingCount) => {
      if (!queueId) return;

      let estimatedMinutes = 0;
      let usingIntelligentEstimation = false;

      if (pendingCount > 0) {
        try {
          const intelligentEstimation = await getEstimatedWaitTime(queueId, pendingCount, 'p75');

          if (intelligentEstimation && intelligentEstimation.estimatedTime) {
            // Parse HH:MM format to minutes
            const [hours, minutes] = intelligentEstimation.estimatedTime.split(':').map(Number);
            estimatedMinutes = hours * 60 + minutes;
            usingIntelligentEstimation = intelligentEstimation.usingIntelligentEstimation || false;
          } else {
            // Fallback: use queue's estimatedTime if available
            const queue = state.queues.find(q => q.id === queueId);
            if (queue && queue.estimatedTime) {
              estimatedMinutes = pendingCount * queue.estimatedTime;
            } else {
              // Final fallback: 5 minutes per pending attention
              estimatedMinutes = pendingCount * 5;
            }
          }
        } catch (error) {
          console.warn('Failed to get intelligent estimation for queue', queueId, error);
          // Use queue's estimatedTime as fallback
          const queue = state.queues.find(q => q.id === queueId);
          if (queue && queue.estimatedTime) {
            estimatedMinutes = pendingCount * queue.estimatedTime;
          } else {
            // Final fallback: 5 minutes per pending attention
            estimatedMinutes = pendingCount * 5;
          }
        }
      } else {
        // No pending attentions - show 0 min
        estimatedMinutes = 0;
      }

      // Format display
      const estimatedHours = Math.floor(estimatedMinutes / 60);
      const estimatedMins = Math.floor(estimatedMinutes % 60);
      let estimatedDisplay = '';
      if (estimatedHours > 0) {
        estimatedDisplay = `${estimatedHours}h ${estimatedMins}min`;
      } else {
        estimatedDisplay = `${estimatedMins} min`;
      }

      // Update reactive state - always update, even if 0
      state.queueEstimatedTimes[queueId] = estimatedDisplay;
      state.queueIntelligentEstimation[queueId] = usingIntelligentEstimation;
    };

    // Function to get queue metrics - accessing reactive state directly
    const getQueueMetrics = (queueId) => {
      // Safety check: if queueId is not provided or invalid, return default values
      if (!queueId) {
        return {
          pending: 0,
          processing: 0,
          total: 0,
          estimatedWaitTime: '0 min',
          priority: 'low',
          priorityColor: '#28a745',
          usingIntelligentEstimation: false,
        };
      }

      const pending = state.queueStatus[queueId] || 0;
      const processing = state.queueProcessingStatus[queueId] || 0;
      const total = pending + processing;

      // Get estimated time from reactive state (updated asynchronously)
      const estimatedWaitTime = state.queueEstimatedTimes[queueId] || '0 min';
      const usingIntelligentEstimation = state.queueIntelligentEstimation[queueId] || false;

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
        total,
        estimatedWaitTime,
        priority,
        priorityColor,
        usingIntelligentEstimation,
      };
    };

    // Watch attentions ref value for changes
    // Watch the wrapper so we can track when the ref itself changes
    watch(
      () => {
        // Safely access the current attentions ref via wrapper
        try {
          const currentAttentionsRef = attentionsWrapper.value;
          if (
            currentAttentionsRef &&
            currentAttentionsRef.value !== undefined &&
            currentAttentionsRef.value !== null
          ) {
            // Ensure it's always an array and return a serializable value for comparison
            const array = Array.isArray(currentAttentionsRef.value)
              ? currentAttentionsRef.value
              : [];
            // Return a string representation for deep comparison
            return JSON.stringify(array.map(a => ({ id: a.id, queueId: a.queueId })));
          }
        } catch (error) {
          // Error accessing attentions.value
        }
        return '[]';
      },
      async (newValue, oldValue) => {
        // Only process if value actually changed
        if (newValue === oldValue && oldValue !== undefined) {
          return;
        }

        // Get the actual array from the ref
        const currentAttentionsRef = attentionsWrapper.value;
        if (!currentAttentionsRef) {
          initializeQueueStatus();
          return;
        }

        // Always call checkQueueStatus - it will handle empty arrays correctly
        await checkQueueStatus(currentAttentionsRef);
      },
      { immediate: true }
    );

    // Cleanup listener on component unmount
    onUnmounted(() => {
      if (attentions && attentions._unsubscribe) {
        attentions._unsubscribe();
      }
    });

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
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="commerce?.logo" :loading="loading"></CommerceLogo>
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
            <div class="choose-attention mb-4">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div class="queues-grid">
              <template v-for="queue in state.queues">
                <div
                  v-if="queue && queue.active && queue.id"
                  :key="queue.id"
                  class="queue-card-modern"
                :class="{
                  'queue-card-high-priority': getQueueMetrics(queue.id).priority === 'high',
                  'queue-card-medium-priority': getQueueMetrics(queue.id).priority === 'medium',
                  'queue-card-low-priority': getQueueMetrics(queue.id).priority === 'low',
                }"
              >
                <div v-if="captchaEnabled === true">
                  <VueRecaptcha
                    :sitekey="siteKey"
                    @verify="validateCaptchaOk"
                    @error="validateCaptchaError"
                  >
                    <div class="queue-card-content" @click="getQueue(queue)">
                      <div class="queue-card-header">
                        <div class="queue-card-icon-wrapper">
                          <i
                            v-if="queue.type === 'COLLABORATOR'"
                            class="bi bi-person-fill queue-card-icon"
                          ></i>
                          <i v-else class="bi bi-people-fill queue-card-icon"></i>
                        </div>
                        <div class="queue-card-title-section">
                          <h5 class="queue-card-title">{{ queue.name }}</h5>
                          <span
                            v-if="queue.type === 'COLLABORATOR'"
                            class="queue-card-badge queue-card-badge-collaborator"
                          >
                            <i class="bi bi-person-badge"></i>
                            {{ $t('collaboratorQueuesView.dedicated') }}
                          </span>
                        </div>
                      </div>
                      <div class="queue-card-metrics">
                        <div class="queue-metric-item">
                          <div class="queue-metric-icon queue-metric-pending">
                            <i class="bi bi-clock-history"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              {{ $t('collaboratorQueuesView.pending') }}
                              <span class="spy-live-indicator" title="Actualización en tiempo real">
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
                            <div class="queue-metric-label">{{ $t('collaboratorQueuesView.processing') }}</div>
                            <div class="queue-metric-value queue-metric-value-processing">
                              {{ getQueueMetrics(queue.id).processing }}
                            </div>
                          </div>
                        </div>
                        <!-- Average Attention Duration - Always shown -->
                        <div class="queue-metric-item queue-metric-estimated">
                          <div class="queue-metric-icon queue-metric-time">
                            <i class="bi bi-clock-history"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              Tempo Médio
                              <span
                                v-if="state.queueAverageDurationsIntelligent[queue.id]"
                                v-b-tooltip.hover
                                :title="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                                class="ai-badge ms-1"
                              >
                                <i class="bi bi-stars"></i>
                              </span>
                            </div>
                            <div class="queue-metric-value queue-metric-value-time">
                              {{ state.queueAverageDurations[queue.id] || 'N/A' }}
                            </div>
                          </div>
                        </div>
                        <!-- Estimated Wait Time - Only shown when there are pending attentions -->
                        <div
                          v-if="getQueueMetrics(queue.id).pending > 0"
                          class="queue-metric-item queue-metric-estimated"
                        >
                          <div class="queue-metric-icon queue-metric-time">
                            <i class="bi bi-stopwatch"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              {{ $t('collaboratorQueuesView.estimatedWait') }}
                              <span
                                v-if="getQueueMetrics(queue.id).usingIntelligentEstimation"
                                v-b-tooltip.hover
                                :title="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                                class="ai-badge ms-1"
                              >
                                <i class="bi bi-stars"></i>
                              </span>
                            </div>
                            <div class="queue-metric-value queue-metric-value-time">
                              {{ getQueueMetrics(queue.id).estimatedWaitTime }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="queue-card-footer">
                        <div class="queue-card-status">
                          <span
                            :class="`queue-status-indicator queue-status-${
                              queue.active ? 'active' : 'inactive'
                            }`"
                          ></span>
                          <span class="queue-status-text">{{
                            queue.active ? $t('collaboratorQueuesView.active') : $t('collaboratorQueuesView.inactive')
                          }}</span>
                        </div>
                        <div class="queue-card-action">
                          <i class="bi bi-arrow-right-circle"></i>
                        </div>
                      </div>
                    </div>
                  </VueRecaptcha>
                </div>
                <div v-else class="queue-card-content" @click="getQueue(queue)">
                  <div class="queue-card-header">
                    <div class="queue-card-icon-wrapper">
                      <i
                        v-if="queue.type === 'COLLABORATOR'"
                        class="bi bi-person-fill queue-card-icon"
                      ></i>
                      <i v-else class="bi bi-people-fill queue-card-icon"></i>
                    </div>
                    <div class="queue-card-title-section">
                      <h5 class="queue-card-title">{{ queue.name }}</h5>
                      <span
                        v-if="queue.type === 'COLLABORATOR'"
                        class="queue-card-badge queue-card-badge-collaborator"
                      >
                        <i class="bi bi-person-badge"></i>
                        {{ $t('collaboratorQueuesView.dedicated') }}
                      </span>
                    </div>
                  </div>
                  <div class="queue-card-metrics">
                    <div class="queue-metric-item">
                      <div class="queue-metric-icon queue-metric-pending">
                        <i class="bi bi-clock-history"></i>
                      </div>
                      <div class="queue-metric-content">
                        <div class="queue-metric-label">{{ $t('collaboratorQueuesView.pending') }}</div>
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
                        <div class="queue-metric-label">{{ $t('collaboratorQueuesView.processing') }}</div>
                        <div class="queue-metric-value queue-metric-value-processing">
                          {{ getQueueMetrics(queue.id).processing }}
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="getQueueMetrics(queue.id).pending > 0"
                      class="queue-metric-item queue-metric-estimated"
                    >
                      <div class="queue-metric-icon queue-metric-time">
                        <i class="bi bi-stopwatch"></i>
                      </div>
                      <div class="queue-metric-content">
                        <div class="queue-metric-label">
                          {{ $t('collaboratorQueuesView.estimatedWait') }}
                          <Popper
                            v-if="getQueueMetrics(queue.id).usingIntelligentEstimation"
                            :class="'dark'"
                            arrow
                            hover
                            disable-click-away
                            :content="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                          >
                            <span class="ai-badge ms-1">
                              <i class="bi bi-stars"></i>
                            </span>
                          </Popper>
                        </div>
                        <div class="queue-metric-value queue-metric-value-time">
                          {{ getQueueMetrics(queue.id).estimatedWaitTime }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="queue-card-footer">
                    <div class="queue-card-status">
                      <span
                        :class="`queue-status-indicator queue-status-${
                          queue.active ? 'active' : 'inactive'
                        }`"
                      ></span>
                      <span class="queue-status-text">{{
                        queue.active ? $t('collaboratorQueuesView.active') : $t('collaboratorQueuesView.inactive')
                      }}</span>
                    </div>
                    <div class="queue-card-action">
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
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || commerce?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce?.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`collaboratorQueuesView.welcome`)"
              :toggles="state.toggles"
              component-name="collaboratorQueuesView"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
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
            <div class="choose-attention mb-4">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div class="queues-grid">
              <template v-for="queue in state.queues">
                <div
                  v-if="queue && queue.active && queue.id"
                  :key="queue.id"
                  class="queue-card-modern"
                :class="{
                  'queue-card-high-priority': getQueueMetrics(queue.id).priority === 'high',
                  'queue-card-medium-priority': getQueueMetrics(queue.id).priority === 'medium',
                  'queue-card-low-priority': getQueueMetrics(queue.id).priority === 'low',
                }"
              >
                <div v-if="captchaEnabled === true">
                  <VueRecaptcha
                    :sitekey="siteKey"
                    @verify="validateCaptchaOk"
                    @error="validateCaptchaError"
                  >
                    <div class="queue-card-content" @click="getQueue(queue)">
                      <div class="queue-card-header">
                        <div class="queue-card-icon-wrapper">
                          <i
                            v-if="queue.type === 'COLLABORATOR'"
                            class="bi bi-person-fill queue-card-icon"
                          ></i>
                          <i v-else class="bi bi-people-fill queue-card-icon"></i>
                        </div>
                        <div class="queue-card-title-section">
                          <h5 class="queue-card-title">{{ queue.name }}</h5>
                          <span
                            v-if="queue.type === 'COLLABORATOR'"
                            class="queue-card-badge queue-card-badge-collaborator"
                          >
                            <i class="bi bi-person-badge"></i>
                            {{ $t('collaboratorQueuesView.dedicated') }}
                          </span>
                        </div>
                      </div>
                      <div class="queue-card-metrics">
                        <div class="queue-metric-item">
                          <div class="queue-metric-icon queue-metric-pending">
                            <i class="bi bi-clock-history"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              {{ $t('collaboratorQueuesView.pending') }}
                              <span class="spy-live-indicator" title="Actualización en tiempo real">
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
                            <div class="queue-metric-label">{{ $t('collaboratorQueuesView.processing') }}</div>
                            <div class="queue-metric-value queue-metric-value-processing">
                              {{ getQueueMetrics(queue.id).processing }}
                            </div>
                          </div>
                        </div>
                        <!-- Average Attention Duration - Always shown -->
                        <div class="queue-metric-item queue-metric-estimated">
                          <div class="queue-metric-icon queue-metric-time">
                            <i class="bi bi-clock-history"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              Tempo Médio
                              <span
                                v-if="state.queueAverageDurationsIntelligent[queue.id]"
                                v-b-tooltip.hover
                                :title="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                                class="ai-badge ms-1"
                              >
                                <i class="bi bi-stars"></i>
                              </span>
                            </div>
                            <div class="queue-metric-value queue-metric-value-time">
                              {{ state.queueAverageDurations[queue.id] || 'N/A' }}
                            </div>
                          </div>
                        </div>
                        <!-- Estimated Wait Time - Only shown when there are pending attentions -->
                        <div
                          v-if="getQueueMetrics(queue.id).pending > 0"
                          class="queue-metric-item queue-metric-estimated"
                        >
                          <div class="queue-metric-icon queue-metric-time">
                            <i class="bi bi-stopwatch"></i>
                          </div>
                          <div class="queue-metric-content">
                            <div class="queue-metric-label">
                              {{ $t('collaboratorQueuesView.estimatedWait') }}
                              <span
                                v-if="getQueueMetrics(queue.id).usingIntelligentEstimation"
                                v-b-tooltip.hover
                                :title="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                                class="ai-badge ms-1"
                              >
                                <i class="bi bi-stars"></i>
                              </span>
                            </div>
                            <div class="queue-metric-value queue-metric-value-time">
                              {{ getQueueMetrics(queue.id).estimatedWaitTime }}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="queue-card-footer">
                        <div class="queue-card-status">
                          <span
                            :class="`queue-status-indicator queue-status-${
                              queue.active ? 'active' : 'inactive'
                            }`"
                          ></span>
                          <span class="queue-status-text">{{
                            queue.active ? $t('collaboratorQueuesView.active') : $t('collaboratorQueuesView.inactive')
                          }}</span>
                        </div>
                        <div class="queue-card-action">
                          <i class="bi bi-arrow-right-circle"></i>
                        </div>
                      </div>
                    </div>
                  </VueRecaptcha>
                </div>
                <div v-else class="queue-card-content" @click="getQueue(queue)">
                  <div class="queue-card-header">
                    <div class="queue-card-icon-wrapper">
                      <i
                        v-if="queue.type === 'COLLABORATOR'"
                        class="bi bi-person-fill queue-card-icon"
                      ></i>
                      <i v-else class="bi bi-people-fill queue-card-icon"></i>
                    </div>
                    <div class="queue-card-title-section">
                      <h5 class="queue-card-title">{{ queue.name }}</h5>
                      <span
                        v-if="queue.type === 'COLLABORATOR'"
                        class="queue-card-badge queue-card-badge-collaborator"
                      >
                        <i class="bi bi-person-badge"></i>
                        {{ $t('collaboratorQueuesView.dedicated') }}
                      </span>
                    </div>
                  </div>
                  <div class="queue-card-metrics">
                    <div class="queue-metric-item">
                      <div class="queue-metric-icon queue-metric-pending">
                        <i class="bi bi-clock-history"></i>
                      </div>
                      <div class="queue-metric-content">
                        <div class="queue-metric-label">{{ $t('collaboratorQueuesView.pending') }}</div>
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
                        <div class="queue-metric-label">{{ $t('collaboratorQueuesView.processing') }}</div>
                        <div class="queue-metric-value queue-metric-value-processing">
                          {{ getQueueMetrics(queue.id).processing }}
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="getQueueMetrics(queue.id).pending > 0"
                      class="queue-metric-item queue-metric-estimated"
                    >
                      <div class="queue-metric-icon queue-metric-time">
                        <i class="bi bi-stopwatch"></i>
                      </div>
                      <div class="queue-metric-content">
                        <div class="queue-metric-label">
                          {{ $t('collaboratorQueuesView.estimatedWait') }}
                          <Popper
                            v-if="getQueueMetrics(queue.id).usingIntelligentEstimation"
                            :class="'dark'"
                            arrow
                            hover
                            disable-click-away
                            :content="$t('collaboratorQueuesView.intelligentEstimationTooltip')"
                          >
                            <span class="ai-badge ms-1">
                              <i class="bi bi-stars"></i>
                            </span>
                          </Popper>
                        </div>
                        <div class="queue-metric-value queue-metric-value-time">
                          {{ getQueueMetrics(queue.id).estimatedWaitTime }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="queue-card-footer">
                    <div class="queue-card-status">
                      <span
                        :class="`queue-status-indicator queue-status-${
                          queue.active ? 'active' : 'inactive'
                        }`"
                      ></span>
                      <span class="queue-status-text">{{
                        queue.active ? $t('collaboratorQueuesView.active') : $t('collaboratorQueuesView.inactive')
                      }}</span>
                    </div>
                    <div class="queue-card-action">
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
  padding-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: 0.01em;
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

.indicator {
  font-size: 0.7rem;
}

/* Modern Queue Cards Grid */
.queues-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0;
}

/* Queue Card Modern Design */
.queue-card-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 14px;
  padding: 0.875rem 1rem;
  border: 2px solid rgba(169, 169, 169, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.queue-card-modern::before {
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

.queue-card-modern::after {
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

.queue-card-modern:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 6px 16px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.3);
}

.queue-card-modern:hover::after {
  opacity: 1;
}

.queue-card-modern.queue-card-high-priority {
  --queue-priority-color: #dc3545;
  border-left: 5px solid #dc3545;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 245, 245, 0.98) 100%);
}

.queue-card-modern.queue-card-medium-priority {
  --queue-priority-color: #ffc107;
  border-left: 5px solid #ffc107;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 251, 245, 0.98) 100%);
}

.queue-card-modern.queue-card-low-priority {
  --queue-priority-color: #28a745;
  border-left: 5px solid #28a745;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(245, 255, 248, 0.98) 100%);
}

.queue-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  position: relative;
  z-index: 2;
}

.queue-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.queue-card-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.15);
  transition: all 0.3s ease;
}

.queue-card-modern:hover .queue-card-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.25);
}

.queue-card-icon {
  font-size: 1.25rem;
  color: #004aad;
  transition: all 0.3s ease;
}

.queue-card-modern:hover .queue-card-icon {
  color: #00c2cb;
}

.queue-card-title-section {
  flex: 1;
  min-width: 0;
}

.queue-card-title {
  font-size: 1rem;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.9);
  margin: 0 0 0.35rem 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 74, 173, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-card-badge {
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

.queue-card-badge-collaborator {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.2);
}

.queue-card-metrics {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.6rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
  background: linear-gradient(135deg, rgba(248, 249, 250, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%);
  border-radius: 8px;
  margin: 0.15rem 0;
}

.queue-metric-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem;
  border-radius: 7px;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.6);
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

.queue-metric-time {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.2) 0%, rgba(255, 193, 7, 0.2) 100%);
  color: #f9c322;
  border: 2px solid rgba(249, 195, 34, 0.3);
}

.queue-metric-content {
  flex: 1;
  min-width: 0;
}

.queue-metric-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.15rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
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
  0%, 100% {
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

.queue-metric-value-time {
  color: #f9c322;
  background: linear-gradient(135deg, #f9c322 0%, #ff9800 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.queue-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
  margin-top: 0.1rem;
}

.queue-card-status {
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
  0%, 100% {
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

.queue-card-action {
  font-size: 1.25rem;
  color: #004aad;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
}

.queue-card-modern:hover .queue-card-action {
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .queues-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .queue-card-modern {
    padding: 0.875rem 1rem;
    border-radius: 14px;
  }

  .queue-card-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .queue-card-icon {
    font-size: 1.25rem;
  }

  .queue-card-title {
    font-size: 1rem;
  }

  .queue-metric-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .queue-metric-value {
    font-size: 1.15rem;
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
