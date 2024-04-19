<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getRoles, updatePermissionsByRolName, updateRolPermission } from '../../application/services/rol';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimplePermissionCard from '../../components/permissions/SimplePermissionCard.vue';

export default {
  name: 'RolPermissionsAdmin',
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
      commerces: ref({}),
      roles: {},
      rolSelectedIndex: 0,
      rolSelected: {
        permissions: []
      },
      permissions: [],
      showAdd: false,
      newPermission: {},
      permissionError: false,
      errorsAdd: [],
      toggles: {},
      searchString: ''
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
    })

    const goBack = () => {
      router.back();
    }

    const selectRol = async (rolIndex) => {
      try {
        loading.value = true;
        state.rolSelectedIndex = rolIndex;
        state.rolSelected = state.roles[rolIndex];
        const permissions = [];
        if (state.rolSelected && state.rolSelected.permissions && !Array.isArray(state.rolSelected.permissions)) {
          Object.keys(state.rolSelected.permissions).map(permission => {
            permissions.push({
              name: permission,
              value: state.rolSelected.permissions[permission]
            })
          });
          state.rolSelected.permissions = permissions;
          state.permissions = permissions;
        }
        state.permissions = state.permissions.sort((a, b) => { if (a.name < b.name) { return -1; } if (a.name > b.name) { return 1; } return 0; });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPermission = {
        type: 'boolean'
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
          await updateRolPermission(state.rolSelected.id, permission);
          state.roles = await getRoles();
          selectRol(state.rolSelectedIndex);
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
        await updateRolPermission(state.rolSelected.id, permission);
        state.roles = await getRoles();
        selectRol(state.rolSelectedIndex);
        if (state.rolSelected.name === 'master') {
          await updatePermissionsByRolName('master');
        }
        state.showAdd = false;
        state.newPermission = {}
        alertError.value = '';
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const filter = computed(() => {
      if (state.searchString.length >= 3) {
        if (state.rolSelected && state.rolSelected.permissions.length > 0) {
          state.permissions = state.rolSelected.permissions.filter(i =>
            i.name.toLowerCase().startsWith(state.searchString.toLowerCase()));
        }
      } else {
        state.permissions = state.rolSelected.permissions;
      }
    })

    return {
      state,
      loading,
      alertError,
      filter,
      add,
      update,
      goBack,
      selectRol,
      showAdd
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
      <div v-if="state.toggles['roles.admin.view']">
        <div id="businessPermissionsAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.roles">
              <span>{{ $t("businessPermissionsAdmin.commerce") }} </span>
              <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.rolSelected" @change="selectRol($event.target.selectedIndex)" id="roles">
                <option v-for="rol in state.roles" :key="rol.id" :value="rol">{{ rol.name }}</option>
              </select>
            </div>
          </div>
          <div class="row mx-4">
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
        <div v-if="!loading" id="businessPermissionsAdmin-result" class="mt-4">
          <div>
            <div v-if="state.roles.length === 0">
              <Message
                :title="$t('businessPermissionsAdmin.message.2.title')"
                :content="$t('businessPermissionsAdmin.message.2.content')" />
            </div>
            <div class="row mb-2">
              <div class="col-8 text-label">
                <span>{{ $t("businessPermissionsAdmin.listResult") }}</span>
                <span class="fw-bold m-2">{{ state.permissions.length }}</span>
              </div>
              <div class="col-4">
                <button
                  class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                  @click="showAdd()"
                  :disabled="!state.toggles['roles.admin.add']">
                  <i class="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>
            <div id="add-roles" class="roles-card mb-4" v-if="state.showAdd && state.toggles['roles.admin.add']">
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
            <div class="roles-card mb-4" v-if="state.permissions.length > 0 && state.toggles['roles.admin.read']">
              <div v-for="(permission, index) in state.permissions" :key="index">
                <SimplePermissionCard
                  :show="true"
                  :canUpdate="state.toggles['roles.admin.update']"
                  :permission="permission"
                  :showTooltip="true"
                  @update="update"
                >
                </SimplePermissionCard>
              </div>
            </div>
            <div v-if="!state.toggles['roles.admin.read'] && !loading">
              <Message
                :title="$t('businessPermissionsAdmin.message.1.title')"
                :content="$t('businessPermissionsAdmin.message.1.content')" />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!state.toggles['roles.admin.view'] && !loading">
        <Message
          :title="$t('businessPermissionsAdmin.message.1.title')"
          :content="$t('businessPermissionsAdmin.message.1.content')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.module-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
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
.roles-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
</style>