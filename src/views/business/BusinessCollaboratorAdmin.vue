<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import { getCollaboratorsByCommerceId, updateCollaborator, addCollaborator } from '../../application/services/collaborator';
import { getPermissions } from '../../application/services/permissions';
import { getServiceByCommerce } from '../../application/services/service';
import CollaboratorName from '../../components/common/CollaboratorName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from "vue3-popper";
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import { getCollaboratorTypes } from '../../shared/utils/data';

export default {
  name: 'BusinessCollaboratorsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, CollaboratorName, Toggle, Warning, Popper, AreYouSure, ComponentMenu, SearchAdminItem },
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
      modules: ref({}),
      collaborators: ref([]),
      types: [],
      commerce: {},
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
      filtered: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getCollaboratorTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.modules = await getActiveModulesByCommerceId(state.commerce.id);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
          state.collaborators = collaborators;
          state.services = await getServiceByCommerce(state.commerce.id);
          if (state.services.length > 0) {
            state.service = undefined;
          }
        }
        state.filtered = state.collaborators;
        state.toggles = await getPermissions('collaborators', 'admin');
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

    const validateAdd = (collaborator) => {
      state.errorsAdd = [];
      if(collaborator.bot === true) {
        if(!collaborator.name || collaborator.name.length === 0) {
          state.nameError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.name');
        } else {
          state.nameError = false;
        }
      } else {
        if(!collaborator.name || collaborator.name.length === 0) {
          state.nameError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.name');
        } else {
          state.nameError = false;
        }
        if(!collaborator.email || collaborator.email.length < 10) {
          state.emailError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.email');
        } else {
          state.emailError = false;
        }
        if(!collaborator.type || collaborator.type.length === 0) {
          state.typeError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.type');
        } else {
          state.typeError = false;
        }
        if(!collaborator.phone || collaborator.phone.length < 10) {
          state.phoneAddError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.phone');
        } else {
          state.phoneAddError = false;
        }
        if(!collaborator.moduleId || collaborator.moduleId.length === 0) {
          state.moduleError = true;
          state.errorsAdd.push('businessCollaboratorsAdmin.validate.module');
        } else {
          state.moduleError = false;
        }
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (collaborator) => {
      state.errorsUpdate = [];
      if(collaborator.bot === true) {
        return true;
      }
      if(!collaborator.phone || collaborator.phone.length < 10) {
        state.phoneUpdateError = true;
        state.errorsUpdate.push('businessCollaboratorsAdmin.validate.phone');
      } else {
        state.phoneUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      const servicesId = [];
      const commercesId = [];
      state.showAdd = true;
      state.newCollaborator = {
        businessId: state.business.id,
        bot: false,
        servicesId,
        commercesId
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCollaborator)) {
          state.newCollaborator.commerceId = state.commerce.id;
          await addCollaborator(state.newCollaborator);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
          state.collaborators = collaborators;
          state.showAdd = false;
          closeAddModal();
          state.newCollaborator = { }
        }
        state.extendedEntity = undefined;
        state.service = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (collaborator) => {
      try {
        loading.value = true;
        if (validateUpdate(collaborator)) {
          await updateCollaborator(collaborator.id, collaborator);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
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
    }

    const unavailable = async (collaborator) => {
      try {
        loading.value = true;
        if (collaborator && collaborator.id) {
          collaborator.available = false;
          collaborator.active = false;
          await updateCollaborator(collaborator.id, collaborator);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
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
        state.modules = await getActiveModulesByCommerceId(state.commerce.id);
        const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
        state.collaborators = collaborators;
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

    const selectService = async (collaborator, service) => {
      if (service) {
        if (collaborator.servicesId && collaborator.servicesId.length >= 0) {
          if (!collaborator.servicesId.includes(service.id)) {
            collaborator.servicesId.push(service.id);
          }
        }
      }
    }

    const selectServiceIndex = async (index, service) => {
      if (!state.collaborators[index].servicesId) {
        state.collaborators[index].servicesId = []
      }
      if (state.collaborators[index].servicesId && state.collaborators[index].servicesId.length >= 0) {
        if (!state.collaborators[index].servicesId.includes(service.id)) {
          state.collaborators[index].servicesId.push(service.id);
        }
      }
    }

    const deleteService = (collaborator, serviceId) => {
      if (collaborator && serviceId) {
        if (collaborator.servicesId && collaborator.servicesId.length >= 0) {
          if (collaborator.servicesId.includes(serviceId)) {
            const filtered = collaborator.servicesId.filter(com => com !== serviceId);
            collaborator.servicesId = filtered;
          }
        }
      }
    }

    const showService = (serviceId) => {
      if (state.services && state.services.length >= 1) {
        const service = state.services.find(com => com.id === serviceId);
        if (service) {
          return service.tag;
        }
      }
    }

    const selectCommerceSelected = async (collaborator, commerce) => {
      if (commerce) {
        if (collaborator.commercesId && collaborator.commercesId.length >= 0) {
          if (!collaborator.commercesId.includes(commerce.id)) {
            collaborator.commercesId.push(commerce.id);
          }
        }
      }
    }

    const selectCommerceIndex = async (index, commerce) => {
      if (!state.collaborators[index] || !state.collaborators[index].commercesId) {
        state.collaborators[index].commercesId = []
      }
      if (state.collaborators[index].commercesId && state.collaborators[index].commercesId.length >= 0) {
        if (!state.collaborators[index].commercesId.includes(commerce.id)) {
          state.collaborators[index].commercesId.push(commerce.id);
        }
      }
    }

    const showCommerce = (commerceId) => {
      if (state.commerces && state.commerces.length >= 1) {
        const commerce = state.commerces.find(com => com.id === commerceId);
        if (commerce) {
          return commerce.tag;
        }
      }
    }

    const deleteCommerce = (collaborator, commerceId) => {
      if (collaborator.commercesId && collaborator.commercesId.length >= 0) {
        if (collaborator.commercesId.includes(commerceId)) {
          const filtered = collaborator.commercesId.filter(com => com !== commerceId);
          collaborator.commercesId = filtered;
        }
      }
    }

    const receiveFilteredItems = (items) => {
      state.filtered = items;
    }

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
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
      receiveFilteredItems
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessCollaboratorsAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessCollaboratorsAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessCollaboratorsAdmin">
        <div v-if="isActiveBusiness && state.toggles['collaborators.admin.view']">
          <div id="businessCollaboratorsAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessCollaboratorsAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessCollaboratorsAdmin.message.4.title')"
                  :content="$t('businessCollaboratorsAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessCollaboratorsAdmin-result" class="mt-4">
            <div>
              <div v-if="state.collaborators.length === 0">
                <Message
                  :title="$t('businessCollaboratorsAdmin.message.2.title')"
                  :content="$t('businessCollaboratorsAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(collaborator)"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-collaborator`"
                    :disabled="!state.toggles['collaborators.admin.add']">
                    <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                  </button>
                </div>
              </div>
              <div>
                <SearchAdminItem
                  :businessItems="state.collaborators"
                  :type="'collaborators'"
                  :receiveFilteredItems="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div v-for="(collaborator, index) in state.filtered" :key="index" class="result-card">
                  <div class="row">
                    <div class="col-10">
                      <CollaboratorName :name="collaborator.name" :email="collaborator.email" :active="collaborator.active"></CollaboratorName>
                    </div>
                    <div class="col-2">
                      <a
                        href="#"
                        @click.prevent="showUpdateForm(index)">
                        <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                      </a>
                    </div>
                  </div>
                  <div v-if="state.toggles['collaborators.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                    >
                    <div class="row g-1">
                      <div id="collaborator-name-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.name") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="collaborator.name"
                            placeholder="Jhon Pérez">
                        </div>
                      </div>
                      <div id="collaborator-email-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.email") }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="true"
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="collaborator.email"
                            placeholder="name@email.com">
                        </div>
                      </div>
                      <div id="collaborator-alias-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.alias") }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disableClickAway
                            :content="$t('businessCollaboratorsAdmin.aliasHelp')">
                            <i class='bi bi-info-circle-fill h7'></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="collaborator.alias"
                            placeholder="Jhon Pérez">
                        </div>
                      </div>
                      <div id="collaborator-type-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.type") }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select"
                            v-model="collaborator.type"
                            id="modules-edit"
                            :disabled="!state.toggles['collaborators.admin.edit']"
                            >
                            <option v-for="typ in state.types" :key="typ.name" :value="typ.type">{{ typ.name }}</option>
                          </select>
                        </div>
                      </div>
                      <div id="collaborator-commerces-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.commerces") }}
                        </div>
                        <div class="col-8">
                          <select class="btn btn-md fw-bold text-dark select" v-model="state.commerceSelected" @change="selectCommerceIndex(index, state.commerceSelected)" id="commerces">
                            <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                          </select>
                          <div class="select p-1" v-if="collaborator.commercesId &&  collaborator.commercesId.length > 0">
                            <span class="badge state rounded-pill bg-secondary p-2 mx-1" v-for="com in collaborator.commercesId" :key="com.id">
                              {{ showCommerce(com) }}
                              <button type="button" class="btn btn-md btn-close btn-close-white" aria-label="Close" @click="deleteCommerce(collaborator, com)"></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div id="collaborator-services-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.services") }}
                        </div>
                        <div class="col-8">
                          <select class="btn btn-md fw-bold text-dark select" v-model="state.service" @change="selectServiceIndex(index, state.service)" id="services">
                            <option v-for="com in state.services" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                          </select>
                          <div class="select p-1" v-if="collaborator.servicesId &&  collaborator.servicesId.length > 0">
                            <span class="badge state rounded-pill bg-secondary p-2 mx-1" v-for="com in collaborator.servicesId" :key="com.id">
                              {{ showService(com) }}
                              <button type="button" class="btn btn-md btn-close btn-close-white" aria-label="Close" @click="deleteService(collaborator, com)"></button>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div id="collaborator-phone-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.phone") }}
                        </div>
                        <div class="col-8">
                          <input
                            :disabled="!state.toggles['collaborators.admin.edit']"
                            min="10"
                            type="tel"
                            class="form-control"
                            v-model="collaborator.phone"
                            v-bind:class="{ 'is-invalid': state.phoneUpdateError }"
                            placeholder="Cod. Pais + Numero">
                        </div>
                      </div>
                      <div id="collaborator-module-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.module") }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select"
                            v-model="collaborator.moduleId"
                            id="modules-edit"
                            :disabled="!state.toggles['collaborators.admin.edit']"
                            >
                            <option v-for="mod in state.modules" :key="mod.name" :value="mod.id">{{ mod.name }}</option>
                          </select>
                        </div>
                      </div>
                      <div id="collaborator-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.active") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="collaborator.active"
                            :disabled="!state.toggles['collaborators.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="collaborator-bot-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCollaboratorsAdmin.bot") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="collaborator.bot"
                            :disabled="!state.toggles['collaborators.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="collaborator-id-form" class="row -2 mb-g3">
                        <div class="row collaborator-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ collaborator.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(collaborator)"
                          :disabled="!state.toggles['collaborators.admin.update']">
                          {{ $t("businessCollaboratorsAdmin.update") }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['collaborators.admin.unavailable']">
                          {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yesDisabled="state.toggles['collaborators.admin.unavailable']"
                          :noDisabled="state.toggles['collaborators.admin.unavailable']"
                          @actionYes="unavailable(collaborator)"
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
                  <div v-if="(!isActiveBusiness() || !state.toggles['collaborators.admin.read']) && !loading">
                    <Message
                      :title="$t('businessCollaboratorsAdmin.message.1.title')"
                      :content="$t('businessCollaboratorsAdmin.message.1.content')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['collaborators.admin.view']) && !loading">
          <Message
            :title="$t('businessCollaboratorsAdmin.message.1.title')"
            :content="$t('businessCollaboratorsAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-collaborator`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-collaborator" class="result-card mb-4" v-if="state.showAdd && state.toggles['collaborators.admin.add']">
              <div v-if="state.collaborators.length < state.toggles['collaborators.admin.limit']">
                <div class="row g-1">
                  <div id="collaborator-name-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.name") }}
                    </div>
                    <div class="col-8">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newCollaborator.name"
                        v-bind:class="{ 'is-invalid': state.nameError }"
                        placeholder="Jhon Pérez">
                    </div>
                  </div>
                  <div id="collaborator-email-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.email") }}
                    </div>
                    <div class="col-8">
                      <input
                        min="10"
                        type="email"
                        class="form-control"
                        v-model="state.newCollaborator.email"
                        v-bind:class="{ 'is-invalid': state.emailError }"
                        placeholder="name@email.com">
                    </div>
                  </div>
                  <div id="collaborator-alias-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.alias") }}
                      <Popper
                        :class="'dark p-1'"
                        arrow
                        disableClickAway
                        :content="$t('businessCollaboratorsAdmin.aliasHelp')">
                        <i class='bi bi-info-circle-fill h7'></i>
                      </Popper>
                    </div>
                    <div class="col-8">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newCollaborator.alias"
                        placeholder="Jhon Pérez">
                    </div>
                  </div>
                  <div id="collaborator-type-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.type") }}
                    </div>
                    <div class="col-8">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select"
                        v-model="state.newCollaborator.type"
                        id="types"
                        v-bind:class="{ 'is-invalid': state.typeError }">
                        <option v-for="typ in state.types" :key="typ.name" :value="typ.type">{{ typ.name }}</option>
                      </select>
                    </div>
                  </div>
                  <div id="collaborator-commerces-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.commerces") }}
                    </div>
                    <div class="col-8">
                      <select class="btn btn-md fw-bold text-dark select" v-model="state.commercesSelected" @change="selectCommerceSelected(state.newCollaborator, state.commercesSelected)" id="commerces">
                        <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                      </select>
                      <div class="select p-1" v-if=" state.newCollaborator.commercesId &&  state.newCollaborator.commercesId.length > 0">
                        <span class="badge state rounded-pill bg-secondary p-2 mx-1" v-for="com in state.newCollaborator.commercesId" :key="com.id">
                          {{ showCommerce(com) }}
                          <button type="button" class="btn btn-md btn-close btn-close-white" aria-label="Close" @click="deleteCommerce(state.newCollaborator, com)"></button>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div id="collaborator-services-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.services") }}
                    </div>
                    <div class="col-8">
                      <select class="btn btn-md fw-bold text-dark select" v-model="state.service" @change="selectService(state.newCollaborator, state.service)" id="services">
                        <option v-for="com in state.services" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                      </select>
                      <div class="select p-1" v-if=" state.newCollaborator.servicesId &&  state.newCollaborator.servicesId.length > 0">
                        <span class="badge state rounded-pill bg-secondary p-2 mx-1" v-for="com in state.newCollaborator.servicesId" :key="com.id">
                          {{ showService(com) }}
                          <button type="button" class="btn btn-md btn-close btn-close-white" aria-label="Close" @click="deleteService(state.newCollaborator, com)"></button>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div id="collaborator-phone-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.phone") }}
                    </div>
                    <div class="col-8">
                      <input
                        min="10"
                        type="tel"
                        class="form-control"
                        v-model="state.newCollaborator.phone"
                        v-bind:class="{ 'is-invalid': state.phoneAddError }"
                        placeholder="Cod. Pais + Numero">
                    </div>
                  </div>
                  <div id="collaborator-module-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.module") }}
                    </div>
                    <div class="col-8">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select"
                        v-model="state.newCollaborator.moduleId"
                        id="modules"
                        v-bind:class="{ 'is-invalid': state.moduleError }">
                        <option v-for="mod in state.modules" :key="mod.name" :value="mod.id">{{ mod.name }}</option>
                      </select>
                    </div>
                  </div>
                  <div id="collaborator-bot-form-add" class="row g-1">
                    <div class="col-4 text-label">
                      {{ $t("businessCollaboratorsAdmin.bot") }}
                    </div>
                    <div class="col-8">
                      <Toggle
                        v-model="state.newCollaborator.bot"
                      />
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newCollaborator)">
                      {{ $t("businessCollaboratorsAdmin.add") }} <i class="bi bi-save"></i>
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
                  :title="$t('businessCollaboratorsAdmin.message.3.title')"
                  :content="$t('businessCollaboratorsAdmin.message.3.content')" />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
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
.collaborator-details-container {
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