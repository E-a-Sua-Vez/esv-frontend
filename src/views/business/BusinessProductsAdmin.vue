<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getProductByCommerce,
  updateProduct,
  addProduct,
} from '../../application/services/product';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import ProductSimpleName from '../../components/common/ProductSimpleName.vue';
import ProductFormEdit from '../../components/product/ProductFormEdit.vue';
import ProductFormAdd from '../../components/product/ProductFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getProductMeasureTypes, getProductsTypes } from '../../shared/utils/data';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

export default {
  name: 'BusinessProductsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ProductSimpleName,
    ProductFormEdit,
    ProductFormAdd,
    Toggle,
    Warning,
    AreYouSure,
    Popper,
    ComponentMenu,
    SearchAdminItem,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      products: ref([]),
      showAdd: false,
      goToUnavailable: false,
      newProduct: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagError: false,
      typeAddError: false,
      measureTypeAddError: false,
      orderAddError: false,
      orderUpdateError: false,
      actualLevelAddError: false,
      optimumLevelAddError: false,
      typeUpdateError: false,
      measureTypeUpdateError: false,
      actualLevelUpdateError: false,
      optimumLevelUpdateError: false,
      maximumLevelAddError: false,
      maximumLevelUpdateError: false,
      replacementLevelUpdateError: false,
      replacementLevelAddError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load products when commerce changes
    const loadProducts = async commerceId => {
      if (!commerceId) {
        state.products = [];
        state.filtered = [];
        return;
      }
      try {
        const products = await getProductByCommerce(commerceId);
        state.products = products || [];
        state.filtered = state.products;
      } catch (error) {
        console.error('Error loading products:', error);
        state.products = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload products
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.products = [];
            state.filtered = [];
            await loadProducts(newCommerce.id);
            loading.value = false;
          } catch (error) {
            console.error('Error loading products on commerce change:', error);
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getProductsTypes();
        state.measureTypes = getProductMeasureTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('products', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load products for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadProducts(commerceToUse.id);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = product => {
      state.errorsAdd = [];
      if (!product.name || product.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!product.tag || product.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if (!product.type || product.type.length === 0) {
        state.typeAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.type');
      } else {
        state.typeAddError = false;
      }
      if (!product.measureType || product.measureType.length === 0) {
        state.measureTypeAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.measureType');
      } else {
        state.measureTypeAddError = false;
      }
      if (!product.order || product.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (product.actualLevel === undefined || product.actualLevel < 0) {
        state.actualLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.actualLevel');
      } else {
        state.actualLevelAddError = false;
      }
      if (product.optimumLevel === undefined || product.optimumLevel < 0) {
        state.optimumLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.optimumLevel');
      } else {
        state.optimumLevelAddError = false;
      }
      if (product.replacementLevel === undefined || product.replacementLevel < 0) {
        state.replacementLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.replacementLevel');
      } else {
        state.replacementLevelAddError = false;
      }
      if (product.maximumLevel === undefined || product.maximumLevel < 0) {
        state.maximumLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.maximumLevel');
      } else {
        state.maximumLevelAddError = false;
      }
      if (product.optimumLevel < product.replacementLevel) {
        state.optimumLevelAddError = true;
        state.replacementLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.levels');
      } else {
        state.optimumLevelAddError = false;
        state.replacementLevelAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = product => {
      state.errorsUpdate = [];
      if (!product.type || product.type.length === 0) {
        state.typeUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.type');
      } else {
        state.typeUpdateError = false;
      }
      if (!product.measureType || product.measureType.length === 0) {
        state.measureTypeUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.measureType');
      } else {
        state.measureTypeUpdateError = false;
      }
      if (!product.order || product.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (product.actualLevel === undefined || product.actualLevel < 0) {
        state.actualLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.actualLevel');
      } else {
        state.actualLevelUpdateError = false;
      }
      if (product.optimumLevel === undefined || product.optimumLevel < 0) {
        state.optimumLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.optimumLevel');
      } else {
        state.optimumLevelUpdateError = false;
      }
      if (product.replacementLevel === undefined || product.replacementLevel < 0) {
        state.replacementLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.replacementLevel');
      } else {
        state.replacementLevelUpdateError = false;
      }
      if (product.maximumLevel === undefined || product.maximumLevel < 0) {
        state.maximumLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.maximumLevel');
      } else {
        state.maximumLevelUpdateError = false;
      }
      if (product.optimumLevel < product.replacementLevel) {
        state.optimumLevelUpdateError = true;
        state.replacementLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.levels');
      } else {
        state.optimumLevelUpdateError = true;
        state.replacementLevelUpdateError = true;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newProduct = {
        order: state.products.length + 1,
        online: true,
        productInfo: {},
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newProduct)) {
          state.newProduct.commerceId = commerce.value.id;
          await addProduct(state.newProduct);
          state.products = await getProductByCommerce(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newProduct = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async product => {
      try {
        loading.value = true;
        if (validateUpdate(product)) {
          await updateProduct(product.id, product);
          state.products = await getProductByCommerce(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async product => {
      try {
        loading.value = true;
        if (product && product.id) {
          product.available = false;
          product.active = false;
          await updateProduct(product.id, product);
          state.products = await getProductByCommerce(commerce.value.id);
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      commerce,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="commerce?.logo || state.business?.logo"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessProductsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessProductsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessProductsAdmin">
          <div v-if="isActiveBusiness && state.toggles['products.admin.view']">
            <div id="businessProductsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessProductsAdmin.message.4.title')"
                    :content="$t('businessProductsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessProductsAdmin-result" class="mt-4">
              <div>
                <div v-if="state.products.length === 0">
                  <Message
                    :title="$t('businessProductsAdmin.message.2.title')"
                    :content="$t('businessProductsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(product)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-product`"
                      :disabled="!state.toggles['products.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.products"
                    :type="'product'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(product, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ProductSimpleName :product="product"></ProductSimpleName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <ProductFormEdit
                      v-if="state.toggles['products.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      :product="product"
                      :types="state.types"
                      :measure-types="state.measureTypes"
                      :toggles="state.toggles"
                      :errors="{
                        tagError: false,
                        typeError: state.typeUpdateError,
                        measureTypeError: state.measureTypeUpdateError,
                        actualLevelError: state.actualLevelUpdateError,
                        optimumLevelError: state.optimumLevelUpdateError,
                        replacementLevelError: state.replacementLevelUpdateError,
                        maximumLevelError: state.maximumLevelUpdateError,
                        orderError: state.orderUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      @update:product="product = $event"
                    />
                    <div
                      v-if="state.toggles['products.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(product)"
                          :disabled="!state.toggles['products.admin.update']"
                        >
                          {{ $t('businessProductsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['products.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['products.admin.unavailable']"
                          :no-disabled="state.toggles['products.admin.unavailable']"
                          @actionYes="unavailable(product)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['products.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessProductsAdmin.message.1.title')"
                        :content="$t('businessProductsAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['products.admin.view']) && !loading">
            <Message
              :title="$t('businessProductsAdmin.message.1.title')"
              :content="$t('businessProductsAdmin.message.1.content')"
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
                  v-if="!loading || commerce?.logo || state.business?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce?.logo || state.business?.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessProductsAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessProductsAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessProductsAdmin">
          <div v-if="isActiveBusiness && state.toggles['products.admin.view']">
            <div id="businessProductsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessProductsAdmin.message.4.title')"
                    :content="$t('businessProductsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessProductsAdmin-result" class="mt-4">
              <div>
                <div v-if="state.products.length === 0">
                  <Message
                    :title="$t('businessProductsAdmin.message.2.title')"
                    :content="$t('businessProductsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(product)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-product`"
                      :disabled="!state.toggles['products.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.products"
                    :type="'product'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(product, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ProductSimpleName :product="product"></ProductSimpleName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <ProductFormEdit
                      v-if="state.toggles['products.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      :product="product"
                      :types="state.types"
                      :measure-types="state.measureTypes"
                      :toggles="state.toggles"
                      :errors="{
                        tagError: false,
                        typeError: state.typeUpdateError,
                        measureTypeError: state.measureTypeUpdateError,
                        actualLevelError: state.actualLevelUpdateError,
                        optimumLevelError: state.optimumLevelUpdateError,
                        replacementLevelError: state.replacementLevelUpdateError,
                        maximumLevelError: state.maximumLevelUpdateError,
                        orderError: state.orderUpdateError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      @update:product="product = $event"
                    />
                    <div
                      v-if="state.toggles['products.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(product)"
                          :disabled="!state.toggles['products.admin.update']"
                        >
                          {{ $t('businessProductsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['products.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['products.admin.unavailable']"
                          :no-disabled="state.toggles['products.admin.unavailable']"
                          @actionYes="unavailable(product)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['products.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessProductsAdmin.message.1.title')"
                        :content="$t('businessProductsAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['products.admin.view']) && !loading">
            <Message
              :title="$t('businessProductsAdmin.message.1.title')"
              :content="$t('businessProductsAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-product`"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t('add') }}</h5>
            <button
              id="close-modal"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-product"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['products.admin.add']"
            >
              <div v-if="state.products.length < state.toggles['products.admin.limit']">
                <ProductFormAdd
                  v-model="state.newProduct"
                  :types="state.types"
                  :measure-types="state.measureTypes"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    tagError: state.tagError,
                    typeError: state.typeAddError,
                    measureTypeError: state.measureTypeAddError,
                    actualLevelError: state.actualLevelAddError,
                    optimumLevelError: state.optimumLevelAddError,
                    replacementLevelError: state.replacementLevelAddError,
                    maximumLevelError: state.maximumLevelAddError,
                    orderError: state.orderAddError,
                    errorsAdd: state.errorsAdd,
                  }"
                  :max-order="state.products.length + 1"
                />
                <div class="col mt-3">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newProduct)"
                  >
                    {{ $t('businessProductsAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessProductsAdmin.message.3.title')"
                  :content="$t('businessProductsAdmin.message.3.content')"
                />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles */
.select,
.form-select-modern {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.select:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-select-modern {
  flex: 1;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.form-control {
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.text-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
}

.product-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.is-disabled {
  opacity: 0.5;
}

.show {
  padding: 10px;
  max-height: 1500px !important;
  overflow-y: auto;
}

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}

.result-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 0.2rem;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
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
