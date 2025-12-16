<script>
import {
  ref,
  watch,
  reactive,
  onBeforeMount,
  onMounted,
  onUnmounted,
  nextTick,
  computed,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNextAvailableAttentionDetails,
  getAvailableAttentiosnByQueue,
  getProcessingAttentionDetailsByQueue,
  getAvailableAttentionDetailsByNumber,
  finishCancelledAttention,
} from '../../application/services/attention';
import { getCommerceById } from '../../application/services/commerce';
import { getEstimatedWaitTime } from '../../application/services/queue';
import { globalStore } from '../../stores/index';
import { attend } from '../../application/services/attention';
import {
  updatedQueues,
  updatedAttentionsByDateAndCommerceAndQueue,
} from '../../application/firebase';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import QueueAttentionDetails from '../../components/domain/QueueAttentionDetails.vue';
import AttentionNumber from '../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorQueueAttentions',
  components: {
    Message,
    CommerceLogo,
    QueueName,
    QueueAttentionDetails,
    AttentionNumber,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    Popper,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    const loading = ref(true);
    const alertError = ref('');

    const store = globalStore();

    // Use global commerce and module from store
    const globalCommerce = computed(() => store.getCurrentCommerce);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      queue: {},
      commerce: {},
      attention: {},
      user: {},
      toggles: {},
      pendingAttentions: [],
      queuePendingDetails: [],
      queueProcessingDetails: [],
      drawerOpen: false,
      usingIntelligentEstimation: false,
      intelligentEstimatedTime: null,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const queues = updatedQueues(id);

    const attentions = ref([]);
    attentions.value = updatedAttentionsByDateAndCommerceAndQueue(id);

    // Filter attentions by today's date
    const filterAttentionsByToday = attentions => {
      if (!attentions || !Array.isArray(attentions)) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      return attentions.filter(attention => {
        if (!attention.createdAt) return false;

        // Handle different date formats
        let attentionDate;
        try {
          if (attention.createdAt instanceof Date) {
            attentionDate = new Date(attention.createdAt);
          } else if (typeof attention.createdAt === 'string') {
            attentionDate = new Date(attention.createdAt);
          } else if (
            attention.createdAt.toDate &&
            typeof attention.createdAt.toDate === 'function'
          ) {
            // Firebase Timestamp
            attentionDate = attention.createdAt.toDate();
          } else if (attention.createdAt.seconds) {
            // Firebase Timestamp as object with seconds
            attentionDate = new Date(attention.createdAt.seconds * 1000);
          } else {
            return false;
          }

          // Check if date is valid
          if (isNaN(attentionDate.getTime())) {
            return false;
          }

          // Compare dates (only date, not time)
          const attentionDateOnly = new Date(attentionDate);
          attentionDateOnly.setHours(0, 0, 0, 0);

          return attentionDateOnly.getTime() === today.getTime();
        } catch (error) {
          return false;
        }
      });
    };

    const getQueueValues = async (queue, oldQueue) => {
      loading.value = true;
      state.queue = queue;
      store.setCurrentQueue(queue);
      if (queue !== undefined && queue.id !== undefined) {
        const allPendingDetails = await getAvailableAttentiosnByQueue(queue.id);
        const allProcessingDetails = await getProcessingAttentionDetailsByQueue(queue.id);

        // Filter by today's date and ensure only PENDING status
        const todayPending = filterAttentionsByToday(allPendingDetails);
        const filteredPending = todayPending.filter(att => att.status === 'PENDING');
        // Sort by number (ascending) to show next attention first
        state.queuePendingDetails = filteredPending.sort((a, b) => {
          const numA = a.number || 0;
          const numB = b.number || 0;
          return numA - numB;
        });
        state.queueProcessingDetails = filterAttentionsByToday(allProcessingDetails);

        // Sync pendingAttentions with queuePendingDetails for backward compatibility
        state.pendingAttentions = [...state.queuePendingDetails];

        // Get the next available attention (first in sorted list - lowest number)
        if (state.queuePendingDetails && state.queuePendingDetails.length > 0) {
          // Use the first pending attention (lowest number) - this is the correct next attention
          const nextAttention = state.queuePendingDetails[0];
          const nextAttentionNumber = nextAttention.number;
          const nextAttentionId = nextAttention.attentionId || nextAttention.id;

          if (nextAttentionNumber && nextAttentionId) {
            try {
              // Get full details using the specific attention number (this ensures we get the correct one)
              // Note: function signature is (queueId, number)
              state.attention = await getAvailableAttentionDetailsByNumber(
                queue.id,
                nextAttentionNumber
              );

              // Verify it's the correct attention
              const attentionId = state.attention?.attentionId || state.attention?.id;
              if (attentionId !== nextAttentionId) {
                // If API returned wrong attention, use the one from sorted list
                state.attention = {
                  ...nextAttention,
                  id: nextAttentionId,
                };
              }
            } catch (error) {
              // Fallback: use first attention from sorted list
              state.attention = {
                ...nextAttention,
                id: nextAttentionId,
              };
            }
          } else {
            // Fallback: use first attention from sorted list
            state.attention = {
              ...nextAttention,
              id: nextAttentionId,
            };
          }
        } else {
          // No pending attentions
          state.attention = {};
        }

        if (state.attention.user) {
          state.user = state.attention.user;
        } else if (state.queuePendingDetails && state.queuePendingDetails.length > 0) {
          // Try to get user from the first pending attention
          const firstAttention = state.queuePendingDetails[0];
          if (firstAttention.user) {
            state.user = firstAttention.user;
          }
        }
        if (state.attention.commerce) {
          state.commerce = state.attention.commerce;
        }
        // Always ensure commerce is loaded, even if not in attention
        // Use global commerce if available and matches queue's commerceId, otherwise load from queue
        if (globalCommerce.value && globalCommerce.value.id === queue.commerceId) {
          state.commerce = globalCommerce.value;
        } else if (!state.commerce || !state.commerce.id) {
          state.commerce = await getCommerceById(queue.commerceId);
          // Update global commerce if it matches
          if (state.commerce && state.commerce.id) {
            await store.setCurrentCommerce(state.commerce);
          }
        } else if (oldQueue && oldQueue.commerceId && queue.commerceId !== oldQueue.commerceId) {
          // Only reload if commerceId changed
          state.commerce = await getCommerceById(queue.commerceId);
          // Update global commerce
          if (state.commerce && state.commerce.id) {
            await store.setCurrentCommerce(state.commerce);
          }
        }
        loading.value = false;

        // Update intelligent estimation when queue changes
        await updateIntelligentEstimation();
      } else {
        router.push({ path: '/not-found' });
      }
    };

    // Function to update intelligent estimation
    const updateIntelligentEstimation = async () => {
      if (!state.queue?.id || state.queuePendingDetails.length === 0) {
        state.usingIntelligentEstimation = false;
        state.intelligentEstimatedTime = null;
        return;
      }

      try {
        const pendingCount = state.queuePendingDetails.length;
        const intelligentEstimation = await getEstimatedWaitTime(
          state.queue.id,
          pendingCount,
          'p75'
        );

        if (intelligentEstimation && intelligentEstimation.estimatedTime) {
          state.intelligentEstimatedTime = intelligentEstimation.estimatedTime;
          state.usingIntelligentEstimation =
            intelligentEstimation.usingIntelligentEstimation || false;
        } else {
          state.usingIntelligentEstimation = false;
          state.intelligentEstimatedTime = null;
        }
      } catch (error) {
        console.warn('Failed to get intelligent estimation:', error);
        state.usingIntelligentEstimation = false;
        state.intelligentEstimatedTime = null;
      }
    };

    watch(
      () => queues.value,
      async (newQueue, oldQueue) => {
        if (newQueue && newQueue.length > 0) {
          await getQueueValues(
            newQueue[0],
            oldQueue && oldQueue.length > 0 ? oldQueue[0] : undefined
          );
        }
      },
      { immediate: true }
    );

    const collaboratorQueues = () => {
      router.push({ path: `/interno/commerce/${state.commerce.id}/colaborador/filas` });
    };

    const attendAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = {
          queueId: state.queue.id,
          collaboratorId: state.currentUser.id,
          commerceLanguage: state.commerce.localeInfo ? state.commerce.localeInfo.language : 'sp',
        };
        state.attention = await attend(state.attention.number, body);
        router.push({ path: `/interno/colaborador/atencion/${state.attention.id}/validar` });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const finishCurrentCancelledAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = {};
        state.attention = await finishCancelledAttention(state.attention.id, body);
        await nextTick();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || error.response.statusCode || 500;
        loading.value = false;
      }
    };

    watch(attentions, async (newData, oldData) => {
      if (newData) {
        // Filter by today and PENDING status
        const todayAttentions = filterAttentionsByToday(newData);
        state.pendingAttentions = todayAttentions.filter(att => att.status === 'PENDING');
        store.setCurrentActiveAttentions(newData);

        // Also update queuePendingDetails if queue is loaded
        if (state.queue && state.queue.id) {
          // Re-fetch queue details to sync with Firebase updates
          const allPendingDetails = await getAvailableAttentiosnByQueue(state.queue.id);
          const todayPending = filterAttentionsByToday(allPendingDetails);
          const filteredPending = todayPending.filter(att => att.status === 'PENDING');
          // Sort by number (ascending) to show next attention first
          state.queuePendingDetails = filteredPending.sort((a, b) => {
            const numA = a.number || 0;
            const numB = b.number || 0;
            return numA - numB;
          });
          // Sync pendingAttentions with queuePendingDetails
          state.pendingAttentions = [...state.queuePendingDetails];

          // Update the displayed attention to show the next available one
          // This ensures the correct attention is shown when new attentions are added
          if (state.queuePendingDetails && state.queuePendingDetails.length > 0) {
            // Get the first pending attention (lowest number)
            const nextAttention = state.queuePendingDetails[0];
            const nextAttentionId = nextAttention.attentionId || nextAttention.id;

            // Check if current attention is still valid (exists and is still pending)
            const currentAttentionStillValid =
              state.attention.id &&
              state.queuePendingDetails.some(
                att =>
                  (att.attentionId || att.id) === state.attention.id && att.status === 'PENDING'
              );

            // Update if: current attention is invalid OR next attention is different
            if (
              !currentAttentionStillValid ||
              (nextAttentionId && state.attention.id !== nextAttentionId)
            ) {
              try {
                // Use the first attention from sorted list (lowest number)
                const correctAttention = state.queuePendingDetails[0];
                const correctAttentionId = correctAttention.attentionId || correctAttention.id;

                // Try to get full details from API, but verify it's the correct one
                const attentionDetails = await getNextAvailableAttentionDetails(state.queue.id);
                const apiAttentionId = attentionDetails?.attentionId || attentionDetails?.id;

                if (
                  attentionDetails &&
                  attentionDetails.id &&
                  apiAttentionId === correctAttentionId
                ) {
                  // API returned the correct attention
                  state.attention = attentionDetails;
                  if (attentionDetails.user) {
                    state.user = attentionDetails.user;
                  }
                  if (attentionDetails.commerce) {
                    state.commerce = attentionDetails.commerce;
                  }
                } else {
                  // API returned wrong attention, use the correct one from sorted list
                  state.attention = {
                    ...correctAttention,
                    id: correctAttentionId,
                  };
                  if (correctAttention.user) {
                    state.user = correctAttention.user;
                  }
                }
              } catch (error) {
                // Fallback: use first attention from sorted list
                const firstAttention = state.queuePendingDetails[0];
                state.attention = {
                  ...firstAttention,
                  id: firstAttention.attentionId || firstAttention.id,
                };
                if (firstAttention.user) {
                  state.user = firstAttention.user;
                }
              }
            }
          } else if (state.queuePendingDetails.length === 0) {
            // If no pending attentions, clear the current attention if it was pending
            if (state.attention.status === 'PENDING') {
              state.attention = {};
              state.user = {};
            }
          }

          // Update intelligent estimation when attentions change
          await updateIntelligentEstimation();
        }
      }
    });

    // Watch queuePendingDetails to update intelligent estimation when count changes
    watch(
      () => state.queuePendingDetails.length,
      async () => {
        if (state.queue?.id) {
          await updateIntelligentEstimation();
        }
      }
    );

    const openQueueDrawer = () => {
      state.drawerOpen = true;
    };

    const closeQueueDrawer = () => {
      state.drawerOpen = false;
    };

    // Force update trigger for live stats
    const statsUpdateTrigger = ref(0);

    // Live update interval for stats
    let statsInterval = null;

    onMounted(() => {
      // Update stats every minute for live updates
      statsInterval = setInterval(() => {
        // Force reactivity update by incrementing trigger
        statsUpdateTrigger.value++;
      }, 60000); // Update every minute
    });

    onUnmounted(() => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    });

    // Attention Statistics Computed
    const attentionStats = computed(() => {
      // Use trigger to force recomputation
      const _ = statsUpdateTrigger.value;

      if (!state.attention || !state.attention.id) {
        return null;
      }

      const createdDate = state.attention.createdDate || state.attention.createdAt;
      if (!createdDate) {
        return null;
      }

      const created = new Date(createdDate);
      const now = new Date();
      const diffMs = now - created;
      const minutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);

      let elapsedDisplay = '';
      if (minutes < 60) {
        elapsedDisplay = `${minutes} min`;
      } else if (hours < 24) {
        elapsedDisplay = `${hours}h ${minutes % 60}min`;
      } else {
        const days = Math.floor(hours / 24);
        elapsedDisplay = `${days}d ${hours % 24}h`;
      }

      const creationTime = created.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const creationDate = created.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      let timeStatus = 'neutral';
      let timeColor = '#a9a9a9';
      if (minutes < 10) {
        timeStatus = 'excellent';
        timeColor = '#00c2cb';
      } else if (minutes < 60) {
        timeStatus = 'good';
        timeColor = '#f9c322';
      } else if (minutes < 180) {
        timeStatus = 'warning';
        timeColor = '#ff9800';
      } else {
        timeStatus = 'poor';
        timeColor = '#a52a2a';
      }

      // Calculate estimated wait time - use intelligent estimation if available
      let estimatedDisplay = '';
      if (state.usingIntelligentEstimation && state.intelligentEstimatedTime) {
        // Use intelligent estimation (already formatted as HH:MM)
        estimatedDisplay = state.intelligentEstimatedTime;
      } else {
        // Fallback to simple calculation
        const estimatedMinutes =
          state.queuePendingDetails.length * (state.queue?.estimatedTime || 5);
        const estimatedHours = Math.floor(estimatedMinutes / 60);
        const estimatedMins = estimatedMinutes % 60;
        if (estimatedHours > 0) {
          estimatedDisplay = `${estimatedHours}h ${estimatedMins}min`;
        } else {
          estimatedDisplay = `${estimatedMins} min`;
        }
      }

      return {
        creationTime,
        creationDate,
        elapsedTime: elapsedDisplay,
        elapsedMinutes: minutes,
        timeStatus,
        timeColor,
        estimatedWaitTime: estimatedDisplay,
        pendingCount: state.queuePendingDetails.length,
        processingCount: state.queueProcessingDetails.length,
        usingIntelligentEstimation: state.usingIntelligentEstimation,
      };
    });

    return {
      id,
      state,
      loading,
      alertError,
      collaboratorQueues,
      attendAttention,
      finishCurrentCancelledAttention,
      openQueueDrawer,
      closeQueueDrawer,
      attentionStats,
      statsUpdateTrigger,
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.commerce?.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="`${$t(`collaboratorQueueAttentions.hello-user`)}, ${
            state.currentUser.alias || state.currentUser.name
          }!`"
          :toggles="state.toggles"
          component-name="collaboratorQueueAttentions"
          @goBack="collaboratorQueues"
        >
        </ComponentMenu>
        <QueueName
          :queue="state.queue"
          :queue-pending-details="state.queuePendingDetails"
          :queue-processing-details="state.queueProcessingDetails"
          :details="true"
          :use-drawer="true"
          @open-drawer="openQueueDrawer"
        >
        </QueueName>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div v-if="state.queuePendingDetails.length === 0" class="mt-2">
          <Message
            :title="$t('collaboratorQueueAttentions.message.1.title')"
            :content="$t('collaboratorQueueAttentions.message.1.content')"
            :icon="'bi bi-emoji-smile'"
          >
          </Message>
        </div>
        <div v-else id="attention">
          <div v-if="state.attention.status === 'USER_CANCELLED'" class="your-attention mt-2">
            <div class="your-attention mt-2">
              <span>{{ $t('collaboratorQueueAttentions.numberCancelled') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
              :attention="state.attention"
            ></AttentionNumber>
            <div class="d-grid gap-2 mt-3">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentCancelledAttention()"
              >
                {{ $t('collaboratorQueueAttentions.actions.4.action') }}
                <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
          <div v-else>
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorQueueAttentions.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="state.attention.number"
              :data="state.user"
              :attention="state.attention"
            ></AttentionNumber>
            <div class="waiting-people-modern-card" v-if="state.queuePendingDetails.length > 0">
              <div class="waiting-people-content-modern">
                <div class="waiting-people-icon-modern">
                  <i class="bi bi-people-fill"></i>
                </div>
                <div class="waiting-people-text-modern">
                  <span class="waiting-people-label-modern">{{
                    $t('collaboratorQueueAttentions.toGoal.1')
                  }}</span>
                  <span class="waiting-people-value-modern">{{
                    state.queuePendingDetails.length
                  }}</span>
                  <span class="waiting-people-label-modern">{{
                    $t('collaboratorQueueAttentions.toGoal.2')
                  }}</span>
                </div>
              </div>
            </div>
            <div class="d-grid gap-2 my-2">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="attendAttention()"
                :disabled="!state.toggles['collaborator.attention.attend'] || loading"
              >
                {{ $t('collaboratorQueueAttentions.actions.1.action') }}
                <i class="bi bi-qr-code-scan"></i>
              </button>
            </div>
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
                  v-if="!loading || state.commerce.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.commerce.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="`${$t(`collaboratorQueueAttentions.hello-user`)}, ${
                state.currentUser.alias || state.currentUser.name
              }!`"
              :toggles="state.toggles"
              component-name="collaboratorQueueAttentions"
              @goBack="collaboratorQueues"
            >
            </ComponentMenu>
          </div>
        </div>
        <QueueName
          :queue="state.queue"
          :queue-pending-details="state.queuePendingDetails"
          :queue-processing-details="state.queueProcessingDetails"
          :details="true"
          :use-drawer="true"
          @open-drawer="openQueueDrawer"
        >
        </QueueName>
        <div v-if="state.queuePendingDetails.length === 0" class="mt-2">
          <Message
            :title="$t('collaboratorQueueAttentions.message.1.title')"
            :content="$t('collaboratorQueueAttentions.message.1.content')"
            :icon="'bi bi-emoji-smile'"
          >
          </Message>
        </div>
        <div v-else id="attention">
          <div v-if="state.attention.status === 'USER_CANCELLED'" class="your-attention mt-2">
            <div class="your-attention mt-2">
              <span>{{ $t('collaboratorQueueAttentions.numberCancelled') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
              :attention="state.attention"
            ></AttentionNumber>
            <div class="d-grid gap-2 mt-3">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentCancelledAttention()"
              >
                {{ $t('collaboratorQueueAttentions.actions.4.action') }}
                <i class="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
          <div v-else>
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorQueueAttentions.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="state.attention.number"
              :data="state.user"
              :attention="state.attention"
            ></AttentionNumber>
            <!-- Attention Statistics Cards -->
            <div v-if="attentionStats" class="attention-stats-grid mt-3">
              <!-- Elapsed Time Card -->
              <div
                class="stat-card stat-card-time"
                :class="`stat-card-${attentionStats.timeStatus}`"
              >
                <div class="stat-card-icon stat-card-icon-with-popper">
                  <i class="bi bi-hourglass-split"></i>
                  <Popper :class="'dark'" arrow hover placement="top" :z-index="10001">
                    <template #content>
                      <div class="popper-content">
                        <div class="popper-title">Tempo de Espera - Indicadores de Cor</div>
                        <div class="popper-item">
                          <span class="popper-color" style="background: #00c2cb"></span>
                          <span><strong>Verde:</strong> Menos de 10 minutos - Excelente</span>
                        </div>
                        <div class="popper-item">
                          <span class="popper-color" style="background: #f9c322"></span>
                          <span><strong>Amarelo:</strong> Menos de 1 hora - Bom</span>
                        </div>
                        <div class="popper-item">
                          <span class="popper-color" style="background: #ff9800"></span>
                          <span><strong>Laranja:</strong> Menos de 3 horas - Atenção</span>
                        </div>
                        <div class="popper-item">
                          <span class="popper-color" style="background: #a52a2a"></span>
                          <span><strong>Vermelho:</strong> Mais de 3 horas - Urgente</span>
                        </div>
                      </div>
                    </template>
                    <i class="bi bi-info-circle popper-trigger-icon"></i>
                  </Popper>
                </div>
                <div class="stat-card-content">
                  <div class="stat-card-label">
                    Tempo de Espera
                    <span class="spy-live-indicator" title="Actualización en tiempo real">
                      <span class="spy-live-dot"></span>
                    </span>
                  </div>
                  <div class="stat-card-value" :style="{ color: attentionStats.timeColor }">
                    {{ attentionStats.elapsedTime }}
                  </div>
                </div>
              </div>

              <!-- Creation Time Card -->
              <div class="stat-card stat-card-creation">
                <div class="stat-card-icon">
                  <i class="bi bi-clock-history"></i>
                </div>
                <div class="stat-card-content">
                  <div class="stat-card-label">Criado em</div>
                  <div class="stat-card-value">{{ attentionStats.creationTime }}</div>
                  <div class="stat-card-subvalue">{{ attentionStats.creationDate }}</div>
                </div>
              </div>

              <!-- Pending Count Card -->
              <div class="stat-card stat-card-pending" v-if="attentionStats.pendingCount > 0">
                <div class="stat-card-icon">
                  <i class="bi bi-people-fill"></i>
                </div>
                <div class="stat-card-content">
                  <div class="stat-card-label">
                    Na Fila
                    <span class="spy-live-indicator" title="Actualización en tiempo real">
                      <span class="spy-live-dot"></span>
                    </span>
                  </div>
                  <div class="stat-card-value">{{ attentionStats.pendingCount }}</div>
                </div>
              </div>

              <!-- Estimated Wait Card -->
              <div class="stat-card stat-card-estimated" v-if="attentionStats.pendingCount > 0">
                <div class="stat-card-icon">
                  <i class="bi bi-stopwatch"></i>
                </div>
                <div class="stat-card-content">
                  <div class="stat-card-label">
                    Tempo Estimado
                    <Popper
                      v-if="attentionStats.usingIntelligentEstimation"
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
                  <div class="stat-card-value">{{ attentionStats.estimatedWaitTime }}</div>
                </div>
              </div>
            </div>

            <div class="d-grid gap-2 my-2">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="attendAttention()"
                :disabled="!state.toggles['collaborator.attention.attend'] || loading"
              >
                {{ $t('collaboratorQueueAttentions.actions.1.action') }}
                <i class="bi bi-qr-code-scan"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Queue Details Drawer - Lateral panel similar to booking 360 -->
    <Teleport to="body">
      <div v-if="state.drawerOpen" class="queue-drawer-overlay" @click="closeQueueDrawer">
        <div class="queue-drawer" @click.stop>
          <div
            class="queue-drawer-header"
            :class="state.queue?.active === true ? 'active-name' : 'desactived-name'"
          >
            <h5 class="queue-drawer-title">
              <i class="bi bi-person-lines-fill"></i>
              {{ state.queue?.name || '' }}
            </h5>
            <button class="queue-drawer-close" @click="closeQueueDrawer">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="queue-drawer-body">
            <QueueAttentionDetails
              :queue="state.queue"
              :queue-pending-details="state.queuePendingDetails"
              :queue-processing-details="state.queueProcessingDetails"
              :on-close="closeQueueDrawer"
            ></QueueAttentionDetails>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
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

/* Queue Drawer - Lateral panel similar to booking 360 */
.queue-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.queue-drawer {
  width: 100%;
  max-width: 650px;
  height: 100%;
  background: #f8f9fa;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.queue-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  background: rgba(255, 255, 255, 0.98);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.queue-drawer-header.active-name {
  background-color: var(--azul-turno);
  color: var(--color-background);
}

.queue-drawer-header.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
}

.queue-drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.queue-drawer-title i {
  color: inherit;
  font-size: 1.125rem;
}

.queue-drawer-header.active-name .queue-drawer-title,
.queue-drawer-header.active-name .queue-drawer-title i {
  color: var(--color-background);
}

.queue-drawer-header.desactived-name .queue-drawer-title,
.queue-drawer-header.desactived-name .queue-drawer-title i {
  color: var(--color-background);
}

.queue-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.5);
}

.queue-drawer-header.active-name .queue-drawer-close,
.queue-drawer-header.desactived-name .queue-drawer-close {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.8);
}

.queue-drawer-close:hover {
  background: rgba(169, 169, 169, 0.1);
  border-color: rgba(169, 169, 169, 0.3);
  color: rgba(0, 0, 0, 0.7);
}

.queue-drawer-header.active-name .queue-drawer-close:hover,
.queue-drawer-header.desactived-name .queue-drawer-close:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 1);
}

.queue-drawer-close i {
  font-size: 1rem;
}

.queue-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  background: #f8f9fa;
}

.queue-drawer-body::-webkit-scrollbar {
  width: 8px;
}

.queue-drawer-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.queue-drawer-body::-webkit-scrollbar-thumb {
  background: rgba(169, 169, 169, 0.3);
  border-radius: 4px;
}

.queue-drawer-body::-webkit-scrollbar-thumb:hover {
  background: rgba(169, 169, 169, 0.5);
}

/* Modern Waiting People Card */
.waiting-people-modern-card {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.08) 0%, rgba(0, 194, 203, 0.08) 100%);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  width: 100%;
  border: 1px solid rgba(0, 74, 173, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.waiting-people-modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.25);
}

.waiting-people-content-modern {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
}

.waiting-people-icon-modern {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.waiting-people-icon-modern i {
  font-size: 1.25rem;
  color: #004aad;
}

.waiting-people-text-modern {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.waiting-people-label-modern {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
}

.waiting-people-value-modern {
  font-size: 1.75rem;
  font-weight: 900;
  color: #004aad;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .queue-drawer {
    max-width: 100%;
  }

  .queue-drawer-body {
    padding: 0.75rem;
  }

  .waiting-people-modern-card {
    padding: 0.75rem 1rem;
    margin: 0.75rem auto;
  }

  .waiting-people-value-modern {
    font-size: 1.5rem;
  }
}

/* Attention Statistics Cards - Dashboard Style */
.attention-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  overflow: visible;
  position: relative;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 12px;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--stat-color, #a9a9a9);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: rgba(169, 169, 169, 0.25);
}

.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.6);
  font-size: 1.25rem;
}

.stat-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-card-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.stat-card-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.stat-card-subvalue {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

/* Status-specific colors */
.stat-card-excellent {
  --stat-color: #00c2cb;
}

.stat-card-excellent .stat-card-icon {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.stat-card-good {
  --stat-color: #f9c322;
}

.stat-card-good .stat-card-icon {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.stat-card-warning {
  --stat-color: #ff9800;
}

.stat-card-warning .stat-card-icon {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.stat-card-poor {
  --stat-color: #a52a2a;
}

.stat-card-poor .stat-card-icon {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.stat-card-creation .stat-card-icon {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
}

.stat-card-pending .stat-card-icon {
  background: rgba(0, 194, 203, 0.1);
  color: #00c2cb;
}

.stat-card-estimated .stat-card-icon {
  background: rgba(249, 195, 34, 0.1);
  color: #f9c322;
}

/* Responsive */
@media (max-width: 576px) {
  .attention-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem 0.875rem;
  }

  .stat-card-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .stat-card-value {
    font-size: 1.1rem;
  }
}

/* Popper Styles */
.stat-card-icon-with-popper {
  position: relative;
}

.popper-trigger-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  transition: all 0.2s ease;
}

.popper-trigger-icon:hover {
  color: rgba(0, 0, 0, 0.7);
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

/* Popper Styles with proper z-index - Higher than drawer */
/* Ensure popper renders outside parent container */
:deep(.vue3-popper) {
  z-index: 10001 !important;
  position: fixed !important;
}

:deep(.vue3-popper__inner) {
  z-index: 10001 !important;
  position: relative;
}

:deep(.vue3-popper__arrow) {
  z-index: 10002 !important;
}

:deep(.vue3-popper__wrapper) {
  z-index: 10001 !important;
  position: fixed !important;
}

/* Ensure parent containers don't clip poppers */
.stat-card-icon-with-popper {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

.popper-content {
  padding: 0.5rem 0.6rem;
  min-width: 200px;
  position: relative;
  z-index: 10000;
}

.popper-title {
  font-weight: 700;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.popper-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.3;
}

/* AI Badge Styles */
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

.popper-item:last-child {
  margin-bottom: 0;
}

.popper-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Live Indicator Styles */
.spy-live-indicator {
  display: inline-flex;
  align-items: center;
  position: relative;
  margin-left: 0.4rem;
  vertical-align: middle;
}

.spy-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #28a745;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
  display: inline-block;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(40, 167, 69, 0);
    opacity: 0.8;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
    opacity: 1;
  }
}
</style>
