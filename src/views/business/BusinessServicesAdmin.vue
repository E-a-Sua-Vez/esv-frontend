<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getServiceByCommerce, updateService, addService } from '../../application/services/service';
import { getPermissions } from '../../application/services/permissions';
import Popper from "vue3-popper";
import ServiceSimpleName from '../../components/common/ServiceSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getServiceTypes } from '../../shared/utils/data';

export default {
  name: 'BusinessServicesAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ServiceSimpleName, Toggle, Warning, AreYouSure, Popper, ComponentMenu },
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
      services: ref([]),
      commerce: {},
      showAdd: false,
      goToUnavailable: false,
      newService: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagError: false,
      orderAddError: false,
      orderUpdateError: false,
      estimatedTimeAddError: false,
      estimatedTimeUpdateError: false,
      types: [],
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getServiceTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.services = await getServiceByCommerce(state.commerce.id);
        }
        state.toggles = await getPermissions('services', 'admin');
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

    const validateAdd = (service) => {
      state.errorsAdd = [];
      if(!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!service.tag || service.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if(!service.order || service.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if(!service.serviceInfo.estimatedTime || service.serviceInfo.estimatedTime.length === 0) {
        state.timeAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.estimatedTime');
      } else {
        state.timeAddError = false;
      }
      if(!service.serviceInfo.shortDescription || service.serviceInfo.shortDescription.length === 0) {
        state.timeAddError = true;
        state.errorsAdd.push('businessServicesAdmin.validate.shortDescription');
      } else {
        state.timeAddError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (service) => {
      state.errorsUpdate = [];
      if(!service.order || service.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessServicesAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newService = {
        order: state.services.length + 1,
        online: true,
        serviceInfo: {}
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newService)) {
          state.newService.commerceId = state.commerce.id;
          await addService(state.newService);
          state.services = await getServiceByCommerce(state.commerce.id);
          state.showAdd = false;
          state.newService = {}
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (service) => {
      try {
        loading.value = true;
        if (validateUpdate(service)) {
          await updateService(service.id, service);
          state.services = await getServiceByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (service) => {
      try {
        loading.value = true;
        if (service && service.id) {
          service.available = false;
          service.active = false;
          await updateService(service.id, service);
          state.services = await getServiceByCommerce(state.commerce.id);
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
        state.services = await getServiceByCommerce(state.commerce.id);
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
        :title="$t(`businessServicesAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessServicesAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessServicesAdmin">
        <div v-if="isActiveBusiness && state.toggles['services.admin.view']">
          <div id="businessServicesAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessServicesAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessServicesAdmin.message.4.title')"
                  :content="$t('businessServicesAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessServicesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.services.length === 0">
                <Message
                  :title="$t('businessServicesAdmin.message.2.title')"
                  :content="$t('businessServicesAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessServicesAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.services.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(service)"
                    :disabled="!state.toggles['services.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-service" class="service-card mb-4" v-if="state.showAdd && state.toggles['services.admin.add']">
                <div v-if="state.services.length < state.toggles['services.admin.limit']">
                  <div class="row g-1">
                    <div id="service-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessServicesAdmin.name") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newService.name"
                          v-bind:class="{ 'is-invalid': state.nameError }"
                          placeholder="Service A">
                      </div>
                    </div>
                    <div id="service-tag-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessServicesAdmin.tag") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessServicesAdmin.tagHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newService.tag"
                          v-bind:class="{ 'is-invalid': state.tagError }"
                          placeholder="Serv-A">
                      </div>
                    </div>
                    <div id="service-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessServicesAdmin.type") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessServicesAdmin.typeHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newService.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeError }">
                          <option v-for="typ in state.types" :key="typ.id" :value="typ.id">{{ $t(`services.types.${typ.id}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="service-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessServicesAdmin.order") }}
                        <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.orderHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.services.length + 1"
                          type="number"
                          class="form-control"
                          v-model="state.newService.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="add-service-online-form" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.online") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.onlineHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <Toggle
                            v-model="state.newService.online"
                            :disabled="!state.toggles['services.admin.edit']"
                          />
                        </div>
                      </div>
                    <!-- Datos de Servicio -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#add-service-info">
                        {{ $t("businessCommercesAdmin.service") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="add-service-info" class="collapse row m-0">
                      <div id="service-short-description-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.shortDescription") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newService.serviceInfo.shortDescription"
                            v-bind:class="{ 'is-invalid': state.shortDescriptionAddError }"
                            placeholder="Service A is great">
                        </div>
                      </div>
                      <div id="service-description-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.longDescription") }}
                        </div>
                        <div class="col-6">
                          <textarea
                            min="1"
                            max="500"
                            type="text"
                            class="form-control"
                            v-model="state.newService.serviceInfo.longDescription"
                            placeholder="Benefit A-Benefit B..."> </textarea>
                        </div>
                      </div>
                      <div id="service-time-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.estimatedTime") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.estimatedTimeHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.estimatedTime"
                            v-bind:class="{ 'is-invalid': state.estimatedTimeAddError }"
                            placeholder="1">
                        </div>
                      </div>
                      <div id="service-block-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.blockTime") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.blockTimeHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.blockTime"
                            placeholder="1">
                        </div>
                      </div>
                      <div id="service-price-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.price") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.price"
                            placeholder="1000">
                        </div>
                      </div>
                      <div id="service-onlinePrice-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.onlinePrice") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.onlinePrice"
                            placeholder="1000">
                        </div>
                      </div>
                      <div id="service-saving-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.saving") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.saving"
                            placeholder="25">
                        </div>
                      </div>
                      <div id="service-onlineSaving-form-add" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.onlineSaving") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="state.newService.serviceInfo.onlineSaving"
                            placeholder="30">
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newService)">
                        {{ $t("businessServicesAdmin.add") }} <i class="bi bi-save"></i>
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
                    :title="$t('businessServicesAdmin.message.3.title')"
                    :content="$t('businessServicesAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(service, index) in state.services" :key="index" class="service-card">
                <div class="row">
                  <div class="col-10">
                    <ServiceSimpleName :service="service"></ServiceSimpleName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['services.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="queue-type-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.type") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="true"
                          type="text"
                          class="form-control"
                          v-model="service.type"
                          placeholder="Type">
                      </div>
                    </div>
                    <div id="service-order-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessServicesAdmin.order") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessServicesAdmin.orderHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['services.admin.edit']"
                          min="1"
                          :max="state.services.length"
                          type="number"
                          class="form-control"
                          v-model="service.order"
                          v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="service-online-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessServicesAdmin.online") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessServicesAdmin.onlineHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="service.online"
                          :disabled="!state.toggles['services.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="service-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessServicesAdmin.active") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="service.active"
                          :disabled="!state.toggles['services.admin.edit']"
                        />
                      </div>
                    </div>
                    <!-- Datos de Servicio -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#update-service">
                        {{ $t("businessServicesAdmin.service") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="update-service" class="collapse row m-0">
                      <div id="service-short-description-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.shortDescription") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="service.serviceInfo.shortDescription"
                            v-bind:class="{ 'is-invalid': state.shortDescriptionUpdateError }"
                            placeholder="Service A is great">
                        </div>
                      </div>
                      <div id="service-description-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.longDescription") }}
                        </div>
                        <div class="col-6">
                          <textarea
                            min="1"
                            max="500"
                            type="text"
                            class="form-control"
                            v-model="service.serviceInfo.longDescription"
                            placeholder="Benefit A-Benefit B..."> </textarea>
                        </div>
                      </div>
                      <div id="service-time-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.estimatedTime") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.estimatedTimeHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.estimatedTime"
                            v-bind:class="{ 'is-invalid': state.estimatedTimeUpdateError }"
                            placeholder="1">
                        </div>
                      </div>
                      <div id="service-block-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.blockTime") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessServicesAdmin.blockTimeHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.blockTime"
                            placeholder="1">
                        </div>
                      </div>
                      <div id="service-price-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.price") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.price"
                            placeholder="1000">
                        </div>
                      </div>
                      <div id="service-onlinePrice-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.onlinePrice") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.onlinePrice"
                            placeholder="1000">
                        </div>
                      </div>
                      <div id="service-saving-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.saving") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.saving"
                            placeholder="25">
                        </div>
                      </div>
                      <div id="service-onlineSaving-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessServicesAdmin.onlineSaving") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="0"
                            type="number"
                            class="form-control"
                            v-model="service.serviceInfo.onlineSaving"
                            placeholder="30">
                        </div>
                      </div>
                    </div>
                    <div id="service-id-form" class="row -2 mb-g3">
                      <div class="row service-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ service.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(service)"
                        :disabled="!state.toggles['services.admin.update']">
                        {{ $t("businessServicesAdmin.update") }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['services.admin.unavailable']">
                        {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yesDisabled="state.toggles['services.admin.unavailable']"
                        :noDisabled="state.toggles['services.admin.unavailable']"
                        @actionYes="unavailable(service)"
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
                <div v-if="(!isActiveBusiness() || !state.toggles['services.admin.read']) && !loading">
                  <Message
                    :title="$t('businessServicesAdmin.message.1.title')"
                    :content="$t('businessServicesAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['services.admin.view']) && !loading">
          <Message
            :title="$t('businessServicesAdmin.message.1.title')"
            :content="$t('businessServicesAdmin.message.1.content')" />
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
.service-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.service-details-container {
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
</style>