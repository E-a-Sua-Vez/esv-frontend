<script>
import { ref, watch, reactive, onBeforeMount, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNextAvailableAttentionDetails,
  getAvailableAttentiosnByQueue,
  getProcessingAttentionDetailsByQueue,
  finishCancelledAttention,
} from '../../application/services/attention';
import { getCommerceById } from '../../application/services/commerce';
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
          console.warn('Error filtering attention by date:', error, attention);
          return false;
        }
      });
    };

    const getQueueValues = async (queue, oldQueue) => {
      loading.value = true;
      state.queue = queue;
      store.setCurrentQueue(queue);
      if (queue !== undefined && queue.id !== undefined) {
        state.attention = await getNextAvailableAttentionDetails(queue.id);
        const allPendingDetails = await getAvailableAttentiosnByQueue(queue.id);
        const allProcessingDetails = await getProcessingAttentionDetailsByQueue(queue.id);

        // Filter by today's date
        state.queuePendingDetails = filterAttentionsByToday(allPendingDetails);
        state.queueProcessingDetails = filterAttentionsByToday(allProcessingDetails);

        if (state.attention.user) {
          state.user = state.attention.user;
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
      } else {
        router.push({ path: '/not-found' });
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
      if (newData && oldData) {
        state.pendingAttentions = newData.filter(att => att.status === 'PENDING');
        store.setCurrentActiveAttentions(newData);
      }
    });

    const openQueueDrawer = () => {
      state.drawerOpen = true;
    };

    const closeQueueDrawer = () => {
      state.drawerOpen = false;
    };

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
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
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
        <div v-if="state.pendingAttentions.length === 0" class="mt-2">
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
            <div class="your-attention mt-2">
              <span>{{ $t('collaboratorQueueAttentions.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <div class="to-goal">
              <span
                >{{ $t('collaboratorQueueAttentions.toGoal.1') }}
                <strong>{{ state.pendingAttentions.length }}</strong>
                {{ $t('collaboratorQueueAttentions.toGoal.2') }}</span
              >
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
        <div v-if="state.pendingAttentions.length === 0" class="mt-2">
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
            <div class="your-attention mt-2">
              <span>{{ $t('collaboratorQueueAttentions.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <div class="to-goal">
              <span
                >{{ $t('collaboratorQueueAttentions.toGoal.1') }}
                <strong>{{ state.pendingAttentions.length }}</strong>
                {{ $t('collaboratorQueueAttentions.toGoal.2') }}</span
              >
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .queue-drawer {
    max-width: 100%;
  }

  .queue-drawer-body {
    padding: 0.75rem;
  }
}
</style>
