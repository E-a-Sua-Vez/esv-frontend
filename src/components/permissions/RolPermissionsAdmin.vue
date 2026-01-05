<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getRoles,
  updatePermissionsByRolName,
  updateRolPermission,
  syncRoles,
} from '../../application/services/rol';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimplePermissionCard from '../../components/permissions/SimplePermissionCard.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';

export default {
  name: 'RolPermissionsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    Warning,
    SimplePermissionCard,
    AreYouSure,
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
      commerces: ref({}),
      roles: {},
      rolSelectedIndex: 0,
      rolSelected: {
        permissions: [],
      },
      permissions: [],
      showAdd: false,
      newPermission: {},
      permissionError: false,
      errorsAdd: [],
      toggles: {},
      searchString: '',
      selectedModule: null,
      selectedCategory: null,
      availableModules: [],
      availableCategories: [],
      page: 1,
      limit: 10,
      limits: [10, 20, 50, 100],
      totalPages: 0,
      counter: 0,
      allFilteredPermissions: [],
      syncing: false,
      syncMessage: '',
      showSyncConfirm: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.roles = await getRoles();
        await selectRol(state.rolSelectedIndex);
        state.toggles = await getPermissions('roles', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error loading roles permissions:', error);
        alertError.value =
          error?.response?.status || error?.message || 'Error loading roles permissions';
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const getModule = name => {
      if (name) {
        const [module] = name.split('.');
        return module;
      }
      return null;
    };

    const getCategory = name => {
      if (name) {
        const parts = name.split('.');
        if (parts.length >= 2) {
          return parts[1];
        }
      }
      return null;
    };

    const extractUniqueModulesAndCategories = permissions => {
      const modules = new Set();
      const categories = new Set();
      permissions.forEach(permission => {
        const module = getModule(permission.name);
        const category = getCategory(permission.name);
        if (module) modules.add(module);
        if (category) categories.add(category);
      });
      return {
        modules: Array.from(modules).sort(),
        categories: Array.from(categories).sort(),
      };
    };

    const filterPermissions = () => {
      if (!state.rolSelected || !state.rolSelected.permissions) {
        state.allFilteredPermissions = [];
        state.permissions = [];
        state.counter = 0;
        state.totalPages = 0;
        return;
      }

      let filtered = [...state.rolSelected.permissions];

      // Filter by search string
      if (state.searchString && state.searchString.length >= 3) {
        filtered = filtered.filter(i =>
          i.name.toLowerCase().includes(state.searchString.toLowerCase())
        );
      }

      // Filter by module
      if (state.selectedModule) {
        filtered = filtered.filter(i => getModule(i.name) === state.selectedModule);
      }

      // Filter by category
      if (state.selectedCategory) {
        filtered = filtered.filter(i => getCategory(i.name) === state.selectedCategory);
      }

      // Sort filtered permissions
      state.allFilteredPermissions = filtered.sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });

      // Apply pagination
      updatePaginationData();
    };

    const updatePaginationData = () => {
      if (state.allFilteredPermissions && state.allFilteredPermissions.length > 0) {
        state.counter = state.allFilteredPermissions.length;
        const total = state.counter / state.limit;
        const totalB = Math.trunc(total);
        state.totalPages =
          totalB <= 0 ? 1 : state.counter % state.limit === 0 ? totalB : totalB + 1;

        // Apply pagination slice
        const startIndex = (state.page - 1) * state.limit;
        const endIndex = startIndex + state.limit;
        state.permissions = state.allFilteredPermissions.slice(startIndex, endIndex);
      } else {
        state.counter = 0;
        state.totalPages = 0;
        state.permissions = [];
      }
    };

    const setPage = pageIn => {
      state.page = pageIn;
      updatePaginationData();
    };

    const selectRol = async rolIndex => {
      try {
        loading.value = true;
        state.rolSelectedIndex = rolIndex;
        state.rolSelected = state.roles[rolIndex];
        const permissions = [];
        if (
          state.rolSelected &&
          state.rolSelected.permissions &&
          !Array.isArray(state.rolSelected.permissions)
        ) {
          Object.keys(state.rolSelected.permissions).map(permission => {
            permissions.push({
              name: permission,
              value: state.rolSelected.permissions[permission],
            });
          });
          state.rolSelected.permissions = permissions;
        }

        // Extract unique modules and categories
        const { modules, categories } = extractUniqueModulesAndCategories(permissions);
        state.availableModules = modules;
        state.availableCategories = categories;

        // Reset filters and pagination
        state.selectedModule = null;
        state.selectedCategory = null;
        state.searchString = '';
        state.page = 1;

        filterPermissions();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error selecting role:', error);
        alertError.value = error?.response?.status || error?.message || 'Error selecting role';
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPermission = {
        type: 'boolean',
      };
    };

    const validateAdd = permission => {
      state.errorsAdd = [];
      if (!permission.name || permission.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessPermissionsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPermission)) {
          state.newPermission.value = false;
          if (state.newPermission.type) {
            if (state.newPermission.type === 'number') {
              state.newPermission.value = 0;
            }
          }
          const permission = {
            name: state.newPermission.name,
            value: state.newPermission.value,
          };
          await updateRolPermission(state.rolSelected.id, permission);
          state.roles = await getRoles();
          selectRol(state.rolSelectedIndex);
          state.showAdd = false;
          state.newPermission = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error adding permission:', error);
        alertError.value = error?.response?.status || error?.message || 'Error adding permission';
        loading.value = false;
      }
    };

    const update = async permission => {
      try {
        await updateRolPermission(state.rolSelected.id, permission);
        state.roles = await getRoles();
        selectRol(state.rolSelectedIndex);
        if (state.rolSelected.name === 'master') {
          await updatePermissionsByRolName('master');
        }
        state.showAdd = false;
        state.newPermission = {};
        alertError.value = '';
      } catch (error) {
        console.error('Error updating permission:', error);
        alertError.value = error?.response?.status || error?.message || 'Error updating permission';
        loading.value = false;
      }
    };

    watch(
      () => [state.searchString, state.selectedModule, state.selectedCategory, state.limit],
      () => {
        state.page = 1; // Reset to first page when filters change
        filterPermissions();
      },
      { immediate: true }
    );

    watch(
      () => state.page,
      () => {
        updatePaginationData();
      }
    );

    const clearFilters = () => {
      state.searchString = '';
      state.selectedModule = null;
      state.selectedCategory = null;
      state.page = 1;
      filterPermissions();
    };

    const handleSyncRoles = () => {
      state.showSyncConfirm = true;
    };

    const confirmSyncRoles = async () => {
      try {
        state.syncing = true;
        state.syncMessage = '';
        state.showSyncConfirm = false;
        loading.value = true;
        alertError.value = '';

        const syncedRoles = await syncRoles();
        state.syncMessage = `✅ Sincronización exitosa. ${syncedRoles.length} rol(es) actualizado(s).`;

        // Recargar los roles
        state.roles = await getRoles();
        await selectRol(state.rolSelectedIndex);

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          state.syncMessage = '';
        }, 3000);
      } catch (error) {
        console.error('Error syncing roles:', error);
        alertError.value =
          error?.response?.data?.message || error?.message || 'Error al sincronizar permisos';
        state.syncMessage = '❌ Error al sincronizar permisos';
      } finally {
        state.syncing = false;
        loading.value = false;
      }
    };

    const cancelSyncRoles = () => {
      state.showSyncConfirm = false;
    };

    return {
      state,
      loading,
      alertError,
      add,
      update,
      goBack,
      selectRol,
      showAdd,
      clearFilters,
      getModule,
      getCategory,
      setPage,
      handleSyncRoles,
      confirmSyncRoles,
      cancelSyncRoles,
    };
  },
};
</script>

<template>
  <div>
    <div id="page-header" class="text-center mt-2">
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
    </div>
    <div id="businessPermissionsAdmin">
      <div v-if="state.toggles['roles.admin.view']">
        <div id="businessPermissionsAdmin-controls" class="control-box">
          <div class="row my-3">
            <div class="col" v-if="state.roles">
              <span class="me-3">{{ $t('businessPermissionsAdmin.commerce') }}</span>
              <select
                class="btn btn-md fw-bold text-dark select"
                v-model="state.rolSelected"
                @change="selectRol($event.target.selectedIndex)"
                id="roles"
              >
                <option v-for="rol in state.roles" :key="rol.id" :value="rol">
                  {{ rol.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="row my-3">
            <div class="col-md-6 mb-2">
              <input
                min="1"
                max="50"
                type="text"
                class="form-control"
                v-model="state.searchString"
                :placeholder="$t('enterSearcher')"
              />
            </div>
            <div class="col-md-3 mb-2">
              <select
                class="btn btn-md fw-bold text-dark select w-100"
                v-model="state.selectedModule"
              >
                <option :value="null">
                  {{ $t('businessPermissionsAdmin.allModules') || 'Todos los Módulos' }}
                </option>
                <option v-for="module in state.availableModules" :key="module" :value="module">
                  {{ module }}
                </option>
              </select>
            </div>
            <div class="col-md-3 mb-2">
              <select
                class="btn btn-md fw-bold text-dark select w-100"
                v-model="state.selectedCategory"
              >
                <option :value="null">
                  {{ $t('businessPermissionsAdmin.allCategories') || 'Todas las Categorías' }}
                </option>
                <option
                  v-for="category in state.availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
            </div>
          </div>
          <div class="row my-2">
            <div class="col">
              <button
                class="btn btn-sm btn-size fw-bold btn-outline-secondary rounded-pill px-3"
                @click="clearFilters()"
                v-if="state.searchString || state.selectedModule || state.selectedCategory"
              >
                <i class="bi bi-x-circle"></i>
                {{ $t('businessPermissionsAdmin.clearFilters') || 'Limpiar Filtros' }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="!loading" id="businessPermissionsAdmin-result" class="mt-4">
          <div>
            <div v-if="state.roles.length === 0">
              <Message
                :title="$t('businessPermissionsAdmin.message.2.title')"
                :content="$t('businessPermissionsAdmin.message.2.content')"
              />
            </div>
            <div class="row mb-2">
              <div class="col-auto">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!state.toggles['roles.admin.add']"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
              <div class="col-auto">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="handleSyncRoles()"
                  :disabled="state.syncing || loading || state.showSyncConfirm"
                >
                  <i class="bi bi-arrow-repeat" :class="{ spinning: state.syncing }"></i>
                </button>
              </div>
            </div>
            <div class="row mb-2" v-if="state.showSyncConfirm">
              <div class="col-12">
                <AreYouSure
                  :show="state.showSyncConfirm"
                  :yes-disabled="state.syncing"
                  :no-disabled="state.syncing"
                  @actionYes="confirmSyncRoles"
                  @actionNo="cancelSyncRoles"
                >
                </AreYouSure>
              </div>
            </div>
            <div class="row mb-2" v-if="state.syncMessage">
              <div class="col-12">
                <div
                  class="alert"
                  :class="state.syncMessage.includes('✅') ? 'alert-success' : 'alert-danger'"
                  role="alert"
                >
                  {{ state.syncMessage }}
                </div>
              </div>
            </div>
            <div
              id="add-roles"
              class="roles-card mb-4"
              v-if="state.showAdd && state.toggles['roles.admin.add']"
            >
              <div class="row g-1">
                <div id="roles-permission-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessPermissionsAdmin.permission') }}
                  </div>
                  <div class="col-8">
                    <input
                      min="5"
                      type="text"
                      class="form-control"
                      v-model="state.newPermission.name"
                      v-bind:class="{ 'is-invalid': state.permissionError }"
                      placeholder="Ex. dashboard.panel.view"
                    />
                  </div>
                </div>
                <div id="roles-permission-type-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t('businessPermissionsAdmin.type') }}
                  </div>
                  <div class="col-8">
                    <input
                      type="radio"
                      class="btn-check mx-2"
                      v-model="state.newPermission.type"
                      value="boolean"
                      name="permission-type"
                      id="success-outlined"
                      autocomplete="off"
                      checked
                    />
                    <label class="btn btn-outline-success" for="success-outlined">Boolean</label>
                    <input
                      type="radio"
                      class="btn-check mx-2"
                      v-model="state.newPermission.type"
                      value="number"
                      name="permission-type"
                      id="danger-outlined"
                      autocomplete="off"
                    />
                    <label class="btn btn-outline-danger mx-2" for="danger-outlined">Number</label>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newPermission)"
                  >
                    {{ $t('businessPermissionsAdmin.add') }} <i class="bi bi-save"></i>
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
            <div
              v-if="state.permissions.length > 0 && state.toggles['roles.admin.read']"
              class="my-2 d-flex align-items-center justify-content-center flex-wrap gap-2"
            >
              <span class="badge bg-secondary px-2 py-1">
                {{ $t('businessAdmin.listResult') }} {{ state.counter }}
              </span>
              <span class="badge bg-secondary px-2 py-1">
                {{ $t('page') }} {{ state.page }} {{ $t('of') }} {{ state.totalPages }}
              </span>
              <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="state.limit">
                <option v-for="lim in state.limits" :key="lim" :value="lim">
                  {{ lim }}
                </option>
              </select>
            </div>
            <div class="centered mt-2 mb-3" v-if="state.totalPages > 1">
              <nav>
                <ul class="pagination">
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="First"
                      @click="setPage(1)"
                      :disabled="state.page === 1 || state.totalPages === 0"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-left"></i></span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Previous"
                      @click="setPage(state.page - 1)"
                      :disabled="state.page === 1 || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  <li>
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-1"
                      v-model="state.page"
                      :disabled="state.totalPages === 0"
                    >
                      <option v-for="pag in state.totalPages" :key="pag" :value="pag">
                        {{ pag }}
                      </option>
                    </select>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Next"
                      @click="setPage(state.page + 1)"
                      :disabled="state.page === state.totalPages || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3"
                      aria-label="Last"
                      @click="setPage(state.totalPages)"
                      :disabled="state.page === state.totalPages || state.totalPages === 0"
                    >
                      <span aria-hidden="true"><i class="bi bi-arrow-bar-right"></i></span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            <div
              class="roles-card mb-4"
              v-if="state.permissions.length > 0 && state.toggles['roles.admin.read']"
            >
              <div v-for="(permission, index) in state.permissions" :key="index">
                <SimplePermissionCard
                  :show="true"
                  :can-update="state.toggles['roles.admin.update']"
                  :permission="permission"
                  :show-tooltip="true"
                  @update="update"
                >
                </SimplePermissionCard>
              </div>
            </div>
            <div v-if="!state.toggles['roles.admin.read'] && !loading">
              <Message
                :title="$t('businessPermissionsAdmin.message.1.title')"
                :content="$t('businessPermissionsAdmin.message.1.content')"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!state.toggles['roles.admin.view'] && !loading">
        <Message
          :title="$t('businessPermissionsAdmin.message.1.title')"
          :content="$t('businessPermissionsAdmin.message.1.content')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.module-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
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
  max-height: 400px !important;
  overflow-y: auto;
}
.roles-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}

#businessPermissionsAdmin-controls.control-box {
  padding: 1.25rem !important;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
