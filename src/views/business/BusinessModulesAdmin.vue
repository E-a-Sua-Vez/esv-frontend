<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getModulesByCommerceId, updateModule, addModule } from '../../application/services/module';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ModuleName from '../../components/common/ModuleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';

export default {
  name: 'BusinessModulesAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ModuleName, Toggle, ToggleCapabilities, Warning },
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
      commerce: {},
      showAdd: false,
      newQueue: {},
      extendedEntity: undefined,
      errorsAdd: [],
      nameError: false,
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
          const modules = await getModulesByCommerceId(state.commerce.id);
          state.modules = modules;
        }
        state.toggles = await getPermissions('modules', 'admin');
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

    const validateAdd = (module) => {
      state.errorsAdd = [];
      if(!module.name || module.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessModulesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = () => {
      state.errorsUpdate = [];
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const update = async (module) => {
      try {
        loading.value = true;
        if (validateUpdate()) {
          await updateModule(module.id, module);
          const modules = await getModulesByCommerceId(state.commerce.id);
          state.modules = modules;
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
      state.newQueue = {
        order: state.modules.length + 1
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newQueue)) {
          state.newQueue.commerceId = state.commerce.id;
          await addModule(state.newQueue);
          const modules = await getModulesByCommerceId(state.commerce.id);
          state.modules = modules;
          state.showAdd = false;
          state.newQueue = {};
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
        const selectedModules = await getModulesByCommerceId(state.commerce.id);
        state.modules = selectedModules;
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
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("businessModulesAdmin.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessModulesAdmin.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessModulesAdmin"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessModulesAdmin">
        <div v-if="isActiveBusiness && state.toggles['modules.admin.view']">
          <div id="businessModulesAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessModulesAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessModulesAdmin.message.4.title')"
                  :content="$t('businessModulesAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessModulesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.modules.length === 0">
                <Message
                  :title="$t('businessModulesAdmin.message.2.title')"
                  :content="$t('businessModulesAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessModulesAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.modules.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(module)"
                    :disabled="!state.toggles['modules.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-module" class="module-card mb-4" v-if="state.showAdd && state.toggles['modules.admin.add']">
                <div v-if="state.modules.length < state.toggles['modules.admin.limit']">
                  <div class="row g-1">
                    <div id="module-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessModulesAdmin.name") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newQueue.name"
                          v-bind:class="{ 'is-invalid': state.nameError }"
                          placeholder="Module A">
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newQueue)">
                        {{ $t("businessModulesAdmin.add") }} <i class="bi bi-save"></i>
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
                    :title="$t('businessModulesAdmin.message.3.title')"
                    :content="$t('businessModulesAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(module, index) in state.modules" :key="index" class="module-card">
                <div class="row">
                  <div class="col-10">
                    <ModuleName :name="module.name" :active="module.active"></ModuleName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['modules.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="module-active-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessModulesAdmin.active") }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="module.active"
                          :disabled="!state.toggles['modules.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="module-id-form" class="row -2 mb-g3">
                      <div class="row module-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ module.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(module)"
                        :disabled="!state.toggles['modules.admin.update']">
                        {{ $t("businessModulesAdmin.update") }} <i class="bi bi-save"></i>
                    </button>
                    </div>
                  </div>
                </div>
                <div v-if="(!isActiveBusiness() || !state.toggles['modules.admin.read']) && !loading">
                  <Message
                    :title="$t('businessModulesAdmin.message.1.title')"
                    :content="$t('businessModulesAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['modules.admin.view']) && !loading">
          <Message
            :title="$t('businessModulesAdmin.message.1.title')"
            :content="$t('businessModulesAdmin.message.1.content')" />
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
.module-card {
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
.module-details-container {
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
</style>