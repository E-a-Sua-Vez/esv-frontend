<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCollaboratorByCommerceIdEmail, updateCollaboratorPermission, getCollaboratorsByCommerceId } from '../../application/services/collaborator';
import { getRoles } from '../../application/services/rol';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../common/ToggleCapabilities.vue';
import Message from '../common/Message.vue';
import PoweredBy from '../common/PoweredBy.vue';
import CommerceLogo from '../common/CommerceLogo.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import SimplePermissionCard from './SimplePermissionCard.vue';

export default {
  name: 'CollaboratorPermissionsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, ToggleCapabilities, Warning, SimplePermissionCard },
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
      commerce: ref({}),
      roles: {},
      rolSelected: {
        permissions: []
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
      user: undefined
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        state.roles = await getRoles();
        await selectRol('collaborator');
        state.toggles = await getPermissions('permissions', 'collaborators');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const goBack = () => {
      router.back();
    }

    const selectRol = async (name) => {
      try {
        loading.value = true;
        state.rolSelected = state.roles.filter(rol => rol.name === name)[0];
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.statuss || 500;
        loading.value = false;
      }
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPermission = {
        type: 'boolean'
      }
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        clear();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const validateAdd = (permission) => {
      state.errorsAdd = [];
      if(!permission.name || permission.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessPermissionsAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateRefresh = () => {
      state.errorsAdd = [];
      if(!state.email || state.email.length === 0) {
        state.emailError = true;
        state.errorsAdd.push('businessPermissionsAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPermission)) {
          state.newPermission.value = false;
          if(state.newPermission.type) {
            if (state.newPermission.type === 'number') {
              state.newPermission.value = 0;
            }
          }
          const permission = {
            name: state.newPermission.name,
            value: state.newPermission.value
          }
          if (state.rolSelected.name === 'collaborator') {
            await updateCollaboratorPermission(state.user.id, permission);
          }
          await refresh();
          state.showAdd = false;
          state.newPermission = {}
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (permission) => {
      try {
        if (state.rolSelected.name === 'collaborator') {
          await updateCollaboratorPermission(state.user.id, permission);
        }
        await refresh();
        state.showAdd = false;
        state.newPermission = {}
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

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
                value: state.user.permissions[permission]
              })
            });
            state.user.permissions = permissions;
            state.permissions = permissions;
          }
        }
        state.permissions = state.permissions.sort((a, b) => { if (a.name < b.name) { return -1; } if (a.name > b.name) { return 1; } return 0; });
      }
    }

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
    }

    const clear = () => {
      state.filter = '';
      state.user = undefined;
      state.email = '';
      state.permissions = []
    }

    const filter = computed(() => {
      if (state.searchString.length >= 3) {
        if (state.user && state.user.permissions.length > 0) {
          state.permissions = state.user.permissions.filter(i =>
            i.name.toLowerCase().startsWith(state.searchString.toLowerCase()));
        }
      } else {
        state.permissions = state.user.permissions;
      }
    })

    const getDate = (date) => {
      if (date) {
        const dateCorrected = new Date(date);
        return dateCorrected.toISOString();
      }
      return 'N/I'
    }

    return {
      state,
      loading,
      alertError,
      filter,
      add,
      update,
      goBack,
      showAdd,
      refresh,
      clear,
      search,
      getDate,
      selectCommerce
    }
  }
}
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
              <span>{{ $t("businessQueuesAdmin.commerce") }} </span>
              <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
              </select>
            </div>
            <div v-else>
              <Message
                :title="$t('businessQueuesAdmin.message.4.title')"
                :content="$t('businessQueuesAdmin.message.4.content')" />
            </div>
          </div>
          <div class="row g-1 mb-1">
            <div class="col-4 text-label">
              {{ $t("businessPermissionsAdmin.email") }}
            </div>
            <div class="col-8">
              <input
                min="10"
                type="email"
                class="form-control"
                v-model="state.email"
                v-bind:class="{ 'is-invalid': state.emailError }"
                placeholder="name@email.com">
            </div>
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
          <div class="col mb-2">
            <button class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="search()" :disabled="loading">
              <i class="bi bi-search"></i> {{ $t("dashboard.refresh") }}
            </button>
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              @click="clear()">
              <span><i class="bi bi-arrow-counterclockwise"></i></span>
            </button>
          </div>
        </div>
        <div id="businessPermissionsAdmin-controls" class="control-box mt-2" v-if="state.user">
          <div class="col">
            <div class="my-1">
              <span class="fw-bold h5"> <i class="bi bi-person-fill"></i>  {{ state.user ? state.user.name : '' }} {{ state.user ? state.user.active ? '🟢' : '🔴' : '' }}</span><br>
              <span class="badge bg-secondary m-1"> <i class="bi bi-envelope-fill"></i>  {{ state.user ? state.user.email : '' }}</span>
              <span class="badge bg-primary m-1"> <i class="bi bi-person-fill"></i>  {{ state.user ? state.user.type : '' }}</span>
              <span class="badge bg-secondary m-1"> <i class="bi bi-hand-index-thumb-fill"></i> Last Sign In: {{ state.user ? getDate(state.user.lastSignIn) : 'N/I' }} </span><br>
            </div>
            <div class="row g-1">
              <input
                min="1"
                max="50"
                type="text"
                class="form-control"
                v-model="state.searchString"
                :placeholder="$t('enterSearcher')">
                {{ filter }}
            </div>
          </div>
        </div>
        <div v-if="!loading" id="businessPermissionsAdmin-result" class="mt-4">
          <div>
            <div class="row mb-2">
              <div class="col-8 text-label">
                <span>{{ $t("businessPermissionsAdmin.listResult") }}</span>
                <span class="fw-bold m-2">{{ state.permissions.length }}</span>
              </div>
              <div class="col-4">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!state.toggles['permissions.collaborators.add']">
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
            <div id="add-roles" class="roles-card mb-4" v-if="state.showAdd && state.toggles['permissions.collaborators.add']">
              <div class="row g-1">
                <div id="roles-permission-form-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t("businessPermissionsAdmin.permission") }}
                  </div>
                  <div class="col-8">
                    <input
                      min="5"
                      type="text"
                      class="form-control"
                      v-model="state.newPermission.name"
                      v-bind:class="{ 'is-invalid': state.permissionError }"
                      placeholder="Ex. dashboard.panel.view">
                  </div>
                </div>
                <div id="roles-permission-type-add" class="row g-1">
                  <div class="col-4 text-label">
                    {{ $t("businessPermissionsAdmin.type") }}
                  </div>
                  <div class="col-8">
                    <input type="radio" class="btn-check mx-2" v-model="state.newPermission.type" value="boolean" name="permission-type" id="success-outlined" autocomplete="off" checked>
                    <label class="btn btn-outline-success" for="success-outlined">Boolean</label>
                    <input type="radio" class="btn-check mx-2" v-model="state.newPermission.type" value="number" name="permission-type" id="danger-outlined" autocomplete="off">
                    <label class="btn btn-outline-danger mx-2" for="danger-outlined">Number</label>
                  </div>
                </div>
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                    @click="add(state.newPermission)">
                    {{ $t("businessPermissionsAdmin.add") }} <i class="bi bi-save"></i>
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
            <div class="roles-card mb-4" v-if="state.permissions.length > 0">
              <div v-for="(permission, index) in state.permissions" :key="index">
                <SimplePermissionCard
                  :show="true"
                  :canUpdate="state.toggles['permissions.collaborators.update']"
                  :permission="permission"
                  :showTooltip="true"
                  @update="update"
                >
                </SimplePermissionCard>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('businessPermissionsAdmin.message.2.title')"
                :content="$t('businessPermissionsAdmin.message.2.content')" />
            </div>
          </div>
        </div>
      </div>
    </div>
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
.roles-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
</style>