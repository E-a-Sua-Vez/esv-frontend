<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getActiveModulesByCommerceId } from '../../application/services/module';
import { getCollaboratorsByCommerceId, updateCollaborator, addCollaborator } from '../../application/services/collaborator';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CollaboratorName from '../../components/common/CollaboratorName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import Popper from "vue3-popper";

export default {
  name: 'BusinessCollaboratorsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, CollaboratorName, Toggle, ToggleCapabilities, Warning, Popper },
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
      modules: ref({}),
      collaborators: ref({}),
      commerce: {},
      showAdd: false,
      newCollaborator: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      phoneAddError: false,
      phoneUpdateError: false,
      moduleError: false,
      emailError: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.modules = await getActiveModulesByCommerceId(state.commerce.id);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
          state.collaborators = collaborators;
        }
        state.toggles = await getPermissions('collaborators', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
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

    const update = async (collaborator) => {
      try {
        loading.value = true;
        if (validateUpdate(collaborator)) {
          await updateCollaborator(collaborator.id, collaborator);
          const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
          state.collaborators = collaborators;
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newCollaborator = {
        bot: false
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
          state.newCollaborator = {}
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.modules = await getActiveModulesByCommerceId(state.commerce.id);
        const collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
        state.collaborators = collaborators;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
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
      selectCommerce
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("businessCollaboratorsAdmin.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessCollaboratorsAdmin.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessCollaboratorsAdmin"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessCollaboratorsAdmin">
        <div v-if="isActiveBusiness && state.toggles['collaborators.admin.view']">
          <div id="businessCollaboratorsAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessCollaboratorsAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-2 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
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
                <div class="col-8 text-labe">
                  <span>{{ $t("businessCollaboratorsAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.collaborators.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(collaborator)"
                    :disabled="!state.toggles['collaborators.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-collaborator" class="collaborator-card mb-4" v-if="state.showAdd && state.toggles['collaborators.admin.add']">
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
              <div v-for="(collaborator, index) in state.collaborators" :key="index" class="collaborator-card">
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
                          :disabled="true"
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
        <div v-if="(!isActiveBusiness() || !state.toggles['collaborators.admin.view']) && !loading">
          <Message
            :title="$t('businessCollaboratorsAdmin.message.1.title')"
            :content="$t('businessCollaboratorsAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.collaborator-card {
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
  max-height: 400px !important;
  overflow-y: auto;
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>