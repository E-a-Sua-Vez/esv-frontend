<script>
import { ref, reactive, onBeforeMount, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getModulesByCommerceId, updateModule, addModule } from '../../application/services/module';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ModuleName from '../../components/common/ModuleName.vue';
import ModuleFormEdit from '../../components/module/ModuleFormEdit.vue';
import ModuleFormAdd from '../../components/module/ModuleFormAdd.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessModulesAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ModuleName,
    ModuleFormEdit,
    ModuleFormAdd,
    Toggle,
    ToggleCapabilities,
    Warning,
    AreYouSure,
    ComponentMenu,
    SearchAdminItem,
    DesktopPageHeader,
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
      goToUnavailable: false,
      modules: ref([]),
      showAdd: false,
      newQueue: {},
      extendedEntity: undefined,
      errorsAdd: [],
      nameError: false,
      toggles: {},
      filtered: [],
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    // Load modules when commerce changes
    const loadModules = async commerceId => {
      if (!commerceId) {
        state.modules = [];
        state.filtered = [];
        return;
      }
      try {
        const modules = await getModulesByCommerceId(commerceId);
        state.modules = modules || [];
        state.filtered = state.modules;
      } catch (error) {
        state.modules = [];
        state.filtered = [];
      }
    };

    // Watch for commerce changes and reload modules
    watch(
      commerce,
      async (newCommerce, oldCommerce) => {
        if (newCommerce && newCommerce.id && (!oldCommerce || oldCommerce.id !== newCommerce.id)) {
          try {
            loading.value = true;
            // Immediately clear data to prevent showing old results
            state.modules = [];
            state.filtered = [];
            await loadModules(newCommerce.id);
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
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('modules', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        // Load modules for current commerce
        const commerceToUse = store.getCurrentCommerce;
        if (commerceToUse && commerceToUse.id) {
          await loadModules(commerceToUse.id);
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

    const validateAdd = module => {
      state.errorsAdd = [];
      if (!module.name || module.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessModulesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = () => {
      state.errorsUpdate = [];
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newQueue = {
        order: state.modules.length + 1,
        active: true,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newQueue)) {
          state.newQueue.commerceId = commerce.value.id;
          await addModule(state.newQueue);
          state.modules = await getModulesByCommerceId(commerce.value.id);
          state.showAdd = false;
          closeAddModal();
          state.newQueue = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async module => {
      try {
        loading.value = true;
        if (validateUpdate()) {
          await updateModule(module.id, module);
          state.modules = await getModulesByCommerceId(commerce.value.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async module => {
      try {
        loading.value = true;
        if (module && module.id) {
          module.available = false;
          module.active = false;
          await updateModule(module.id, module);
          state.modules = await getModulesByCommerceId(commerce.value.id);
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

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

    const resetAddForm = () => {
      state.newQueue = {
        order: state.modules.length + 1,
        active: true,
      };
      state.errorsAdd = [];
      state.nameError = false;
      state.showAdd = false;
    };

    const handleCloseButtonMousedown = e => {
      // Remove focus immediately on mousedown (before click) to avoid aria-hidden warning
      if (e.target && (e.target.id === 'close-modal' || e.target.closest('#close-modal'))) {
        const button = e.target.id === 'close-modal' ? e.target : e.target.closest('#close-modal');
        if (button) {
          button.blur();
          // Also blur any active element to ensure no focus remains
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }
      }
    };

    const handleModalBackdropClick = e => {
      // Remove focus when clicking backdrop to close modal
      if (e.target === e.currentTarget && document.activeElement) {
        document.activeElement.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-module');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        // Remove focus when clicking backdrop
        addModal.addEventListener('click', handleModalBackdropClick);
      }

      // Use mousedown (fires before click) to remove focus early
      if (closeButton) {
        closeButton.addEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      // Also listen on the document for any close button clicks
      document.addEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-module');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('click', handleModalBackdropClick);
      }

      if (closeButton) {
        closeButton.removeEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      document.removeEventListener('mousedown', handleCloseButtonMousedown, true);
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
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessModulesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessModulesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessModulesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['modules.admin.view']">
            <div id="businessModulesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessModulesAdmin.message.4.title')"
                    :content="$t('businessModulesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessModulesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.modules.length === 0">
                  <Message
                    :title="$t('businessModulesAdmin.message.2.title')"
                    :content="$t('businessModulesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(module)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-module`"
                      :disabled="!state.toggles['modules.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.modules"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(module, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ModuleName :name="module.name" :active="module.active"></ModuleName>
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
                      v-if="state.toggles['modules.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <ModuleFormEdit :module="module" :toggles="state.toggles" :errors="{}" />
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(module)"
                          v-if="state.toggles['modules.admin.update']"
                        >
                          {{ $t('businessModulesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['modules.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['modules.admin.unavailable']"
                          :no-disabled="state.toggles['modules.admin.unavailable']"
                          @actionYes="unavailable(module)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['modules.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessModulesAdmin.message.1.title')"
                        :content="$t('businessModulesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['modules.admin.view']) && !loading">
            <Message
              :title="$t('businessModulesAdmin.message.1.title')"
              :content="$t('businessModulesAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="container-fluid">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <DesktopPageHeader
          :logo="commerce?.logo || state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessModulesAdmin.title')"
          :toggles="state.toggles"
          component-name="businessModulesAdmin"
          @go-back="goBack"
        />
        <div id="businessModulesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['modules.admin.view']">
            <div id="businessModulesAdmin-controls" class="control-box">
              <div class="row">
                <div v-if="!commerce">
                  <Message
                    :title="$t('businessModulesAdmin.message.4.title')"
                    :content="$t('businessModulesAdmin.message.4.content')"
                  />
                </div>
              </div>
            </div>
            <div v-if="!loading" id="businessModulesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.modules.length === 0">
                  <Message
                    :title="$t('businessModulesAdmin.message.2.title')"
                    :content="$t('businessModulesAdmin.message.2.content')"
                  />
                </div>
                <div v-if="commerce" class="row mb-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(module)"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-module`"
                      :disabled="!state.toggles['modules.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.modules"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(module, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <ModuleName :name="module.name" :active="module.active"></ModuleName>
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
                      v-if="state.toggles['modules.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      class="detailed-data transition-slow"
                    >
                      <ModuleFormEdit :module="module" :toggles="state.toggles" :errors="{}" />
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(module)"
                          v-if="state.toggles['modules.admin.update']"
                        >
                          {{ $t('businessModulesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['modules.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['modules.admin.unavailable']"
                          :no-disabled="state.toggles['modules.admin.unavailable']"
                          @actionYes="unavailable(module)"
                          @actionNo="unavailableCancel()"
                        ></AreYouSure>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
      <div
        class="modal fade"
        :id="`add-module`"
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
              <div v-if="state.showAdd && state.toggles['modules.admin.add']">
                <div v-if="state.modules.length < state.toggles['modules.admin.limit']">
                  <ModuleFormAdd
                    v-model="state.newQueue"
                    :toggles="state.toggles"
                    :errors="{
                      nameError: state.nameError,
                      errorsAdd: state.errorsAdd,
                    }"
                  />
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newQueue)"
                    >
                      {{ $t('businessModulesAdmin.add') }} <i class="bi bi-save"></i>
                    </button>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessModulesAdmin.message.3.title')"
                    :content="$t('businessModulesAdmin.message.3.content')"
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
    </Teleport>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.module-details-container {
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

.desktop-header-row {
  display: flex;
  align-items: center;
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
</style>
