<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import {
  getCollaboratorsByCommerceId,
  updateCollaborator,
  addCollaborator,
} from '../../application/services/collaborator';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import CollaboratorName from '../../components/common/CollaboratorName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from 'vue3-popper';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import { getCollaboratorTypes } from '../../shared/utils/data';
import CollaboratorFormEdit from '../../components/collaborator/CollaboratorFormEdit.vue';
import CollaboratorFormAdd from '../../components/collaborator/CollaboratorFormAdd.vue';

export default {
  name: 'BusinessCollaboratorsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    CollaboratorName,
    Toggle,
    Warning,
    Popper,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    CollaboratorFormEdit,
    CollaboratorFormAdd,
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
      allCommerces: ref([]),
      services: ref([]),
      modules: ref({}),
      collaborators: ref([]),
      types: [],
      commercesSelected: {},
      service: {},
      showAdd: false,
      goToUnavailable: false,
      newCollaborator: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      phoneAddError: false,
      phoneUpdateError: false,
      moduleError: false,
      emailError: false,
      typeError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load collaborators, modules, and services when commerce changes
    const loadCommerceData = async commerceId => {
      if (!commerceId) {
        state.collaborators = [];
        state.modules = {};
        state.services = [];
        state.filtered = [];
        return;
      }
      try {
        state.modules = await getActiveModulesByCommerceId(commerceId);
        const collaborators = await getCollaboratorsByCommerceId(commerceId);
        state.collaborators = collaborators || [];
        state.services = (await getServiceByCommerce(commerceId)) || [];
        state.filtered = state.collaborators;
        if (state.services.length > 0) {
          state.service = undefined;
        }
      } catch (error) {
        state.collaborators = [];
        state.modules = {};
        state.services = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload data
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.collaborators = [];
            state.filtered = [];
            state.modules = {};
            state.services = [];
            await loadCommerceData(newCommerce.id);
            loading.value = false;
          } catch (error) {
            loading.value = false;
          }
        }
      },
      { immediate: false }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getCollaboratorTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.allCommerces = await store.getAvailableCommerces(state.business.commerces);
        state.toggles = await getPermissions('collaborators', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          if (state.allCommerces && state.allCommerces.length > 0) {
            await store.setCurrentCommerce(state.allCommerces[0]);
          }
        }

        // Load data for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadCommerceData(commerceToUse.id);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = collaborator => {
      state.errorsAdd = [];
      if (collaborator.bot === true) {
        if (!collaborator.name || collaborator.name.length === 0) {
          state.nameError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.name');
        } else {
          state.nameError = false;
        }
      } else {
        if (!collaborator.name || collaborator.name.length === 0) {
          state.nameError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.name');
        } else {
          state.nameError = false;
        }
        if (!collaborator.email || collaborator.email.length < 10) {
          state.emailError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.email');
        } else {
          state.emailError = false;
        }
        if (!collaborator.type || collaborator.type.length === 0) {
          state.typeError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.type');
        } else {
          state.typeError = false;
        }
        if (!collaborator.phone || collaborator.phone.length < 10) {
          state.phoneAddError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.phone');
        } else {
          state.phoneAddError = false;
        }
        if (!collaborator.moduleId || collaborator.moduleId.length === 0) {
          state.moduleError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.module');
        } else {
          state.moduleError = false;
        }
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = collaborator => {
      state.errorsUpdate = [];
      if (collaborator.bot === true) {
        return true;
      }
      if (!collaborator.phone || collaborator.phone.length < 10) {
        state.phoneUpdateError = true;
        state.errorsUpdate.push('businessCollaboratorsAdmin.validate.phone');
      } else {
        state.phoneUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      const servicesId = [];
      const commercesId = [];
      state.showAdd = true;
      state.newCollaborator = {
        businessId: state.business.id,
        bot: false,
        servicesId,
        commercesId,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCollaborator)) {
          state.newCollaborator.commerceId = commerce.value.id;
          await addCollaborator(state.newCollaborator);
          const collaborators = await getCollaboratorsByCommerceId(commerce.value.id);
          state.collaborators = collaborators;
          state.showAdd = false;
          closeAddModal();
          state.newCollaborator = {};
        }
        state.extendedEntity = undefined;
        state.service = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async collaborator => {
      try {
        loading.value = true;
        if (validateUpdate(collaborator)) {
          await updateCollaborator(collaborator.id, collaborator);
          const collaborators = await getCollaboratorsByCommerceId(commerce.value.id);
          state.collaborators = collaborators;
        }
        state.extendedEntity = undefined;
        state.service = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async collaborator => {
      try {
        loading.value = true;
        if (collaborator && collaborator.id) {
          collaborator.available = false;
          collaborator.active = false;
          await updateCollaborator(collaborator.id, collaborator);
          const collaborators = await getCollaboratorsByCommerceId(commerce.value.id);
          state.collaborators = collaborators;
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

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const selectService = async (collaborator, service) => {
      if (service) {
        if (collaborator.servicesId && collaborator.servicesId.length >= 0) {
          if (!collaborator.servicesId.includes(service.id)) {
            collaborator.servicesId.push(service.id);
          }
        }
      }
    };

    const selectServiceIndex = async (index, service) => {
      if (!state.collaborators[index].servicesId) {
        state.collaborators[index].servicesId = [];
      }
      if (
        state.collaborators[index].servicesId &&
        state.collaborators[index].servicesId.length >= 0
      ) {
        if (!state.collaborators[index].servicesId.includes(service.id)) {
          state.collaborators[index].servicesId.push(service.id);
        }
      }
    };

    const deleteService = (collaborator, serviceId) => {
      if (collaborator && serviceId) {
        if (collaborator.servicesId && collaborator.servicesId.length >= 0) {
          if (collaborator.servicesId.includes(serviceId)) {
            const filtered = collaborator.servicesId.filter(com => com !== serviceId);
            collaborator.servicesId = filtered;
          }
        }
      }
    };

    const showService = serviceId => {
      if (state.services && state.services.length >= 1) {
        const service = state.services.find(com => com.id === serviceId);
        if (service) {
          return service.tag;
        }
      }
    };

    const selectCommerceSelected = async (collaborator, commerce) => {
      if (commerce) {
        if (collaborator.commercesId && collaborator.commercesId.length >= 0) {
          if (!collaborator.commercesId.includes(commerce.id)) {
            collaborator.commercesId.push(commerce.id);
          }
        }
      }
    };

    const selectCommerceIndex = async (index, commerce) => {
      if (!state.collaborators[index] || !state.collaborators[index].commercesId) {
        state.collaborators[index].commercesId = [];
      }
      if (
        state.collaborators[index].commercesId &&
        state.collaborators[index].commercesId.length >= 0
      ) {
        if (!state.collaborators[index].commercesId.includes(commerce.id)) {
          state.collaborators[index].commercesId.push(commerce.id);
        }
      }
    };

    const showCommerce = commerceId => {
      if (state.allCommerces && state.allCommerces.length >= 1) {
        const commerce = state.allCommerces.find(com => com.id === commerceId);
        if (commerce) {
          return commerce.tag;
        }
      }
    };

    const deleteCommerce = (collaborator, commerceId) => {
      if (collaborator.commercesId && collaborator.commercesId.length >= 0) {
        if (collaborator.commercesId.includes(commerceId)) {
          const filtered = collaborator.commercesId.filter(com => com !== commerceId);
          collaborator.commercesId = filtered;
        }
      }
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

    const resetAddForm = () => {
      const servicesId = [];
      const commercesId = [];
      state.newCollaborator = {
        businessId: state.business.id,
        bot: false,
        servicesId,
        commercesId,
      };
      state.errorsAdd = [];
      state.nameError = false;
      state.phoneAddError = false;
      state.moduleError = false;
      state.emailError = false;
      state.typeError = false;
    };

    const handleModalHide = () => {
      const closeButton = document.getElementById('close-modal');
      if (closeButton) {
        closeButton.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-collaborator');
      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        addModal.addEventListener('hide.bs.modal', handleModalHide);
      }
      document.addEventListener('mousedown', e => {
        if (e.target && e.target.closest('.modal-backdrop')) {
          handleModalHide();
        }
      });
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-collaborator');
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('hide.bs.modal', handleModalHide);
      }
    });

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
      selectService,
      deleteService,
      showService,
      selectServiceIndex,
      selectCommerceSelected,
      selectCommerceIndex,
      showCommerce,
      deleteCommerce,
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
          :title="$t(`businessCollaboratorsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessCollaboratorsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessCollaboratorsAdmin">
          <div v-if="isActiveBusiness && state.toggles['collaborators.admin.view']">
            <div id="businessCollaboratorsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessCollaboratorsAdmin.message.4.title')"
                    :content="$t('businessCollaboratorsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessCollaboratorsAdmin-result" class="mt-4">
              <div>
                <div v-if="state.collaborators.length === 0">
                  <Message
                    :title="$t('businessCollaboratorsAdmin.message.2.title')"
                    :content="$t('businessCollaboratorsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(collaborator)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-collaborator`"
                      :disabled="!state.toggles['collaborators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.collaborators"
                    :type="'collaborators'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(collaborator, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <CollaboratorName
                          :name="collaborator.name"
                          :email="collaborator.email"
                          :active="collaborator.active"
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
                      v-if="state.toggles['collaborators.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <CollaboratorFormEdit
                        :collaborator="collaborator"
                        :types="state.types"
                        :modules="state.modules"
                        :commerces="state.allCommerces"
                        :services="state.services"
                        :toggles="state.toggles"
                        :errors="{
                          nameError: false,
                          emailError: false,
                          typeError: false,
                          phoneAddError: false,
                          phoneUpdateError: state.phoneUpdateError,
                          moduleError: false,
                        }"
                        :on-select-commerce="
                          (collab, commerce) => selectCommerceIndex(index, commerce)
                        "
                        :on-select-service="(collab, service) => selectServiceIndex(index, service)"
                        :on-delete-commerce="
                          (collab, commerceId) => deleteCommerce(collab, commerceId)
                        "
                        :on-delete-service="(collab, serviceId) => deleteService(collab, serviceId)"
                        :show-commerce="showCommerce"
                        :show-service="showService"
                        @update:collaborator="collaborator = $event"
                      />
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(collaborator)"
                          :disabled="!state.toggles['collaborators.admin.update']"
                        >
                          {{ $t('businessCollaboratorsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['collaborators.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['collaborators.admin.unavailable']"
                          :no-disabled="state.toggles['collaborators.admin.unavailable']"
                          @actionYes="unavailable(collaborator)"
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
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['collaborators.admin.read']) &&
                        !loading
                      "
                    >
                      <Message
                        :title="$t('businessCollaboratorsAdmin.message.1.title')"
                        :content="$t('businessCollaboratorsAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['collaborators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessCollaboratorsAdmin.message.1.title')"
              :content="$t('businessCollaboratorsAdmin.message.1.content')"
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
              :title="$t(`businessCollaboratorsAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessCollaboratorsAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessCollaboratorsAdmin">
          <div v-if="isActiveBusiness && state.toggles['collaborators.admin.view']">
            <div id="businessCollaboratorsAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessCollaboratorsAdmin.message.4.title')"
                    :content="$t('businessCollaboratorsAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessCollaboratorsAdmin-result" class="mt-4">
              <div>
                <div v-if="state.collaborators.length === 0">
                  <Message
                    :title="$t('businessCollaboratorsAdmin.message.2.title')"
                    :content="$t('businessCollaboratorsAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(collaborator)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-collaborator`"
                      :disabled="!state.toggles['collaborators.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.collaborators"
                    :type="'collaborators'"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div
                    v-for="(collaborator, index) in state.filtered"
                    :key="index"
                    class="result-card"
                  >
                    <div class="row">
                      <div class="col-10">
                        <CollaboratorName
                          :name="collaborator.name"
                          :email="collaborator.email"
                          :active="collaborator.active"
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
                      v-if="state.toggles['collaborators.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <CollaboratorFormEdit
                        :collaborator="collaborator"
                        :types="state.types"
                        :modules="state.modules"
                        :commerces="state.allCommerces"
                        :services="state.services"
                        :toggles="state.toggles"
                        :errors="{
                          nameError: false,
                          emailError: false,
                          typeError: false,
                          phoneAddError: false,
                          phoneUpdateError: state.phoneUpdateError,
                          moduleError: false,
                        }"
                        :on-select-commerce="
                          (collab, commerce) => selectCommerceIndex(index, commerce)
                        "
                        :on-select-service="(collab, service) => selectServiceIndex(index, service)"
                        :on-delete-commerce="
                          (collab, commerceId) => deleteCommerce(collab, commerceId)
                        "
                        :on-delete-service="(collab, serviceId) => deleteService(collab, serviceId)"
                        :show-commerce="showCommerce"
                        :show-service="showService"
                        @update:collaborator="collaborator = $event"
                      />
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(collaborator)"
                          :disabled="!state.toggles['collaborators.admin.update']"
                        >
                          {{ $t('businessCollaboratorsAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['collaborators.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['collaborators.admin.unavailable']"
                          :no-disabled="state.toggles['collaborators.admin.unavailable']"
                          @actionYes="unavailable(collaborator)"
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
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['collaborators.admin.read']) &&
                        !loading
                      "
                    >
                      <Message
                        :title="$t('businessCollaboratorsAdmin.message.1.title')"
                        :content="$t('businessCollaboratorsAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="(!isActiveBusiness() || !state.toggles['collaborators.admin.view']) && !loading"
          >
            <Message
              :title="$t('businessCollaboratorsAdmin.message.1.title')"
              :content="$t('businessCollaboratorsAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-collaborator`"
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
              @mousedown.stop="handleModalHide"
            ></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-collaborator"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['collaborators.admin.add']"
            >
              <div v-if="state.collaborators.length < state.toggles['collaborators.admin.limit']">
                <CollaboratorFormAdd
                  v-model="state.newCollaborator"
                  :types="state.types"
                  :modules="state.modules"
                  :commerces="state.allCommerces"
                  :services="state.services"
                  :toggles="state.toggles"
                  :errors="{
                    nameError: state.nameError,
                    emailError: state.emailError,
                    typeError: state.typeError,
                    phoneAddError: state.phoneAddError,
                    phoneUpdateError: false,
                    moduleError: state.moduleError,
                  }"
                  :on-select-commerce="selectCommerceSelected"
                  :on-select-service="selectService"
                  :on-delete-commerce="deleteCommerce"
                  :on-delete-service="deleteService"
                  :show-commerce="showCommerce"
                  :show-service="showService"
                />
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newCollaborator)"
                  >
                    {{ $t('businessCollaboratorsAdmin.add') }} <i class="bi bi-save"></i>
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
              <div v-else>
                <Message
                  :title="$t('businessCollaboratorsAdmin.message.3.title')"
                  :content="$t('businessCollaboratorsAdmin.message.3.content')"
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
.collaborator-details-container {
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
  max-height: 800px !important;
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
