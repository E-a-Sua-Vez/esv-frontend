<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getProductByCommerce, updateProduct, addProduct } from '../../application/services/product';
import { getPermissions } from '../../application/services/permissions';
import Popper from "vue3-popper";
import ProductSimpleName from '../../components/common/ProductSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getProductMeasureTypes, getProductsTypes } from '../../shared/utils/data';

export default {
  name: 'BusinessProductsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ProductSimpleName, Toggle, Warning, AreYouSure, Popper, ComponentMenu },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      products: ref([]),
      commerce: {},
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
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getProductsTypes();
        state.measureTypes = getProductMeasureTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.products = await getProductByCommerce(state.commerce.id);
        }
        state.toggles = await getPermissions('products', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const validateAdd = (product) => {
      state.errorsAdd = [];
      if(!product.name || product.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!product.tag || product.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if(!product.type || product.type.length === 0) {
        state.typeAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.type');
      } else {
        state.typeAddError = false;
      }
      if(!product.measureType || product.measureType.length === 0) {
        state.measureTypeAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.measureType');
      } else {
        state.measureTypeAddError = false;
      }
      if(!product.order || product.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if(!product.actualLevel || product.actualLevel <= 0) {
        state.actualLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.actualLevel');
      } else {
        state.actualLevelAddError = false;
      }
      if(!product.optimumLevel || product.optimumLevel <= 0) {
        state.optimumLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.optimumLevel');
      } else {
        state.optimumLevelAddError = false;
      }
      if(!product.replacementLevel || product.replacementLevel <= 0) {
        state.replacementLevelAddError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.replacementLevel');
      } else {
        state.replacementLevelAddError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (product) => {
      state.errorsUpdate = [];
      if(!product.type || product.type.length === 0) {
        state.typeUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.type');
      } else {
        state.typeUpdateError = false;
      }
      if(!product.measureType || product.measureType.length === 0) {
        state.measureTypeUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.measureType');
      } else {
        state.measureTypeUpdateError = false;
      }
      if(!product.order || product.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessProductsAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if(!product.actualLevel || product.actualLevel <= 0) {
        state.actualLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.actualLevel');
      } else {
        state.actualLevelUpdateError = false;
      }
      if(!product.optimumLevel || product.optimumLevel <= 0) {
        state.optimumLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.optimumLevel');
      } else {
        state.optimumLevelUpdateError = false;
      }
      if(!product.replacementLevel || product.replacementLevel <= 0) {
        state.replacementLevelUpdateError = true;
        state.errorsAdd.push('businessProductsAdmin.validate.replacementLevel');
      } else {
        state.replacementLevelUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newProduct = {
        order: state.products.length + 1,
        online: true,
        productInfo: {}
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newProduct)) {
          state.newProduct.commerceId = state.commerce.id;
          await addProduct(state.newProduct);
          state.products = await getProductByCommerce(state.commerce.id);
          state.showAdd = false;
          state.newProduct = {}
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (product) => {
      try {
        loading.value = true;
        if (validateUpdate(product)) {
          await updateProduct(product.id, product);
          state.products = await getProductByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (product) => {
      try {
        loading.value = true;
        if (product && product.id) {
          product.available = false;
          product.active = false;
          await updateProduct(product.id, product);
          state.products = await getProductByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    }

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.products = await getProductByCommerce(state.commerce.id);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

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
      selectCommerce,
      unavailable,
      goToUnavailable,
      unavailableCancel
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessProductsAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessProductsAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessProductsAdmin">
        <div v-if="isActiveBusiness && state.toggles['products.admin.view']">
          <div id="businessProductsAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessProductsAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessProductsAdmin.message.4.title')"
                  :content="$t('businessProductsAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessProductsAdmin-result" class="mt-4">
            <div>
              <div v-if="state.products.length === 0">
                <Message
                  :title="$t('businessProductsAdmin.message.2.title')"
                  :content="$t('businessProductsAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessProductsAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.products.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(product)"
                    :disabled="!state.toggles['products.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-product" class="product-card mb-4" v-if="state.showAdd && state.toggles['products.admin.add']">
                <div v-if="state.products.length < state.toggles['products.admin.limit']">
                  <div class="row g-1">
                    <div id="product-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.name") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newProduct.name"
                          v-bind:class="{ 'is-invalid': state.nameError }"
                          placeholder="Product A">
                      </div>
                    </div>
                    <div id="product-tag-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.tag") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.tagHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newProduct.tag"
                          v-bind:class="{ 'is-invalid': state.tagError }"
                          placeholder="Prod-A">
                      </div>
                    </div>
                    <div id="product-code-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.code") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.codeHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newProduct.code"
                          placeholder="External Code">
                      </div>
                    </div>
                    <div id="product-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.type") }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newProduct.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeAddError }">
                          <option v-for="typ in state.types" :key="typ.name" :value="typ.id">{{ $t(`productsTypes.${typ.name}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="product-measuretype-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.measureType") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.measureTypeHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newProduct.measureType"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.measureTypeAddError }">
                          <option v-for="typ in state.measureTypes" :key="typ.name" :value="typ.id">{{ $t(`productMeasuresTypes.${typ.name}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="product-actuallevel-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.actualLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.actualLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newProduct.actualLevel"
                          v-bind:class="{ 'is-invalid': state.actualLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-optimumLevel-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.optimumLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.optimumLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newProduct.optimumLevel"
                          v-bind:class="{ 'is-invalid': state.optimumLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-replacementLevel-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.replacementLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.replacementLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newProduct.replacementLevel"
                          v-bind:class="{ 'is-invalid': state.replacementLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.order") }}
                        <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessProductsAdmin.orderHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.products.length + 1"
                          type="number"
                          class="form-control"
                          v-model="state.newProduct.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="add-product-online-form" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessProductsAdmin.online") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessProductsAdmin.onlineHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <Toggle
                            v-model="state.newProduct.online"
                            :disabled="!state.toggles['products.admin.edit']"
                          />
                        </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newProduct)">
                        {{ $t("businessProductsAdmin.add") }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsAdd" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessProductsAdmin.message.3.title')"
                    :content="$t('businessProductsAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(product, index) in state.products" :key="index" class="product-card">
                <div class="row">
                  <div class="col-10">
                    <ProductSimpleName :product="product"></ProductSimpleName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['products.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="product-code-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.code") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.codeHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="product.code"
                          placeholder="External Code">
                      </div>
                    </div>
                    <div id="product-type-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.type") }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="product.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeError }">
                          <option v-for="typ in state.types" :key="typ.name" :value="typ.id">{{ $t(`productsTypes.${typ.name}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="product-measuretype-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.measureType") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.measureTypeHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="product.measureType"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.measureTypeError }">
                          <option v-for="typ in state.measureTypes" :key="typ.name" :value="typ.id">{{ $t(`productMeasuresTypes.${typ.name}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="product-actuallevel-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.actualLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.actualLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="product.actualLevel"
                          v-bind:class="{ 'is-invalid': state.actualLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-optimumLevel-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.optimumLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.optimumLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="product.optimumLevel"
                          v-bind:class="{ 'is-invalid': state.optimumLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-replacementLevel-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.replacementLevel") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.replacementLevelHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :min="0"
                          type="number"
                          class="form-control"
                          v-model="product.replacementLevel"
                          v-bind:class="{ 'is-invalid': state.replacementLevelAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-order-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.order") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.orderHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          :disabled="!state.toggles['products.admin.edit']"
                          min="1"
                          :max="state.products.length"
                          type="number"
                          class="form-control"
                          v-model="product.order"
                          v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="product-online-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.online") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessProductsAdmin.onlineHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="product.online"
                          :disabled="!state.toggles['products.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="product-active-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessProductsAdmin.active") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="product.active"
                          :disabled="!state.toggles['products.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="product-id-form" class="row -2 mb-g3">
                      <div class="row product-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ product.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(product)"
                        :disabled="!state.toggles['products.admin.update']">
                        {{ $t("businessProductsAdmin.update") }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['products.admin.unavailable']">
                        {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yesDisabled="state.toggles['products.admin.unavailable']"
                        :noDisabled="state.toggles['products.admin.unavailable']"
                        @actionYes="unavailable(product)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsUpdate.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsUpdate" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-if="(!isActiveBusiness() || !state.toggles['products.admin.read']) && !loading">
                  <Message
                    :title="$t('businessProductsAdmin.message.1.title')"
                    :content="$t('businessProductsAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['products.admin.view']) && !loading">
          <Message
            :title="$t('businessProductsAdmin.message.1.title')"
            :content="$t('businessProductsAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.product-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.product-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
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
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .5rem;
}
</style>