<script>
import { reactive, nextTick, onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { finishAttention, skip, getAttentionDetails } from '../../application/services/attention';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import { getProductsConsumptionsDetails } from '../../application/services/query-stack';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from'../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import QR from '../../components/common/QR.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ProductAttentionManagement from '../../components/products/domain/ProductAttentionManagement.vue';

export default {
  name: 'CollaboratorAttentionValidate',
  components: { Message, PoweredBy, QR, CommerceLogo, QueueName, AttentionNumber, Spinner, Alert, ToggleCapabilities, ComponentMenu, ProductAttentionManagement},
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    const store = globalStore();

    const comment = ref('');
    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      attention: {},
      queue: {},
      commerce: {},
      user: {},
      toggles: {},
      togglesStock: {},
      productConsumptions: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.attention = await getAttentionDetails(id);
        if (state.attention.id) {
          state.queue = state.attention.queue;
          state.commerce = state.attention.commerce;
          if (state.attention.userId) {
            state.user = state.attention.user
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
    })

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
    }

    const isReactivated = () => {
      return state.attention.status === 'REACTIVATED';
    }

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
        state.productConsumptions = await getProductsConsumptionsDetails(undefined, undefined, this.page, this.limit, this.asc, undefined, undefined, this.attention.attentionId);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    }

    return {
      id,
      state,
      comment,
      loading,
      alertError,
      finishCurrentAttention,
      queueAttentions,
      skipAttention,
      isReactivated,
      getActiveFeature,
      getAttentionProducts
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="`${$t(`collaboratorAttentionValidate.hello-user`)}, ${state.currentUser.alias || state.currentUser.name }!`"
        :toggles="state.toggles"
        componentName="collaboratorAttentionValidate"
        @goBack="queueAttentions">
      </ComponentMenu>
      <QueueName :queue="state.queue"> </QueueName>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="attention-processing" v-if="state.attention.status === 'PENDING' || state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'">
        <div id="page-header" class="text-center">
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorAttentionValidate.yourNumber") }}</span>
          </div>
        </div>
        <AttentionNumber
          :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
          :number="state.attention.number"
          :data="state.user"
        ></AttentionNumber>
        <div v-if="state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'" class="d-grid gap-2 my-2 mx-2">
          <div class="mb-2">
            <label for="comment" class="form-label mt-2 comment-title">{{ $t("collaboratorAttentionValidate.comment.label") }}</label>
            <textarea
              class="form-control"
              id="comment"
              rows="3"
              v-model="comment"
              :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')">
            </textarea>
          </div>
        <div class="actions">
          <span><strong>{{ $t("collaboratorQueueAttentions.actions.1.title.1") }}</strong></span>
        </div>
        <div v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')" class="row mx-1">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
            :disabled="!state.toggles['collaborator.attention.finish'] || loading"
            @click="getAttentionProducts()"
            data-bs-toggle="modal"
            :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
            >
            {{ $t("collaboratorAttentionValidate.actions.3.action") }} <i class="bi bi-eyedropper"></i>
          </button>
        </div>
        <div class="row mx-1">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
            :disabled="!state.toggles['collaborator.attention.finish'] || loading"
            @click="finishCurrentAttention()">
            {{ $t("collaboratorAttentionValidate.actions.1.action") }} <i class="bi bi-check-all"></i>
          </button>
        </div>
        <div class="actions">
          <span><strong>{{ $t("collaboratorQueueAttentions.actions.2.title.1") }}</strong></span>
        </div>
        <button
          class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
          :disabled="!state.toggles['collaborator.attention.skip'] || isReactivated() || loading"
          @click="skipAttention()">
          {{ $t("collaboratorQueueAttentions.actions.2.action") }} <i class="bi bi-skip-forward"></i>
        </button>
        <div class="d-grid gap-2 my-1">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
       </div>
      </div>
      <div v-else id="attention-terminated">
        <div v-if="(state.attention.status === 'TERMINATED' || state.attention.status === 'RATED')">
          <Message
            :title="$t('collaboratorAttentionValidate.message.2.title')"
            :content="$t('collaboratorAttentionValidate.message.2.content')"
            :icon="'bi bi-emoji-sunglasses'">
          </Message>
        </div>
        <div v-if="state.attention.status === 'SKIPED'">
          <Message
            :title="$t('collaboratorAttentionValidate.message.3.title')"
            :content="$t('collaboratorAttentionValidate.message.3.content')"
            :icon="'bi bi-emoji-sunglasses'">
          </Message>
        </div>
        <div v-if="state.attention.status === 'USER_CANCELLED' || state.attention.status === 'TERMINATED_RESERVE_CANCELLED'">
          <div class="your-attention mt-2">
            <span>{{ $t("collaboratorAttentionValidate.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :type="'secondary'"
            :number="state.attention.number"
            :data="state.user"
          ></AttentionNumber>
          <Message
            :title="$t('collaboratorAttentionValidate.message.5.title')"
            :content="$t('collaboratorAttentionValidate.message.5.content')"
            :icon="'bi bi-emoji-expressionless'">
          </Message>
        </div>
        <div class="d-grid gap-2 my-2">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
      </div>
      <div v-if="state.attention.status === 'PENDING'">
        <Message
          :title="$t('collaboratorAttentionValidate.message.4.title')"
          :content="$t('collaboratorAttentionValidate.message.4.content')"
          :icon="'bi bi-emoji-expressionless'">
        </Message>
        <div class="d-grid gap-2 my-2">
          <button
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="queueAttentions()"
            :disabled="loading"
            >
            {{ $t("collaboratorAttentionValidate.actions.2.action") }} <i class="bi bi-arrow-left-circle"></i>
          </button>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
    <!-- Modal Products -->
    <div class="modal fade" :id="`attentionsProductsModal-${state.attention.id}`" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-10" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-eyedropper"></i> {{ $t("businessProductStockAdmin.attentionProducts") }} </h5>
            <button class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">
            <ProductAttentionManagement
              :showProductAttentionManagement="true"
              :toggles="state.togglesStock"
              :attention="{ attentionId: state.attention.id, ...state.attention }"
              :commerce="state.commerce"
              :productAttentionsIn="state.productConsumptions"
              :showFilters="false"
              @getProductConsuptions="getAttentionProducts"
            >
            </ProductAttentionManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-toggle="modal" data-bs-target="#detailsQuestionModal">{{ $t("notificationConditions.action") }} <i class="bi bi-check-lg"></i></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-title {
  font-size: .9rem;
  line-height: 1rem;
}
</style>