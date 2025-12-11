<script>
import { reactive, nextTick, onBeforeMount, onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { finishAttention, skip, getAttentionDetails } from '../../application/services/attention';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import {
  getProductsConsumptionsDetails,
  getPatientHistoryDetails,
  getPendingAttentionsDetails,
} from '../../application/services/query-stack';
import { getPatientHistoryItemByCommerce } from '../../application/services/patient-history-item';
import { getFormsByClient } from '../../application/services/form';
import { getClientById } from '../../application/services/client';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from '../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import QR from '../../components/common/QR.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ProductAttentionManagement from '../../components/products/domain/ProductAttentionManagement.vue';
import PatientHistoryManagement from '../../components/patient-history/domain/PatientHistoryManagement.vue';
import AttentionDetailsCard from '../../components/clients/common/AttentionDetailsCard.vue';
import AttentionDetailsNumber from '../../components/common/AttentionDetailsNumber.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorAttentionValidate',
  components: {
    Message,
    QR,
    CommerceLogo,
    QueueName,
    AttentionNumber,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ProductAttentionManagement,
    PatientHistoryManagement,
    AttentionDetailsCard,
    AttentionDetailsNumber,
    Popper,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    const store = globalStore();

    const comment = ref('');
    const loading = ref(false);
    const alertError = ref('');

    // Use global commerce and module from store
    const globalCommerce = computed(() => store.getCurrentCommerce);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      attention: {},
      attentionDetails: {},
      queue: {},
      commerce: {},
      commerceIds: {},
      user: {},
      toggles: {},
      client: {},
      togglesStock: {},
      productConsumptions: [],
      patientForms: [],
      patientHistory: {},
      patientHistoryItems: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.attention = await getAttentionDetails(id);
        if (state.attention.id) {
          state.queue = state.attention.queue;
          // Use global commerce if it matches attention's commerce, otherwise use attention's commerce
          if (globalCommerce.value && globalCommerce.value.id === state.attention.commerce?.id) {
            state.commerce = globalCommerce.value;
          } else {
            state.commerce = state.attention.commerce;
            // Update global commerce to match attention's commerce
            if (state.commerce && state.commerce.id) {
              await store.setCurrentCommerce(state.commerce);
            }
          }
          state.commerceIds = [state.commerce.id];
          const attentionDetails = await getPendingAttentionsDetails(
            undefined,
            undefined,
            undefined,
            state.commerceIds,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            id
          );
          if (attentionDetails && attentionDetails.length > 0) {
            state.attentionDetails = attentionDetails[0];
          }
          if (state.attention.userId) {
            state.user = state.attention.user;
          }
          state.toggles = await getPermissions('collaborator');
          state.togglesStock = await getPermissions('products-stock');
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const finishCurrentAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { comment: comment.value };
        state.attention = await finishAttention(state.attention.id, body);
        await nextTick();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || error.response.statusCode || 500;
        loading.value = false;
      }
    };

    const queueAttentions = () => {
      router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
    };

    const isReactivated = () => state.attention.status === 'REACTIVATED';

    const skipAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { collaboratorId: state.currentUser.id, queueId: state.queue.id };
        state.attention = await skip(state.attention.number, body);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const getAttentionProducts = async () => {
      try {
        loading.value = true;
        state.productConsumptions = await getProductsConsumptionsDetails(
          undefined,
          undefined,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined,
          this.attention.attentionId
        );
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getPatientHistory = async () => {
      try {
        loading.value = true;
        const result = await getPatientHistoryDetails(state.attention.clientId);
        if (result && result.length > 0) {
          state.patientHistory = result[0];
        }
        const items = await getPatientHistoryItemByCommerce(state.commerce.id);
        if (items && items.length > 0) {
          state.patientHistoryItems = items;
        }
        const forms = await getFormsByClient(state.commerce.id, state.attention.clientId);
        if (forms && forms.length > 0) {
          state.patientForms = forms;
        }
        const client = await getClientById(state.attention.clientId);
        if (client && client.id) {
          state.client = client;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
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

      let created;
      if (createdDate instanceof Date) {
        created = createdDate;
      } else if (createdDate.toDate && typeof createdDate.toDate === 'function') {
        created = createdDate.toDate();
      } else if (createdDate.seconds) {
        created = new Date(createdDate.seconds * 1000);
      } else {
        created = new Date(createdDate);
      }

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

      const creationTime = created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const creationDate = created.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

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

      return {
        creationTime,
        creationDate,
        elapsedTime: elapsedDisplay,
        elapsedMinutes: minutes,
        timeStatus,
        timeColor,
      };
    });

    return {
      id,
      state,
      comment,
      loading,
      alertError,
      getPatientHistory,
      finishCurrentAttention,
      queueAttentions,
      skipAttention,
      isReactivated,
      getActiveFeature,
      getAttentionProducts,
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
        <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="`${$t(`collaboratorAttentionValidate.hello-user`)}, ${
            state.currentUser.alias || state.currentUser.name
          }!`"
          :toggles="state.toggles"
          component-name="collaboratorAttentionValidate"
          @goBack="queueAttentions"
        >
        </ComponentMenu>
        <QueueName :queue="state.queue"> </QueueName>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div
          id="attention-processing"
          v-if="
            state.attention.status === 'PENDING' ||
            state.attention.status === 'PROCESSING' ||
            state.attention.status === 'REACTIVATED'
          "
        >
          <div id="page-header" class="text-center">
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
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
            <div class="stat-card stat-card-time" :class="`stat-card-${attentionStats.timeStatus}`">
              <div class="stat-card-icon stat-card-icon-with-popper">
                <i class="bi bi-hourglass-split"></i>
                <Popper :class="'dark'" arrow hover placement="top" :z-index="10001">
                  <template #content>
                    <div class="popper-content">
                      <div class="popper-title">Tempo de Espera - Indicadores de Cor</div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #00c2cb;"></span>
                        <span><strong>Verde:</strong> Menos de 10 minutos - Excelente</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #f9c322;"></span>
                        <span><strong>Amarelo:</strong> Menos de 1 hora - Bom</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #ff9800;"></span>
                        <span><strong>Laranja:</strong> Menos de 3 horas - Atenção</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #a52a2a;"></span>
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
          </div>
          <div
            v-if="
              state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="mb-2">
              <label for="comment" class="form-label mt-2 comment-title">{{
                $t('collaboratorAttentionValidate.comment.label')
              }}</label>
              <textarea
                class="form-control"
                id="comment"
                rows="3"
                v-model="comment"
                :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"
              >
              </textarea>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div
              v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')"
              class="row mx-1"
            >
              <button
                class="col btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.products'] || loading"
                @click="getAttentionProducts()"
                data-bs-toggle="modal"
                :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
              >
                {{ $t('collaboratorAttentionValidate.actions.3.action') }}
                <i class="bi bi-eyedropper"></i>
              </button>
              <button
                class="col btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.patient-history'] || loading"
                @click="getPatientHistory()"
                data-bs-toggle="modal"
                :data-bs-target="`#patientHistoryModal-${state.attention.clientId}`"
              >
                {{ $t('dashboard.patientHistory') }} <i class="bi bi-file-medical-fill"></i>
              </button>
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-check-all"></i>
              </button>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.2.title.1') }}</strong></span
              >
            </div>
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
              :disabled="
                !state.toggles['collaborator.attention.skip'] || isReactivated() || loading
              "
              @click="skipAttention()"
            >
              {{ $t('collaboratorQueueAttentions.actions.2.action') }}
              <i class="bi bi-skip-forward"></i>
            </button>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else id="attention-terminated">
          <div v-if="state.attention.status === 'TERMINATED' || state.attention.status === 'RATED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.2.title')"
              :content="$t('collaboratorAttentionValidate.message.2.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div v-if="state.attention.status === 'SKIPED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.3.title')"
              :content="$t('collaboratorAttentionValidate.message.3.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div
            v-if="
              state.attention.status === 'USER_CANCELLED' ||
              state.attention.status === 'TERMINATED_RESERVE_CANCELLED'
            "
          >
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <Message
              :title="$t('collaboratorAttentionValidate.message.5.title')"
              :content="$t('collaboratorAttentionValidate.message.5.content')"
              :icon="'bi bi-emoji-expressionless'"
            >
            </Message>
          </div>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
        <div v-if="state.attention.status === 'PENDING'">
          <Message
            :title="$t('collaboratorAttentionValidate.message.4.title')"
            :content="$t('collaboratorAttentionValidate.message.4.content')"
            :icon="'bi bi-emoji-expressionless'"
          >
          </Message>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
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
              :title="`${$t(`collaboratorAttentionValidate.hello-user`)}, ${
                state.currentUser.alias || state.currentUser.name
              }!`"
              :toggles="state.toggles"
              component-name="collaboratorAttentionValidate"
              @goBack="queueAttentions"
            >
            </ComponentMenu>
          </div>
        </div>
        <QueueName :queue="state.queue"> </QueueName>
        <div
          id="attention-processing"
          v-if="
            state.attention.status === 'PENDING' ||
            state.attention.status === 'PROCESSING' ||
            state.attention.status === 'REACTIVATED'
          "
        >
          <div id="page-header" class="text-center">
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
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
            <div class="stat-card stat-card-time" :class="`stat-card-${attentionStats.timeStatus}`">
              <div class="stat-card-icon stat-card-icon-with-popper">
                <i class="bi bi-hourglass-split"></i>
                <Popper :class="'dark'" arrow hover placement="top" :z-index="10001">
                  <template #content>
                    <div class="popper-content">
                      <div class="popper-title">Tempo de Espera - Indicadores de Cor</div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #00c2cb;"></span>
                        <span><strong>Verde:</strong> Menos de 10 minutos - Excelente</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #f9c322;"></span>
                        <span><strong>Amarelo:</strong> Menos de 1 hora - Bom</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #ff9800;"></span>
                        <span><strong>Laranja:</strong> Menos de 3 horas - Atenção</span>
                      </div>
                      <div class="popper-item">
                        <span class="popper-color" style="background: #a52a2a;"></span>
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
          </div>
          <div
            v-if="
              state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="mb-2">
              <label for="comment" class="form-label mt-2 comment-title">{{
                $t('collaboratorAttentionValidate.comment.label')
              }}</label>
              <textarea
                class="form-control"
                id="comment"
                rows="3"
                v-model="comment"
                :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"
              >
              </textarea>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div
              v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')"
              class="row mx-1"
            >
              <button
                class="col btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.products'] || loading"
                @click="getAttentionProducts()"
                data-bs-toggle="modal"
                :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
              >
                {{ $t('collaboratorAttentionValidate.actions.3.action') }}
                <i class="bi bi-eyedropper"></i>
              </button>
              <button
                class="col btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.patient-history'] || loading"
                @click="getPatientHistory()"
                data-bs-toggle="modal"
                :data-bs-target="`#patientHistoryModal-${state.attention.clientId}`"
              >
                {{ $t('dashboard.patientHistory') }} <i class="bi bi-file-medical-fill"></i>
              </button>
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-check-all"></i>
              </button>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.2.title.1') }}</strong></span
              >
            </div>
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
              :disabled="
                !state.toggles['collaborator.attention.skip'] || isReactivated() || loading
              "
              @click="skipAttention()"
            >
              {{ $t('collaboratorQueueAttentions.actions.2.action') }}
              <i class="bi bi-skip-forward"></i>
            </button>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else id="attention-terminated">
          <div v-if="state.attention.status === 'TERMINATED' || state.attention.status === 'RATED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.2.title')"
              :content="$t('collaboratorAttentionValidate.message.2.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div v-if="state.attention.status === 'SKIPED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.3.title')"
              :content="$t('collaboratorAttentionValidate.message.3.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div
            v-if="
              state.attention.status === 'USER_CANCELLED' ||
              state.attention.status === 'TERMINATED_RESERVE_CANCELLED'
            "
          >
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <Message
              :title="$t('collaboratorAttentionValidate.message.5.title')"
              :content="$t('collaboratorAttentionValidate.message.5.content')"
              :icon="'bi bi-emoji-expressionless'"
            >
            </Message>
          </div>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
        <div v-if="state.attention.status === 'PENDING'">
          <Message
            :title="$t('collaboratorAttentionValidate.message.4.title')"
            :content="$t('collaboratorAttentionValidate.message.4.content')"
            :icon="'bi bi-emoji-expressionless'"
          >
          </Message>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Products -->
    <div
      class="modal fade"
      :id="`attentionsProductsModal-${state.attention.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-10"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-eyedropper"></i>
              {{ $t('businessProductStockAdmin.attentionProducts') }}
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
              :show-product-attention-management="true"
              :toggles="state.togglesStock"
              :attention="{ attentionId: state.attention.id, ...state.attention }"
              :commerce="state.commerce"
              :product-attentions-in="state.productConsumptions"
              :show-search-filters="false"
              @getProductConsuptions="getAttentionProducts"
            >
            </ProductAttentionManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Patient History -->
    <div
      class="modal fade"
      :id="`patientHistoryModal-${state.attention.clientId}`"
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
              <i class="bi bi-chat-left-dots-fill"></i> {{ $t('dashboard.patientHistoryOf') }}
              {{ state.user.name || state.user.idNumber || state.user.email }}
            </h5>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="patient-history-component">
            <PatientHistoryManagement
              :show-patient-history-management="true"
              :client="state.client"
              :commerce="state.commerce"
              :patient-history-in="state.patientHistory"
              :patient-forms="state.patientForms"
              :attention="state.attention.id"
              :patient-history-items="state.patientHistoryItems"
              @getPatientHistory="getPatientHistory"
            >
            </PatientHistoryManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-title {
  font-size: 0.9rem;
  line-height: 1rem;
}

/* Your Attention Section */
.your-attention {
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 0.01em;
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

/* Popper Styles */
.stat-card-icon-with-popper {
  position: relative;
  overflow: visible !important;
  z-index: 1;
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
  z-index: 10;
}

.popper-trigger-icon:hover {
  color: rgba(0, 0, 0, 0.7);
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

/* Popper Styles with proper z-index - Higher than drawer */
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
