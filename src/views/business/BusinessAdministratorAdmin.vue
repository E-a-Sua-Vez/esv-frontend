<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getAdministratorsByBusinessId,
  updateAdministrator,
  addAdministrator,
} from '../../application/services/administrator';
import { getPermissions } from '../../application/services/permissions';
import CollaboratorName from '../../components/common/CollaboratorName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from 'vue3-popper';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessAdministratorsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    CollaboratorName,
    Toggle,
    Warning,
    Popper,
    ComponentMenu,
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
      commerces: ref(undefined),
      administrators: ref({}),
      commerce: {},
      showAdd: false,
      newAdministrator: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      emailError: false,
      toggles: {},
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        const administrators = await getAdministratorsByBusinessId(state.business.id);
        state.administrators = administrators;
        state.toggles = await getPermissions('administrators', 'admin');
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

    const validateAdd = administrator => {
      state.errorsAdd = [];
      if (!administrator.name || administrator.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessAdministratorAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!administrator.email || administrator.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessAdministratorAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = administrator => {
      state.errorsUpdate = [];
      if (administrator.bot === true) {
        return true;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async administrator => {
      try {
        loading.value = true;
        if (validateUpdate(administrator)) {
          await updateAdministrator(administrator.id, administrator);
          const administrators = await getAdministratorsByBusinessId(state.business.id);
          state.administrators = administrators;
        }
        state.commerce = undefined;
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      const commercesId = [];
      if (state.commerces && state.commerces.length === 1) {
        commercesId.push(state.commerces[0].id);
      }
      state.newAdministrator = {
        commercesId,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newAdministrator)) {
          state.newAdministrator.businessId = state.business.id;
          await addAdministrator(state.newAdministrator);
          const administrators = await getAdministratorsByBusinessId(state.business.id);
          state.administrators = administrators;
          state.showAdd = false;
          state.newAdministrator = {};
          state.commerce = undefined;
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const selectCommerce = async (administrator, commerce) => {
      if (administrator.commercesId && administrator.commercesId.length >= 0) {
        if (!administrator.commercesId.includes(commerce.id)) {
          administrator.commercesId.push(commerce.id);
        }
      }
    };

    const selectCommerceIndex = async (index, commerce) => {
      if (!state.administrators[index].commercesId) {
        state.administrators[index].commercesId = [];
      }
      if (
        state.administrators[index].commercesId &&
        state.administrators[index].commercesId.length >= 0
      ) {
        if (!state.administrators[index].commercesId.includes(commerce.id)) {
          state.administrators[index].commercesId.push(commerce.id);
        }
      }
    };

    const showCommerce = commerceId => {
      if (state.commerces && state.commerces.length >= 1) {
        const commerce = state.commerces.find(com => com.id === commerceId);
        if (commerce) {
          return commerce.tag;
        }
      }
    };

    const deleteCommerce = (administrator, commerceId) => {
      if (administrator.commercesId && administrator.commercesId.length >= 0) {
        if (administrator.commercesId.includes(commerceId)) {
          const filtered = administrator.commercesId.filter(com => com !== commerceId);
          administrator.commercesId = filtered;
        }
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
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
      showCommerce,
      deleteCommerce,
      selectCommerceIndex,
      commerce,
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
          :title="$t(`businessAdministratorAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessAdministratorAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessAdministratorAdmin">
          <div v-if="isActiveBusiness && state.toggles['administrators.admin.view']">
            <div v-if="!loading" id="businessAdministratorAdmin-result" class="mt-4">
              <div>
                <div v-if="state.administrators.length === 0">
                  <Message
                    :title="$t('businessAdministratorAdmin.message.2.title')"
                    :content="$t('businessAdministratorAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerces" class="row mb-2">
                  <div class="col-8 text-labe">
                    <span>{{ $t('businessAdministratorAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.administrators.length }}</span>
                  </div>
                  <div class="col-4">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(administrator)"
                      :disabled="!state.toggles['administrators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
                <div
                  id="add-administrator"
                  class="administrator-card mb-4"
                  v-if="state.showAdd && state.toggles['administrators.admin.add']"
                >
                  <div
                    v-if="state.administrators.length < state.toggles['administrators.admin.limit']"
                  >
                    <div class="row g-1">
                      <div id="administrator-name-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newAdministrator.name"
                            v-bind:class="{ 'is-invalid': state.nameError }"
                            placeholder="Jhon Pérez"
                          />
                        </div>
                      </div>
                      <div id="administrator-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="state.newAdministrator.email"
                            v-bind:class="{ 'is-invalid': state.emailError }"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="administrator-commerces-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.commerces') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md fw-bold text-dark m-1 select"
                            v-model="state.commerce"
                            @change="selectCommerce(state.newAdministrator, state.commerce)"
                            id="commerces"
                          >
                            <option v-for="com in state.commerces" :key="com.id" :value="com">
                              {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                            </option>
                          </select>
                          <div
                            class="select p-1"
                            v-if="
                              state.newAdministrator.commercesId &&
                              state.newAdministrator.commercesId.length > 0
                            "
                          >
                            <span
                              class="badge state rounded-pill bg-secondary p-2 mx-1"
                              v-for="com in state.newAdministrator.commercesId"
                              :key="com.id"
                            >
                              {{ showCommerce(com) }}
                              <button
                                type="button"
                                class="btn btn-md btn-close btn-close-white"
                                aria-label="Close"
                                @click="deleteCommerce(state.newAdministrator, com)"
                              ></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="add(state.newAdministrator)"
                        >
                          {{ $t('businessAdministratorAdmin.add') }} <i class="bi bi-save"></i>
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
                      :title="$t('businessAdministratorAdmin.message.3.title')"
                      :content="$t('businessAdministratorAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <div
                  v-for="(administrator, index) in state.administrators"
                  :key="index"
                  class="administrator-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <CollaboratorName
                        :name="administrator.name"
                        :email="administrator.email"
                        :active="administrator.active"
                      ></CollaboratorName>
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
                    v-if="state.toggles['administrators.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                  >
                    <div class="row g-1">
                      <div id="administrator-name-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="administrator.name"
                            placeholder="Jhon Pérez"
                          />
                        </div>
                      </div>
                      <div id="administrator-email-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="administrator.email"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="administrator-commerces-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.commerces') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md fw-bold text-dark m-1 select"
                            v-model="state.commerce"
                            @change="selectCommerceIndex(index, state.commerce)"
                            id="commerces"
                          >
                            <option v-for="com in state.commerces" :key="com.id" :value="com">
                              {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                            </option>
                          </select>
                          <div
                            class="select p-1"
                            v-if="administrator.commercesId && administrator.commercesId.length > 0"
                          >
                            <span
                              class="badge state rounded-pill bg-secondary p-2 mx-1"
                              v-for="com in administrator.commercesId"
                              :key="com.id"
                            >
                              {{ showCommerce(com) }}
                              <button
                                type="button"
                                class="btn btn-md btn-close btn-close-white"
                                aria-label="Close"
                                @click="deleteCommerce(administrator, com)"
                              ></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div id="administrator-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.active') }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="administrator.active"
                            :disabled="!state.toggles['administrators.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="administrator-id-form" class="row -2 mb-g3">
                        <div class="row administrator-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ administrator.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(administrator)"
                          :disabled="!state.toggles['administrators.admin.update']"
                        >
                          {{ $t('businessAdministratorAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
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
                      (!isActiveBusiness() || !state.toggles['administrators.admin.read']) &&
                      !loading
                    "
                  >
                    <Message
                      :title="$t('businessAdministratorAdmin.message.1.title')"
                      :content="$t('businessAdministratorAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['administrators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessAdministratorAdmin.message.1.title')"
              :content="$t('businessAdministratorAdmin.message.1.content')"
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
              :title="$t(`businessAdministratorAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessAdministratorAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessAdministratorAdmin">
          <div v-if="isActiveBusiness && state.toggles['administrators.admin.view']">
            <div v-if="!loading" id="businessAdministratorAdmin-result" class="mt-4">
              <div>
                <div v-if="state.administrators.length === 0">
                  <Message
                    :title="$t('businessAdministratorAdmin.message.2.title')"
                    :content="$t('businessAdministratorAdmin.message.2.content')"
                  />
                </div>
                <div v-if="state.commerces" class="row mb-2">
                  <div class="col-8 text-labe">
                    <span>{{ $t('businessAdministratorAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.administrators.length }}</span>
                  </div>
                  <div class="col-4">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(administrator)"
                      :disabled="!state.toggles['administrators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
                <div
                  id="add-administrator"
                  class="administrator-card mb-4"
                  v-if="state.showAdd && state.toggles['administrators.admin.add']"
                >
                  <div
                    v-if="state.administrators.length < state.toggles['administrators.admin.limit']"
                  >
                    <div class="row g-1">
                      <div id="administrator-name-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newAdministrator.name"
                            v-bind:class="{ 'is-invalid': state.nameError }"
                            placeholder="Jhon Pérez"
                          />
                        </div>
                      </div>
                      <div id="administrator-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="state.newAdministrator.email"
                            v-bind:class="{ 'is-invalid': state.emailError }"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="administrator-commerces-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.commerces') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md fw-bold text-dark m-1 select"
                            v-model="state.commerce"
                            @change="selectCommerce(state.newAdministrator, state.commerce)"
                            id="commerces"
                          >
                            <option v-for="com in state.commerces" :key="com.id" :value="com">
                              {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                            </option>
                          </select>
                          <div
                            class="select p-1"
                            v-if="
                              state.newAdministrator.commercesId &&
                              state.newAdministrator.commercesId.length > 0
                            "
                          >
                            <span
                              class="badge state rounded-pill bg-secondary p-2 mx-1"
                              v-for="com in state.newAdministrator.commercesId"
                              :key="com.id"
                            >
                              {{ showCommerce(com) }}
                              <button
                                type="button"
                                class="btn btn-md btn-close btn-close-white"
                                aria-label="Close"
                                @click="deleteCommerce(state.newAdministrator, com)"
                              ></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="add(state.newAdministrator)"
                        >
                          {{ $t('businessAdministratorAdmin.add') }} <i class="bi bi-save"></i>
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
                      :title="$t('businessAdministratorAdmin.message.3.title')"
                      :content="$t('businessAdministratorAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <div
                  v-for="(administrator, index) in state.administrators"
                  :key="index"
                  class="administrator-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <CollaboratorName
                        :name="administrator.name"
                        :email="administrator.email"
                        :active="administrator.active"
                      ></CollaboratorName>
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
                    v-if="state.toggles['administrators.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                  >
                    <div class="row g-1">
                      <div id="administrator-name-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="administrator.name"
                            placeholder="Jhon Pérez"
                          />
                        </div>
                      </div>
                      <div id="administrator-email-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="administrator.email"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="administrator-commerces-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.commerces') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md fw-bold text-dark m-1 select"
                            v-model="state.commerce"
                            @change="selectCommerceIndex(index, state.commerce)"
                            id="commerces"
                          >
                            <option v-for="com in state.commerces" :key="com.id" :value="com">
                              {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
                            </option>
                          </select>
                          <div
                            class="select p-1"
                            v-if="administrator.commercesId && administrator.commercesId.length > 0"
                          >
                            <span
                              class="badge state rounded-pill bg-secondary p-2 mx-1"
                              v-for="com in administrator.commercesId"
                              :key="com.id"
                            >
                              {{ showCommerce(com) }}
                              <button
                                type="button"
                                class="btn btn-md btn-close btn-close-white"
                                aria-label="Close"
                                @click="deleteCommerce(administrator, com)"
                              ></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div id="administrator-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdministratorAdmin.active') }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="administrator.active"
                            :disabled="!state.toggles['administrators.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="administrator-id-form" class="row -2 mb-g3">
                        <div class="row administrator-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ administrator.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(administrator)"
                          :disabled="!state.toggles['administrators.admin.update']"
                        >
                          {{ $t('businessAdministratorAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
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
                      (!isActiveBusiness() || !state.toggles['administrators.admin.read']) &&
                      !loading
                    "
                  >
                    <Message
                      :title="$t('businessAdministratorAdmin.message.1.title')"
                      :content="$t('businessAdministratorAdmin.message.1.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['administrators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessAdministratorAdmin.message.1.title')"
              :content="$t('businessAdministratorAdmin.message.1.content')"
            />
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
.administrator-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.administrator-details-container {
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
  max-height: 400px !important;
  overflow-y: auto;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.btn-close {
  height: 0em !important;
}
</style>
