<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <Alert :show="!!alertError" :stack="alertError"></Alert>

    <div class="content text-center">
      <CommerceLogo
        :commerce-id="commerce?.id"
        :business-id="business?.id"
        :loading="loading"
      />
      <ComponentMenu
        :title="`${$t('collaboratorAttentionValidate.hello-user')}, ${
          state.currentUser?.alias || state.currentUser?.name
        }!`"
        :toggles="state.toggles"
        component-name="collaboratorAttentionCheckout"
        @goBack="goBack"
      />
      <QueueName
        v-if="state.queue"
        :queue="state.queue"
        :commerce="state.commerce"
        :details="true"
        :queue-pending-details="state.queuePendingDetails"
        :queue-processing-details="state.queueProcessingDetails"
        :queue-terminated-details="state.queueTerminatedDetails"
        :list-update-key="state.listUpdateKey"
      />

      <AttentionBasePage
        v-if="state.attention && state.attention.id"
        :attention="state.attention"
        :user="state.user"
        :client="state.client"
        :commerce="state.commerce"
        :queue="state.queue"
        :toggles="state.toggles"
        :attention-stats="attentionStats"
        :estimated-time="estimatedTime"
      >
        <template #content>
          <!-- Checkout Specific Content -->
          <div class="checkout-content my-4">
            <!-- Gestión de Stock (si aplica) -->
            <div
              v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')"
              class="estoque-card-compact my-3"
            >
              <div class="requirement-card-compact estoque-card">
                <div class="requirement-icon-compact estoque-icon">
                  <i class="bi bi-eyedropper"></i>
                </div>
                <div class="requirement-info-compact">
                  <div class="requirement-title-compact">{{ $t('dashboard.stock') }}</div>
                  <div class="requirement-subtitle-compact">
                    {{ $t('products.attentionProducts') }}
                  </div>
                </div>
                <button
                  class="requirement-action-btn-compact estoque-btn"
                  :disabled="loading"
                  @click="loadStockData()"
                  data-bs-toggle="modal"
                  :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
                >
                  <i class="bi bi-box-seam"></i>
                  <span>{{ $t('collaboratorAttentionValidate.actions.3.action') }}</span>
                </button>
              </div>
            </div>

            <!-- Comment Section -->
            <div class="mb-3">
              <label for="checkout-comment" class="form-label comment-title">
                {{ $t('collaboratorAttentionValidate.comment.label') }}
              </label>
              <textarea
                class="form-control"
                id="checkout-comment"
                rows="3"
                v-model="comment"
                :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"
              ></textarea>
            </div>

            <!-- Checkout Actions -->
            <div class="checkout-actions">
              <div class="actions mb-2">
                <span
                  ><strong>{{ $t('collaboratorAttentionValidate.finishCheckout') }}</strong></span
                >
              </div>
              <div class="row mx-1">
                <button
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1 attend-button"
                  :disabled="loading"
                  @click="finishCheckout"
                >
                  {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                  <i class="bi bi-check-all"></i>
                </button>
              </div>
              <div class="d-grid gap-2 my-1">
                <button
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                  :disabled="loading"
                  @click="goBack"
                >
                  {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                  <i class="bi bi-arrow-left-circle"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </AttentionBasePage>

      <Message
        v-else
        :title="$t('collaboratorAttentionValidate.message.1.title')"
        :content="$t('collaboratorAttentionValidate.message.1.content')"
        :icon="'bi bi-emoji-expressionless'"
      />
    </div>

    <!-- Modal Product Attention Management -->
    <div
      class="modal fade"
      :id="`attentionsProductsModal-${state.attention.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modal-fullscreen modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-box-seam"></i> {{ $t('products.attentionProducts') }}
            </h5>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">
            <ProductAttentionManagement
              v-if="state.attention && state.attention.id"
              :show-product-attention-management="true"
              :toggles="state.togglesStock"
              :attention="{ attentionId: state.attention.id, ...state.attention }"
              :commerce="state.commerce"
              :product-attentions-in="state.productConsumptions"
              :show-search-filters="false"
              @getProductConsuptions="getAttentionProducts"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  reactive,
  ref,
  computed,
  onBeforeMount,
  onMounted,
  onUnmounted,
  nextTick,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  getAttentionDetails,
  trackAttentionAccess,
  finishCheckout as finishCheckoutService,
} from '../../application/services/attention';
import { getClientById } from '../../application/services/client';
import { getCommerceById } from '../../application/services/commerce';
import { getAverageAttentionDuration } from '../../application/services/queue';
import { getProductsConsumptionsDetails } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import { globalStore } from '../../stores';
import { useAttentionStats } from '../../composables/useAttentionStats';
import {
  updatedAttentions,
  updatedQueues,
  updatedAvailableAttentions,
  updatedProcessingAttentions,
  updatedTerminatedAttentions,
} from '../../application/firebase';
import AttentionBasePage from '../../components/attentions/common/AttentionBasePage.vue';
import ProductAttentionManagement from '../../components/products/domain/ProductAttentionManagement.vue';
import QueueName from '../../components/common/QueueName.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Message from '../../components/common/Message.vue';

export default {
  name: 'CollaboratorAttentionCheckout',
  components: {
    AttentionBasePage,
    ProductAttentionManagement,
    QueueName,
    ComponentMenu,
    Spinner,
    Alert,
    Message,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();
    const { id } = route.params;
    const store = globalStore();

    const comment = ref('');
    const loading = ref(false);
    const alertError = ref('');
    const statsUpdateTrigger = ref(0);

    // Use global commerce and business from store
    const commerce = computed(() => store.getCurrentCommerce);
    const business = computed(() => store.getCurrentBusiness);

    const state = reactive({
      currentUser: {},
      attention: {},
      user: {},
      client: {},
      queue: {},
      toggles: {},
      togglesStock: {},
      queueEstimatedDuration: null,
      productConsumptions: [],
      queuePendingDetails: [],
      queueProcessingDetails: [],
      queueTerminatedDetails: [],
      listUpdateKey: 0, // Key to force component re-render
    });

    // Live update interval for stats
    let statsInterval = null;

    onMounted(() => {
      // Update stats every 30 seconds for live updates
      statsInterval = setInterval(() => {
        statsUpdateTrigger.value++;
      }, 30000);

      // Setup modal listener for stock/products modal
      nextTick(() => {
        const attentionId = state.attention?.id;
        if (attentionId) {
          const stockModal = document.getElementById(`attentionsProductsModal-${attentionId}`);
          if (stockModal) {
            stockModal.addEventListener('shown.bs.modal', async () => {
              // Load stock data when modal opens (toggles and product consumptions)
              await loadStockData();
            });
          }
        }
      });
    });

    onUnmounted(() => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }

      // Clean up Firebase listeners for queue modal
      if (pendingAttentionsRef && pendingAttentionsRef._unsubscribe) {
        pendingAttentionsRef._unsubscribe();
      }
      if (processingAttentionsRef && processingAttentionsRef._unsubscribe) {
        processingAttentionsRef._unsubscribe();
      }
      if (terminatedAttentionsRef && terminatedAttentionsRef._unsubscribe) {
        terminatedAttentionsRef._unsubscribe();
      }

      // Clean up watchers
      if (pendingWatcherStop) {
        pendingWatcherStop();
        pendingWatcherStop = null;
      }
      if (processingWatcherStop) {
        processingWatcherStop();
        processingWatcherStop = null;
      }
      if (terminatedWatcherStop) {
        terminatedWatcherStop();
        terminatedWatcherStop = null;
      }

      pendingAttentionsRef = null;
      processingAttentionsRef = null;
      terminatedAttentionsRef = null;
    });

    // Calculate attention stats
    const { attentionStats } = useAttentionStats(
      computed(() => state.attention),
      computed(() => state.queue),
      statsUpdateTrigger
    );

    // Calculate estimated time
    const estimatedTime = computed(() => {
      if (state.queueEstimatedDuration && state.queueEstimatedDuration > 0) {
        const hours = Math.floor(state.queueEstimatedDuration / 60);
        const minutes = state.queueEstimatedDuration % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `00:${minutes.toString().padStart(2, '0')}`;
      }
      return null;
    });

    // Firebase real-time listeners
    const firebaseAttentions = updatedAttentions(id);
    const firebaseQueueRef = ref(null);

    // Helper function to validate attention status/stage and redirect if needed (for /checkout page)
    const validateAndRedirectForCheckout = (attention, commerceOverride = null) => {
      if (!attention || !attention.id) return false;

      // Use commerceOverride if provided, otherwise use state.commerce, fallback to attention.commerce
      const commerce = commerceOverride || state.commerce || attention.commerce;
      if (!commerce) {
        // If no commerce available, can't validate features, but can still check basic status
        const isTerminated =
          attention.status === 'TERMINATED' ||
          attention.status === 'RATED' ||
          attention.status === 'TERMINATED_RESERVE_CANCELLED' ||
          attention.status === 'CANCELLED' ||
          attention.status === 'SKIPED' ||
          attention.status === 'USER_CANCELLED';
        if (isTerminated) {
          router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
          return true;
        }
        return false;
      }

      const isStagesEnabled = getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT');
      const isCheckoutEnabled = getActiveFeature(commerce, 'attention-checkout-enabled', 'PRODUCT');

      // Check if attention is terminated (any termination status)
      const isTerminated =
        attention.status === 'TERMINATED' ||
        attention.status === 'RATED' ||
        attention.status === 'TERMINATED_RESERVE_CANCELLED' ||
        attention.status === 'CANCELLED' ||
        attention.status === 'SKIPED' ||
        attention.status === 'USER_CANCELLED';

      if (isTerminated) {
        // Redirect to terminated page
        router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
        return true;
      }

      if (isStagesEnabled && attention.currentStage) {
        // Validate stage for checkout page
        if (!isCheckoutEnabled) {
          // Checkout not enabled but stages are enabled - this page shouldn't exist
          // Redirect based on current stage
          if (attention.currentStage === 'CHECK_IN') {
            router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
            return true;
          } else if (
            ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(
              attention.currentStage
            )
          ) {
            router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
            return true;
          } else if (attention.currentStage === 'TERMINATED') {
            router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
            return true;
          }
        } else if (attention.currentStage !== 'CHECKOUT') {
          // Checkout enabled but stage is not CHECKOUT - redirect accordingly
          if (attention.currentStage === 'CHECK_IN') {
            router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
            return true;
          } else if (
            ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(
              attention.currentStage
            )
          ) {
            router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
            return true;
          } else if (attention.currentStage === 'TERMINATED') {
            router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
            return true;
          }
        }
      } else if (!isStagesEnabled) {
        // Traditional mode: check status
        // For checkout page, if stages not enabled, this page shouldn't exist
        // Redirect based on status
        if (attention.status === 'PENDING') {
          router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
          return true;
        } else if (attention.status === 'PROCESSING') {
          router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
          return true;
        } else if (attention.status === 'TERMINATED' || attention.status === 'RATED') {
          router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
          return true;
        }
      }

      return false;
    };

    // Watch Firebase attention updates - MUST be deep and immediate to catch real-time changes
    watch(
      () => firebaseAttentions.value,
      async newAttentions => {
        if (newAttentions && Array.isArray(newAttentions) && newAttentions.length > 0) {
          const firebaseAttention = newAttentions[0];
          // Update attention with Firebase data
          if (firebaseAttention && firebaseAttention.id) {
            // Get commerce for validation (use state.commerce, fallback to firebaseAttention.commerce)
            const commerceForValidation =
              state.commerce || firebaseAttention.commerce || store.getCurrentCommerce;
            // Validate and redirect if needed BEFORE updating state
            if (validateAndRedirectForCheckout(firebaseAttention, commerceForValidation)) {
              return; // Stop here if redirecting
            }

            // Merge Firebase data with existing attention
            state.attention = {
              ...state.attention,
              ...firebaseAttention,
              // Preserve nested objects that might not come from Firebase
              user: state.attention.user || firebaseAttention.user,
              queue: state.attention.queue || firebaseAttention.queue,
              commerce: state.attention.commerce || firebaseAttention.commerce,
            };

            // Force stats update
            statsUpdateTrigger.value++;
          }
        }
      },
      { immediate: true, deep: true }
    );

    // Function to update attention details from Firebase listeners (MUST be defined before watchers)
    const updateAttentionDetails = () => {
      if (!state.queue || !state.queue.id) {
        return;
      }

      // Get pending attentions from Firebase listener (already filtered by date and status)
      const pendingArray = pendingAttentionsRef?.value || [];
      const pendingList = Array.isArray(pendingArray) ? pendingArray : [];

      // Firebase already filters by today and PENDING status, just sort by number
      const filteredPending = [...pendingList].filter(att => att && att.status === 'PENDING');
      const sortedPending = [...filteredPending].sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numA - numB;
      });

      // CRITICAL: Replace the entire array reference to force Vue reactivity
      state.queuePendingDetails.splice(0, state.queuePendingDetails.length, ...sortedPending);

      // Get processing attentions from Firebase listener (already filtered by date)
      const processingArray = processingAttentionsRef?.value || [];
      const processingList = Array.isArray(processingArray) ? processingArray : [];
      state.queueProcessingDetails.splice(
        0,
        state.queueProcessingDetails.length,
        ...processingList,
      );

      // Get terminated attentions from Firebase listener (already filtered by date)
      const terminatedArray = terminatedAttentionsRef?.value || [];
      const terminatedList = Array.isArray(terminatedArray) ? terminatedArray : [];
      const sortedTerminated = [...terminatedList].sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numB - numA;
      });
      state.queueTerminatedDetails.splice(
        0,
        state.queueTerminatedDetails.length,
        ...sortedTerminated,
      );

      // Force component re-render by updating key
      state.listUpdateKey++;
    };

    // Watch for queue ID to initialize Firebase listeners
    watch(
      () => state.queue?.id,
      queueId => {
        if (queueId) {
          // Initialize queue listener if not already set
          if (!firebaseQueueRef.value) {
            firebaseQueueRef.value = updatedQueues(queueId);
            // Watch Firebase queue updates
            watch(
              firebaseQueueRef,
              newQueues => {
                if (newQueues && newQueues.length > 0) {
                  const firebaseQueueData = newQueues[0];
                  if (firebaseQueueData && firebaseQueueData.id) {
                    state.queue = {
                      ...state.queue,
                      ...firebaseQueueData,
                    };
                    // Force stats update
                    statsUpdateTrigger.value++;
                  }
                }
              },
              { immediate: false }
            );
          }

          // Initialize attention listeners for modal (real-time updates) - AUTOMATIC
          if (!pendingAttentionsRef) {
            // Clean up previous listeners if exist (shouldn't happen, but safety check)
            if (pendingAttentionsRef && pendingAttentionsRef._unsubscribe) {
              pendingAttentionsRef._unsubscribe();
            }
            if (processingAttentionsRef && processingAttentionsRef._unsubscribe) {
              processingAttentionsRef._unsubscribe();
            }
            if (terminatedAttentionsRef && terminatedAttentionsRef._unsubscribe) {
              terminatedAttentionsRef._unsubscribe();
            }

            // Initialize Firebase listeners for this queue
            pendingAttentionsRef = updatedAvailableAttentions(queueId);
            processingAttentionsRef = updatedProcessingAttentions(queueId);
            terminatedAttentionsRef = updatedTerminatedAttentions(queueId);

            // Set up watchers that call updateAttentionDetails (watch the ref's value)
            pendingWatcherStop = watch(
              () => pendingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            processingWatcherStop = watch(
              () => processingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            terminatedWatcherStop = watch(
              () => terminatedAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            // Force initial update after a brief moment to ensure Firebase has initialized
            nextTick().then(() => {
              setTimeout(() => {
                updateAttentionDetails();
              }, 300);
            });
          }
        }
      },
      { immediate: true }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;

        // Load critical data first (sequential)
        state.currentUser = await store.getCurrentUser;
        const attentionDetails = await getAttentionDetails(id, state.currentUser?.id);

        if (attentionDetails) {
          state.attention = attentionDetails;
          if (attentionDetails.user) {
            state.user = attentionDetails.user;
          }
          if (attentionDetails.queue) {
            state.queue = attentionDetails.queue;
          }

          // Load commerce from attentionDetails and ensure it has features
          if (attentionDetails.commerce) {
            state.commerce = attentionDetails.commerce;
            // Update store commerce if needed
            const currentCommerce = store.getCurrentCommerce;
            if (!currentCommerce || currentCommerce.id !== attentionDetails.commerce.id) {
              await store.setCurrentCommerce(attentionDetails.commerce);
            }

            // Ensure commerce has features - load if missing
            if (
              !attentionDetails.commerce.features ||
              !Array.isArray(attentionDetails.commerce.features)
            ) {
              try {
                const fullCommerce = await getCommerceById(attentionDetails.commerce.id);
                if (fullCommerce && fullCommerce.features) {
                  state.commerce = fullCommerce;
                  await store.setCurrentCommerce(fullCommerce);
                }
              } catch (error) {
                console.warn('Could not fetch full commerce with features:', error);
              }
            }
          }

          // Validate attention status/stage AFTER setting state and loading commerce
          // This ensures we redirect immediately if attention is not in correct stage
          const commerceForValidation = state.commerce || attentionDetails.commerce;
          if (validateAndRedirectForCheckout(attentionDetails, commerceForValidation)) {
            loading.value = false;
            return; // Stop here if redirecting
          }

          // Load non-critical data in parallel
          const [togglesResult, clientResult, avgDurationResult] = await Promise.allSettled([
            getPermissions('collaborator'),
            state.attention.clientId
              ? getClientById(state.attention.clientId)
              : Promise.resolve(null),
            state.queue?.id ? getAverageAttentionDuration(state.queue.id) : Promise.resolve(null),
          ]);

          // Set toggles (togglesStock will be loaded when modal opens)
          if (togglesResult.status === 'fulfilled') {
            state.toggles = togglesResult.value;
          }

          // Set client
          if (clientResult.status === 'fulfilled' && clientResult.value?.id) {
            state.client = clientResult.value;
          }

          // Set estimated duration
          if (avgDurationResult.status === 'fulfilled' && avgDurationResult.value > 0) {
            state.queueEstimatedDuration = avgDurationResult.value;
          }

          // Note: Firebase listeners for queue modal are initialized automatically via watcher above
          // No need to call loadQueueDetailsForModal here - it's handled by the watcher
          // Stock data (togglesStock and productConsumptions) will be loaded when modal opens

          // Track access (non-blocking, non-critical)
          if (state.currentUser?.id) {
            trackAttentionAccess(state.attention.id, state.currentUser.id).catch(() => {
              // Silent fail - not critical
            });
          }
        }

        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    // Firebase listeners for queue modal (same pattern as CollaboratorAttentionValidate)
    let pendingAttentionsRef = null;
    let processingAttentionsRef = null;
    let terminatedAttentionsRef = null;

    // Store watcher stop functions for cleanup
    let pendingWatcherStop = null;
    let processingWatcherStop = null;
    let terminatedWatcherStop = null;

    // Load stock data when modal opens (toggles and product consumptions)
    const loadStockData = async () => {
      try {
        loading.value = true;

        // Load togglesStock if not already loaded
        if (!state.togglesStock || Object.keys(state.togglesStock).length === 0) {
          state.togglesStock = await getPermissions('products-stock');
        }

        // Load product consumptions
        const attentionId = state.attention.id || state.attention.attentionId;
        if (attentionId) {
          state.productConsumptions = await getProductsConsumptionsDetails(
            undefined,
            undefined,
            1,
            100,
            false,
            undefined,
            undefined,
            attentionId
          );
        }

        loading.value = false;
      } catch (error) {
        console.error('Error loading stock data:', error);
        loading.value = false;
      }
    };

    const getAttentionProducts = async () => {
      try {
        // Don't block loading indicator for this non-critical data
        const attentionId = state.attention.id || state.attention.attentionId;
        state.productConsumptions = await getProductsConsumptionsDetails(
          undefined,
          undefined,
          1,
          100,
          false,
          undefined,
          undefined,
          attentionId
        );
      } catch (error) {
        console.error('Error loading product consumptions:', error);
      }
    };

    const finishCheckout = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = {
          comment: comment.value || undefined,
          collaboratorId: state.currentUser?.id,
        };
        await finishCheckoutService(state.attention.id, body);

        // Reload attention details
        const updatedAttention = await getAttentionDetails(
          state.attention.id,
          state.currentUser?.id
        );
        state.attention = updatedAttention;

        // If terminated, redirect to terminated page
        if (updatedAttention.status === 'TERMINATED') {
          await nextTick();
          router.push({ path: `/interno/colaborador/atencion/${state.attention.id}/terminated` });
        } else {
          // Should not happen, but handle gracefully
          loading.value = false;
        }
      } catch (error) {
        alertError.value =
          error.response?.data?.message ||
          error.message ||
          t('collaboratorAttentionValidate.message.7.content');
        loading.value = false;
      }
    };

    const goBack = () => {
      if (state.queue?.id) {
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
      } else {
        router.push({ path: `/interno/commerce/${state.commerce?.id}/colaborador/filas` });
      }
    };

    return {
      state,
      comment,
      loading,
      alertError,
      attentionStats,
      estimatedTime,
      finishCheckout,
      getAttentionProducts,
      loadStockData,
      goBack,
      getActiveFeature,
    };
  },
};
</script>

<style scoped>
.checkout-content {
  margin: 0 auto;
}

.checkout-actions {
  margin: 0 auto;
}

.actions {
  text-align: center;
  color: #6c757d;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.comment-title {
  font-weight: 600;
  color: #495057;
}

.requirement-card {
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.requirement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.requirement-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.requirement-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.estoque-icon {
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}

.requirement-info {
  flex: 1;
}

.requirement-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.25rem;
}

.requirement-subtitle {
  font-size: 0.875rem;
  color: #6c757d;
}

.requirement-action-btn {
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}

.estoque-btn {
  background: #0d6efd;
  color: #ffffff;
}

.estoque-btn:hover:not(:disabled) {
  background: #0b5ed7;
  transform: translateY(-1px);
}

.estoque-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Compact card styles (matching atender page) */
.estoque-card-compact {
  margin: 0;
}

.requirement-card-compact {
  background: white;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: nowrap;
}

.requirement-card-compact::before {
  display: none;
}

.requirement-card-compact.estoque-card {
  border-left: 4px solid var(--card-accent-color, #3b82f6);
}

.requirement-icon-compact {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.requirement-icon-compact.estoque-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.requirement-info-compact {
  flex: 1;
  min-width: 0;
}

.requirement-title-compact {
  font-size: 0.875rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.requirement-subtitle-compact {
  font-size: 0.75rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.requirement-action-btn-compact {
  padding: 0.375rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.requirement-action-btn-compact.estoque-btn {
  background: #0d6efd;
  color: #ffffff;
}

.requirement-action-btn-compact.estoque-btn:hover:not(:disabled) {
  background: #0b5ed7;
  transform: translateY(-1px);
}

.requirement-action-btn-compact.estoque-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Attend button styles (matching atender page) */
.attend-button {
  width: 100% !important;
  padding: 0.875rem 1.5rem !important;
  font-size: 1.1rem !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.attend-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.attend-button:active:not(:disabled) {
  transform: translateY(0);
}

.attend-button i {
  font-size: 1.25rem;
}
</style>
