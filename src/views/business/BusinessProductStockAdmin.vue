<script>
import { ref, reactive, onBeforeMount, } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommerceById } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ProductsStockManagement from '../../components/products/ProductsStockManagement.vue';
import ProductsAttentionManagement from '../../components/products/ProductsAttentionManagement.vue';

export default {
  name: 'BusinessProductStockAdmin',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ProductsStockManagement,
    ProductsAttentionManagement
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      selectedCommerces: ref({}),
      queues: ref({}),
      services: ref({}),
      queue: {},
      dateType: 'month',
      commerce: {},
      showProducts: true,
      showAttentions: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.selectedCommerces = [state.commerce];
        const commerce = await getCommerceById(state.commerce.id);
        state.queues = commerce.queues;
        state.services = await getServiceByCommerce(commerce.id);
        state.toggles = await getPermissions('products-stock');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.selectedCommerces = undefined;
        if (commerce.id === 'ALL') {
          if (state.currentUser.commercesId && state.currentUser.commercesId.length > 0) {
            state.selectedCommerces = state.currentUser.commercesId;
          } else {
            state.selectedCommerces = state.commerces;
          }
        } else {
          state.commerce = commerce;
          const queuesByCommerce = await getCommerceById(state.commerce.id);
          state.queues = queuesByCommerce.queues;
          state.selectedCommerces = state.commerces;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    }

    const goBack = () => {
      router.back();
    }

    const showProducts = () => {
      state.showProducts = true;
      state.showAttentions = false;
    }

    const showAttentions = () => {
      state.showProducts = false;
      state.showAttentions = true;
    }

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      selectCommerce,
      showProducts,
      showAttentions
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessProductStockAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessProductStockAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="product-stock">
        <div v-if="isActiveBusiness()">
          <div v-if="state.commerces.length === 0" class="control-box">
            <Message
              :title="$t('businessProductStockAdmin.message.3.title')"
              :content="$t('businessProductStockAdmin.message.3.content')" />
          </div>
          <div v-else class="control-box">
            <div id="product-stock-controls">
              <div class="row">
                <div class="col" v-if="state.commerces">
                  <span>{{ $t("businessProductStockAdmin.commerce") }} </span>
                  <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" id="modules" @change="selectCommerce(state.commerce)">
                    <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!loading" id="product-stock-result" class="mt-2">
            <div class="row col mx-1 mt-3 mb-1">
              <div class="col-6 centered">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                  :class="state.showProducts ? 'btn-selected' : ''"
                  @click="showProducts()"
                  :disabled="!state.toggles['products-stock.products.view']">
                  {{ $t("businessProductStockAdmin.products") }} <br> <i class="bi bi-eyedropper"></i>
                </button>
              </div>
              <div class="col-6 centered">
                <button
                  class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                  :class="state.showAttentions ? 'btn-selected' : ''"
                  @click="showAttentions()"
                  :disabled="!state.toggles['products-stock.attentions.view']">
                  {{ $t("businessProductStockAdmin.attentions") }} <br> <i class="bi bi-qr-code"></i>
                </button>
              </div>
            </div>
            <div>
              <ProductsStockManagement
                :showProductStockManagement="state.showProducts"
                :toggles="state.toggles"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
                :business="state.business"
              >
              </ProductsStockManagement>
              <ProductsAttentionManagement
                :showProductStockManagement="state.showAttentions"
                :toggles="state.toggles"
                :commerce="state.commerce"
                :queues="state.queues"
                :commerces="state.selectedCommerces"
                :services="state.services"
              >
              </ProductsAttentionManagement>
            </div>
          </div>
        </div>
        <div v-if="!isActiveBusiness() && !loading">
          <Message
            :title="$t('businessProductStockAdmin.message.1.title')"
            :content="$t('businessProductStockAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1.1rem;
  font-weight: 700;
}
.metric-subtitle {
  text-align: left;
  font-size: .9rem;
  font-weight: 500;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.green-icon {
  color: var(--verde-tu);
}
.red-icon {
  color: var(--rojo-warning);
}
.yellow-icon {
  color: var(--amarillo-star);
}
.metric-card-subtitle {
  font-size: .6rem;
  font-weight: 500;
}

</style>