<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getCollaboratorByCommerceIdEmail,
  updateCollaboratorPermission,
  getCollaboratorsByCommerceId,
} from '../../application/services/collaborator';
import { getRoles } from '../../application/services/rol';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../common/ToggleCapabilities.vue';
import Message from '../common/Message.vue';
import CommerceLogo from '../common/CommerceLogo.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import SimplePermissionCard from './SimplePermissionCard.vue';
import SearchBar from '../common/SearchBar.vue';
import SearchPermissionItem from '../common/SearchPermissionItem.vue';

export default {
  name: 'CollaboratorPermissionsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    Warning,
    SimplePermissionCard,
    SearchBar,
    SearchPermissionItem,
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
      commerce: ref({}),
      roles: {},
      rolSelected: {
        permissions: [],
      },
      permissions: [],
      collaborators: [],
      showAdd: false,
      newPermission: {},
      permissionError: false,
      emailError: false,
      errorsAdd: [],
      toggles: {},
      searchString: '',
      email: '',
      user: undefined,
      filtered: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce =
          state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.roles = await getRoles();
        state.collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
        await selectRol('collaborator');
        state.toggles = await getPermissions('permissions', 'collaborators');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const selectRol = async name => {
      try {
        loading.value = true;
        state.rolSelected = state.roles.filter(rol => rol.name === name)[0];
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = true;
      state.newPermission = {
        type: 'boolean',
      };
    };

    const selectCommerce = async commerce => {
      try {
        loading.value = true;
        state.commerce = commerce;
        state.collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
        clear();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
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

    const validateRefresh = () => {
      state.errorsAdd = [];
      if (!state.email || state.email.length === 0) {
        state.emailError = true;
        state.errorsAdd.push('businessPermissionsAdmin.validate.email');
      } else {
        state.emailError = false;
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
          if (state.rolSelected.name === 'collaborator') {
            await updateCollaboratorPermission(state.user.id, permission);
          }
          await refresh();
          state.showAdd = false;
          state.newPermission = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const update = async permission => {
      try {
        if (state.rolSelected.name === 'collaborator') {
          await updateCollaboratorPermission(state.user.id, permission);
        }
        await refresh();
        state.showAdd = false;
        state.newPermission = {};
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response?.status || error.status || 500;
        loading.value = false;
      }
    };

    const refresh = async () => {
      if (state.rolSelected) {
        if (state.rolSelected.name === 'collaborator') {
          state.user = await getCollaboratorByCommerceIdEmail(state.commerce.id, state.email);
        } else {
          throw new Error('cant manipulate this type of user');
        }
        const permissions = [];
        if (state.user) {
          state.user.permissions = state.user.permissions || [];
          if (state.user.permissions && !Array.isArray(state.user.permissions)) {
            Object.keys(state.user.permissions).map(permission => {
              permissions.push({
                name: permission,
                value: state.user.permissions[permission],
              });
            });
            state.user.permissions = permissions;
            state.permissions = permissions;
          }
        }
        state.permissions = state.permissions.sort((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        });
      }
    };

    const search = async collaborator => {
      try {
        loading.value = true;
        if (collaborator && collaborator.id) {
          state.email = collaborator.email;
          if (validateRefresh()) {
            await refresh();
          }
          alertError.value = '';
          loading.value = false;
        }
      } catch (error) {
        loading.value = false;
        alertError.value = error.response?.status || error.status || 500;
      }
    };

    const clear = () => {
      state.filter = '';
      state.user = undefined;
      state.email = '';
      state.permissions = [];
    };

    watch(
      () => state.searchString,
      () => {
        if (state.searchString.length >= 3) {
          if (state.user && state.user.permissions.length > 0) {
            state.permissions = state.user.permissions.filter(i =>
              i.name.toLowerCase().startsWith(state.searchString.toLowerCase())
            );
          }
        } else {
          if (state.user && state.user.permissions.length >= 0) {
            state.permissions = state.user.permissions;
          }
        }
      },
      { immediate: true }
    );

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const getDate = date => {
      if (date) {
        const dateCorrected = new Date(date);
        return dateCorrected.toISOString();
      }
      return 'N/I';
    };

    return {
      state,
      loading,
      alertError,
      add,
      update,
      goBack,
      showAdd,
      refresh,
      clear,
      search,
      getDate,
      selectCommerce,
      receiveFilteredItems,
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
      <div>
        <div id="businessQueuesAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.commerces.length > 0">
              <span>{{ $t('businessQueuesAdmin.commerce') }} </span>
              <select
                class="form-control-modern form-select-modern"
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
                :title="$t('businessQueuesAdmin.message.4.title')"
                :content="$t('businessQueuesAdmin.message.4.content')"
              />
            </div>
          </div>
          <div class="row mb-1 centered">
            <div class="col-10" v-if="state.collaborators && state.collaborators.length > 0">
              <SearchBar
                :list="state.collaborators"
                :label="$t('businessQueuesAdmin.selectCollaborator')"
                @selectItem="search"
              >
              </SearchBar>
            </div>
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
          <div class="col mb-2"></div>
        </div>
        <div class="user-info-card mt-3" v-if="state.user">
          <div class="user-info-header">
            <div class="user-info-icon" :class="state.user.active ? 'icon-success' : 'icon-error'">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="user-info-content">
              <div class="user-info-name">
                {{ state.user ? state.user.name : '' }}
                <span class="user-status-indicator">
                  {{ state.user.active ? '🟢' : '🔴' }}
                </span>
              </div>
              <div class="user-info-badges">
                <span class="badge-item">
                  <i class="bi bi-envelope-fill"></i> {{ state.user ? state.user.email : '' }}
                </span>
                <span class="badge-item">
                  <i class="bi bi-person-fill"></i> {{ state.user ? state.user.type : '' }}
                </span>
                <span class="badge-item">
                  <i class="bi bi-hand-index-thumb-fill"></i> Last Sign In:
                  {{ state.user ? getDate(state.user.lastSignIn) : 'N/I' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!loading" id="businessPermissionsAdmin-result" class="mt-4">
          <div>
            <div class="row mb-2">
              <div class="col lefted">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  data-bs-toggle="modal"
                  :data-bs-target="`#add-permissions`"
                  :disabled="!state.toggles['permissions.collaborators.add']"
                >
                  <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="clear()"
                >
                  <span><i class="bi bi-arrow-counterclockwise"></i></span>
                </button>
              </div>
            </div>
            <div class="mb-4" v-if="state.permissions.length > 0">
              <SearchPermissionItem
                :business-items="state.permissions"
                :type="'permissions'"
                :receive-filtered-items="receiveFilteredItems"
              >
              </SearchPermissionItem>
              <div v-for="(permission, index) in state.filtered" :key="index">
                <SimplePermissionCard
                  :show="true"
                  :can-update="state.toggles['permissions.collaborators.update']"
                  :permission="permission"
                  :show-tooltip="true"
                  @update="update"
                >
                </SimplePermissionCard>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('businessPermissionsAdmin.message.2.title')"
                :content="$t('businessPermissionsAdmin.message.2.content')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-permissions`"
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
              id="add-roles"
              class="roles-card mb-4"
              v-if="state.showAdd && state.toggles['permissions.collaborators.add']"
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
/* Modern Form Styles */
.select,
.form-select-modern {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.select:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-select-modern {
  flex: 1;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

/* User Info Card */
.user-info-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.user-info-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.user-info-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.user-info-icon i {
  font-size: 1.5rem;
}

.user-info-icon.icon-success {
  background: transparent;
  color: #00c2cb;
  border-color: rgba(0, 194, 203, 0.2);
}

.user-info-icon.icon-success:hover {
  border-color: rgba(0, 194, 203, 0.4);
  transform: scale(1.05);
}

.user-info-icon.icon-error {
  background: transparent;
  color: #a52a2a;
  border-color: rgba(165, 42, 42, 0.2);
}

.user-info-icon.icon-error:hover {
  border-color: rgba(165, 42, 42, 0.4);
  transform: scale(1.05);
}

.user-info-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-info-name {
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  line-height: 1.4;
}

.user-status-indicator {
  font-size: 0.875rem;
  line-height: 1;
}

.user-info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: #004aad;
  background-color: rgba(0, 74, 173, 0.1);
  border: 1px solid rgba(0, 74, 173, 0.2);
  border-radius: 9999px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.badge-item:hover {
  background-color: rgba(0, 74, 173, 0.15);
  border-color: rgba(0, 74, 173, 0.3);
  transform: translateY(-1px);
}

.badge-item i {
  font-size: 0.75rem;
  color: #004aad;
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
</style>
