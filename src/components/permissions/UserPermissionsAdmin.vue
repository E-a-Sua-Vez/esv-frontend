<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getAdministratorByEmailSimple,
  updateAdministratorPermission,
} from '../../application/services/administrator';
import {
  getCollaboratorByEmailSimple,
  updateCollaboratorPermission,
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

export default {
  name: 'UserPermissionsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    Warning,
    SimplePermissionCard,
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
      emailError: false,
      errorsAdd: [],
      toggles: {},
      searchString: '',
      email: '',
      user: undefined,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.roles = await getRoles();
        await selectRol(state.rolSelectedIndex);
        state.toggles = await getPermissions('roles', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const selectRol = async rolIndex => {
      try {
        loading.value = true;
        state.rolSelectedIndex = rolIndex;
        state.rolSelected = state.roles[rolIndex];
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
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
          } else if (state.rolSelected.name === 'business') {
            await updateAdministratorPermission(state.user.id, permission);
          }
          await refresh();
          state.showAdd = false;
          state.newPermission = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async permission => {
      try {
        if (state.rolSelected.name === 'collaborator') {
          await updateCollaboratorPermission(state.user.id, permission);
        } else if (state.rolSelected.name === 'business') {
          await updateAdministratorPermission(state.user.id, permission);
        }
        await refresh();
        state.showAdd = false;
        state.newPermission = {};
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const refresh = async () => {
      if (state.rolSelected) {
        if (state.rolSelected.name === 'collaborator') {
          state.user = await getCollaboratorByEmailSimple(state.email);
        } else if (state.rolSelected.name === 'business') {
          state.user = await getAdministratorByEmailSimple(state.email);
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

    const search = async () => {
      try {
        loading.value = true;
        if (validateRefresh()) {
          await refresh();
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.response ? error.response.status : 500;
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
          if (state.user) {
            state.permissions = state.user.permissions;
          }
        }
      },
      { immediate: true }
    );

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
      selectRol,
      showAdd,
      refresh,
      clear,
      search,
      getDate,
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
          <div class="row">
            <div class="col" v-if="state.roles">
              <span>{{ $t('businessPermissionsAdmin.commerce') }} </span>
              <select
                class="btn btn-md fw-bold text-dark m-1 select"
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
          <div class="row g-1 mb-1">
            <div class="col-4 text-label">
              {{ $t('businessPermissionsAdmin.email') }}
            </div>
            <div class="col-8">
              <input
                min="10"
                type="email"
                class="form-control"
                v-model="state.email"
                v-bind:class="{ 'is-invalid': state.emailError }"
                placeholder="name@email.com"
              />
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
          <div class="col mb-2">
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              @click="search()"
              :disabled="loading"
            >
              <i class="bi bi-search"></i> {{ $t('dashboard.refresh') }}
            </button>
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              @click="clear()"
            >
              <span><i class="bi bi-arrow-counterclockwise"></i></span>
            </button>
          </div>
          <div class="col mt-2" v-if="state.user">
            <hr />
            <div class="my-3">
              <span class="fw-bold h5">
                <i class="bi bi-person-fill"></i> {{ state.user ? state.user.name : '' }}
                {{ state.user ? (state.user.active ? '🟢' : '🔴') : '' }}</span
              >
              <br />
              <span>
                <i class="bi bi-envelope-fill"></i> {{ state.user ? state.user.email : '' }}</span
              ><br />
              <span>
                <i class="bi bi-calendar-check fw-bold"> Last Sign In: </i>
                {{ state.user ? getDate(state.user.lastSignIn) : 'N/I' }} </span
              ><br />
            </div>
            <div class="row g-1">
              <input
                min="1"
                max="50"
                type="text"
                class="form-control"
                v-model="state.searchString"
                :placeholder="$t('enterSearcher')"
              />
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
              <div class="col-8 text-label">
                <span>{{ $t('businessPermissionsAdmin.listResult') }}</span>
                <span class="fw-bold m-2">{{ state.permissions.length }}</span>
              </div>
              <div class="col-4">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!state.toggles['roles.admin.add']"
                >
                  <i class="bi bi-plus-lg"></i>
                </button>
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
</style>
