<script>
import { ref, reactive, onBeforeMount, watch, computed, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCommerceById } from '../../application/services/commerce';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import { getGroupedQueueByCommerceId } from '../../application/services/queue';
import { getCollaboratorById, updateModule } from '../../application/services/collaborator';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { updatedAvailableAttentionsByCommerce } from '../../application/firebase';
import { getQueueByCommerce } from '../../application/services/queue';
import { getActiveFeature } from '../../shared/features';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

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
      toggles: {},
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
        console.error('Error loading commerce data:', error);
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
            console.error('Error handling module change:', error);
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
            if (filteredAttentionsByQueue[queue.id]) {
              const attentionsCount = filteredAttentionsByQueue[queue.id].length;
              state.queueStatus[queue.id] = attentionsCount;
            } else {
              // Explicitly set to 0 if no attentions for this queue
              state.queueStatus[queue.id] = 0;
            }
          }
        });
      } catch (error) {
        console.error('Error in checkQueueStatus:', error);
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
          }
        });
      }
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
          console.error('Error accessing attentions.value:', error);
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
          <div class="row" v-if="isActiveCommerce()">
            <div class="choose-attention">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div
              v-for="queue in state.queues"
              :key="queue.id"
              class="d-grid btn-group btn-group-justified"
            >
              <div v-if="captchaEnabled === true">
                <VueRecaptcha
                  :sitekey="siteKey"
                  @verify="validateCaptchaOk"
                  @error="validateCaptchaError"
                >
                  <button
                    v-if="queue.active"
                    type="button"
                    class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                    @click="getQueue(queue)"
                    :disabled="loading"
                  >
                    <div class="row centered">
                      <div class="col-8">
                        <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                        {{ queue.name }}
                      </div>
                      <div class="col-2">
                        <span
                          :class="`badge rounded-pill m-0 indicator ${
                            state.queueStatus[queue.id] === 0
                              ? 'text-bg-success'
                              : 'text-bg-primary'
                          }`"
                        >
                          <i class="bi bi-person-fill"></i>
                          {{ state.queueStatus[queue.id] }}
                        </span>
                      </div>
                    </div>
                  </button>
                </VueRecaptcha>
              </div>
              <div v-else>
                <button
                  v-if="queue.active"
                  type="button"
                  class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="getQueue(queue)"
                  :disabled="loading"
                >
                  <div class="row centered">
                    <div class="col-8">
                      <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                      {{ queue.name }}
                    </div>
                    <div class="col-2">
                      <span
                        :class="`badge rounded-pill m-0 indicator ${
                          state.queueStatus[queue.id] === 0 ? 'text-bg-success' : 'text-bg-primary'
                        }`"
                      >
                        <i class="bi bi-person-fill"></i>
                        {{ state.queueStatus[queue.id] }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
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
          <div class="row" v-if="isActiveCommerce()">
            <div class="choose-attention">
              <span>{{ $t('collaboratorQueuesView.choose') }}</span>
            </div>
            <div
              v-for="queue in state.queues"
              :key="queue.id"
              class="d-grid btn-group btn-group-justified"
            >
              <div v-if="captchaEnabled === true">
                <VueRecaptcha
                  :sitekey="siteKey"
                  @verify="validateCaptchaOk"
                  @error="validateCaptchaError"
                >
                  <button
                    v-if="queue.active"
                    type="button"
                    class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                    @click="getQueue(queue)"
                    :disabled="loading"
                  >
                    <div class="row centered">
                      <div class="col-8">
                        <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                        {{ queue.name }}
                      </div>
                      <div class="col-2">
                        <span
                          :class="`badge rounded-pill m-0 indicator ${
                            state.queueStatus[queue.id] === 0
                              ? 'text-bg-success'
                              : 'text-bg-primary'
                          }`"
                        >
                          <i class="bi bi-person-fill"></i>
                          {{ state.queueStatus[queue.id] }}
                        </span>
                      </div>
                    </div>
                  </button>
                </VueRecaptcha>
              </div>
              <div v-else>
                <button
                  v-if="queue.active"
                  type="button"
                  class="btn btn-lg btn-block btn-size col-9 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="getQueue(queue)"
                  :disabled="loading"
                >
                  <div class="row centered">
                    <div class="col-8">
                      <i v-if="queue.type === 'COLLABORATOR'" class="bi bi-person-fill"></i>
                      {{ queue.name }}
                    </div>
                    <div class="col-2">
                      <span
                        :class="`badge rounded-pill m-0 indicator ${
                          state.queueStatus[queue.id] === 0 ? 'text-bg-success' : 'text-bg-primary'
                        }`"
                      >
                        <i class="bi bi-person-fill"></i>
                        {{ state.queueStatus[queue.id] }}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
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
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.indicator {
  font-size: 0.7rem;
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
