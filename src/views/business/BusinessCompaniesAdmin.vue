<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getCompanyByCommerce,
  updateCompany,
  addCompany,
} from '../../application/services/company';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import ServiceSimpleName from '../../components/common/ServiceSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import { getCompanyTypes } from '../../shared/utils/data';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';

export default {
  name: 'BusinessCompaniesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ServiceSimpleName,
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
      commerces: ref([]),
      companies: ref([]),
      commerce: {},
      showAdd: false,
      goToUnavailable: false,
      newCompany: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      tagError: false,
      typeError: false,
      orderAddError: false,
      orderUpdateError: false,
      estimatedTimeAddError: false,
      estimatedTimeUpdateError: false,
      types: [],
      toggles: {},
      filtered: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getCompanyTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.companies = await getCompanyByCommerce(state.commerce.id);
        }
        state.filtered = state.companies;
        state.toggles = await getPermissions('companies', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = service => {
      state.errorsAdd = [];
      if (!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!service.type || service.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (!service.tag || service.tag.length === 0) {
        state.tagError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.tag');
      } else {
        state.tagError = false;
      }
      if (!service.order || service.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessCompaniesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = service => {
      state.errorsUpdate = [];
      if (!service.name || service.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessCompaniesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!service.order || service.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessCompaniesAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newCompany = {
        order: state.companies.length + 1,
        online: true,
        serviceInfo: {},
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCompany)) {
          state.newCompany.commerceId = state.commerce.id;
          await addCompany(state.newCompany);
          state.companies = await getCompanyByCommerce(state.commerce.id);
          state.showAdd = false;
          closeAddModal();
          state.newCompany = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async service => {
      try {
        loading.value = true;
        if (validateUpdate(service)) {
          await updateCompany(service.id, service);
          state.companies = await getCompanyByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async service => {
      try {
        loading.value = true;
        if (service && service.id) {
          service.available = false;
          service.active = false;
          await updateCompany(service.id, service);
          state.companies = await getCompanyByCommerce(state.commerce.id);
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.companies = await getCompanyByCommerce(state.commerce.id);
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
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
      selectCommerce,
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
        <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessCompaniesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessCompaniesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div id="businessCompaniesAdmin">
          <div v-if="isActiveBusiness && state.toggles['companies.admin.view']">
            <div id="businessCompaniesAdmin-controls" class="control-box">
              <div class="row">
                <div class="col" v-if="state.commerces.length > 0">
                  <span>{{ $t('businessCompaniesAdmin.commerce') }} </span>
                  <select
                    class="btn btn-md fw-bold text-dark m-1 select"
                    v-model="state.commerce"
                    @change="selectCommerce(state.commerce)"
                    id="modules"
                  >
                    <option v-for="com in state.commerces" :key="com.id" :value="com">
                      {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                    </option>
                  </select>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessCompaniesAdmin.message.4.title')"
                    :content="$t('businessCompaniesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessCompaniesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.companies.length === 0">
                  <Message
                    :title="$t('businessCompaniesAdmin.message.2.title')"
                    :content="$t('businessCompaniesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(service)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-service`"
                      :disabled="!state.toggles['companies.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.companies"
                    :type="'companies'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(service, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ServiceSimpleName :service="service"></ServiceSimpleName>
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
                    <div
                      v-if="state.toggles['companies.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="row g-1">
                        <div id="queue-type-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessQueuesAdmin.type') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="true"
                              type="text"
                              class="form-control"
                              v-model="service.type"
                              placeholder="Type"
                            />
                          </div>
                        </div>
                        <div id="service-tag-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.tag') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.tagHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="service.tag"
                              v-bind:class="{ 'is-invalid': state.tagError }"
                              placeholder="Serv-A"
                            />
                          </div>
                        </div>
                        <div id="service-order-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.order') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.orderHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="!state.toggles['companies.admin.edit']"
                              min="1"
                              :max="state.companies.length"
                              type="number"
                              class="form-control"
                              v-model="service.order"
                              v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div id="service-online-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.online') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.onlineHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="service.online"
                              :disabled="!state.toggles['companies.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="service-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.active') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="service.active"
                              :disabled="!state.toggles['companies.admin.edit']"
                            />
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
                            :disabled="!state.toggles['companies.admin.update']"
                          >
                            {{ $t('businessCompaniesAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['companies.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['companies.admin.unavailable']"
                            :no-disabled="state.toggles['companies.admin.unavailable']"
                            @actionYes="unavailable(service)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                        <div
                          class="row g-1 errors"
                          id="feedback"
                          v-if="state.errorsUpdate.length > 0"
                        >
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
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['companies.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessCompaniesAdmin.message.1.title')"
                        :content="$t('businessCompaniesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['companies.admin.view']) && !loading">
            <Message
              :title="$t('businessCompaniesAdmin.message.1.title')"
              :content="$t('businessCompaniesAdmin.message.1.content')"
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
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.business.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.business.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessCompaniesAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessCompaniesAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessCompaniesAdmin">
          <div v-if="isActiveBusiness && state.toggles['companies.admin.view']">
            <div id="businessCompaniesAdmin-controls" class="control-box">
              <div class="row">
                <div class="col" v-if="state.commerces.length > 0">
                  <span>{{ $t('businessCompaniesAdmin.commerce') }} </span>
                  <select
                    class="btn btn-md fw-bold text-dark m-1 select"
                    v-model="state.commerce"
                    @change="selectCommerce(state.commerce)"
                    id="modules"
                  >
                    <option v-for="com in state.commerces" :key="com.id" :value="com">
                      {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                    </option>
                  </select>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessCompaniesAdmin.message.4.title')"
                    :content="$t('businessCompaniesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessCompaniesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.companies.length === 0">
                  <Message
                    :title="$t('businessCompaniesAdmin.message.2.title')"
                    :content="$t('businessCompaniesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(service)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-service`"
                      :disabled="!state.toggles['companies.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.companies"
                    :type="'companies'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(service, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ServiceSimpleName :service="service"></ServiceSimpleName>
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
                    <div
                      v-if="state.toggles['companies.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <div class="row g-1">
                        <div id="queue-type-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessQueuesAdmin.type') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="true"
                              type="text"
                              class="form-control"
                              v-model="service.type"
                              placeholder="Type"
                            />
                          </div>
                        </div>
                        <div id="service-tag-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.tag') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.tagHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="service.tag"
                              v-bind:class="{ 'is-invalid': state.tagError }"
                              placeholder="Serv-A"
                            />
                          </div>
                        </div>
                        <div id="service-order-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.order') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.orderHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="!state.toggles['companies.admin.edit']"
                              min="1"
                              :max="state.companies.length"
                              type="number"
                              class="form-control"
                              v-model="service.order"
                              v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                              placeholder="1"
                            />
                          </div>
                        </div>
                        <div id="service-online-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.online') }}
                            <Popper
                              :class="'dark p-1'"
                              arrow
                              disable-click-away
                              :content="$t('businessCompaniesAdmin.onlineHelp')"
                            >
                              <i class="bi bi-info-circle-fill h7"></i>
                            </Popper>
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="service.online"
                              :disabled="!state.toggles['companies.admin.edit']"
                            />
                          </div>
                        </div>
                        <div id="service-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCompaniesAdmin.active') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="service.active"
                              :disabled="!state.toggles['companies.admin.edit']"
                            />
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
                            :disabled="!state.toggles['companies.admin.update']"
                          >
                            {{ $t('businessCompaniesAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                          <button
                            class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                            @click="goToUnavailable()"
                            v-if="state.toggles['companies.admin.unavailable']"
                          >
                            {{ $t('businessQueuesAdmin.unavailable') }}
                            <i class="bi bi-trash-fill"></i>
                          </button>
                          <AreYouSure
                            :show="state.goToUnavailable"
                            :yes-disabled="state.toggles['companies.admin.unavailable']"
                            :no-disabled="state.toggles['companies.admin.unavailable']"
                            @actionYes="unavailable(service)"
                            @actionNo="unavailableCancel()"
                          >
                          </AreYouSure>
                        </div>
                        <div
                          class="row g-1 errors"
                          id="feedback"
                          v-if="state.errorsUpdate.length > 0"
                        >
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
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['companies.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessCompaniesAdmin.message.1.title')"
                        :content="$t('businessCompaniesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['companies.admin.view']) && !loading">
            <Message
              :title="$t('businessCompaniesAdmin.message.1.title')"
              :content="$t('businessCompaniesAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-service`"
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
            <Alert :show="loading" :stack="alertError"></Alert>
            <div
              id="add-service"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['companies.admin.add']"
            >
              <div v-if="state.companies.length < state.toggles['companies.admin.limit']">
                <div class="row g-1">
                  <div id="service-name-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t('businessCompaniesAdmin.name') }}
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newCompany.name"
                        v-bind:class="{ 'is-invalid': state.nameError }"
                        placeholder="Company A"
                      />
                    </div>
                  </div>
                  <div id="service-tag-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t('businessCompaniesAdmin.tag') }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disable-click-away
                        :content="$t('businessCompaniesAdmin.tagHelp')"
                      >
                        <i class="bi bi-info-circle-fill h7"></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newCompany.tag"
                        v-bind:class="{ 'is-invalid': state.tagError }"
                        placeholder="Serv-A"
                      />
                    </div>
                  </div>
                  <div id="service-type-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t('businessCompaniesAdmin.type') }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disable-click-away
                        :content="$t('businessCompaniesAdmin.typeHelp')"
                      >
                        <i class="bi bi-info-circle-fill h7"></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select"
                        v-model="state.newCompany.type"
                        id="types"
                        v-bind:class="{ 'is-invalid': state.typeError }"
                      >
                        <option v-for="typ in state.types" :key="typ.id" :value="typ.id">
                          {{ $t(`companies.types.${typ.id}`) }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div id="service-order-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t('businessCompaniesAdmin.order') }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disable-click-away
                        :content="$t('businessCompaniesAdmin.orderHelp')"
                      >
                        <i class="bi bi-info-circle-fill h7"></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        :max="state.companies.length + 1"
                        type="number"
                        class="form-control"
                        v-model="state.newCompany.order"
                        v-bind:class="{ 'is-invalid': state.orderAddError }"
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div id="add-service-online-form" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t('businessCompaniesAdmin.online') }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disable-click-away
                        :content="$t('businessCompaniesAdmin.onlineHelp')"
                      >
                        <i class="bi bi-info-circle-fill h7"></i>
                      </Popper>
                    </div>
                    <div class="col-6">
                      <Toggle
                        v-model="state.newCompany.online"
                        :disabled="!state.toggles['companies.admin.edit']"
                      />
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newCompany)"
                    >
                      {{ $t('businessCompaniesAdmin.add') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
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
                  :title="$t('businessCompaniesAdmin.message.3.title')"
                  :content="$t('businessCompaniesAdmin.message.3.content')"
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
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.service-details-container {
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
