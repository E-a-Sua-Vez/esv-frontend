<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimplePermissionCard from '../../components/permissions/SimplePermissionCard.vue';
import RolPermissionsAdmin from '../../components/permissions/RolPermissionsAdmin.vue';
import PlanPermissionsAdmin from '../../components/permissions/PlanPermissionsAdmin.vue';
import UserPermissionsAdmin from '../../components/permissions/UserPermissionsAdmin.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'MasterPermissionsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, SimplePermissionCard, RolPermissionsAdmin, PlanPermissionsAdmin, UserPermissionsAdmin, ComponentMenu },
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
      errorsAdd: [],
      toggles: {},
      showRoles: true,
      showPlans: false,
      showUsers: false
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.toggles = await getPermissions('permissions', 'admin');
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

    const showRoles = () => {
      state.showRoles = true;
      state.showPlans = false;
      state.showUsers = false;
    }

    const showPlans = () => {
      state.showRoles = false;
      state.showPlans = true;
      state.showUsers = false;
    }

    const showUsers = () => {
      state.showRoles = false;
      state.showPlans = false;
      state.showUsers = true;
    }

    return {
      state,
      loading,
      alertError,
      goBack,
      showRoles,
      showPlans,
      showUsers
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessPermissionsAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessPermissionsAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessPermissionsAdmin" class="">
        <div class="row m-3">
          <div class="col">
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
              @click="showRoles()"
              :disabled="!state.toggles['permissions.admin.roles']">
              <i class="bi bi-file-earmark-person-fill"></i> {{ $t("businessPermissionsAdmin.roles") }}
            </button>
          </div>
          <div class="col">
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
              @click="showPlans()"
              :disabled="!state.toggles['permissions.admin.plans']">
              <i class="bi bi-card-list"></i> {{ $t("businessPermissionsAdmin.plans") }}
            </button>
          </div>
          <div class="col">
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
              @click="showUsers()"
              :disabled="!state.toggles['permissions.admin.users']">
              <i class="bi bi-person-fill"></i> {{ $t("businessPermissionsAdmin.users") }}
            </button>
          </div>
        </div>
        <div id="roles" class="row" v-if="state.showRoles === true && state.toggles['permissions.admin.roles']">
          <RolPermissionsAdmin></RolPermissionsAdmin>
        </div>
        <div id="plans" class="row" v-if="state.showPlans === true && state.toggles['permissions.admin.plans']">
          <PlanPermissionsAdmin></PlanPermissionsAdmin>
        </div>
        <div id="plans" class="row" v-if="state.showUsers === true && state.toggles['permissions.admin.users']">
          <UserPermissionsAdmin></UserPermissionsAdmin>
        </div>
      </div>
    </div>
    <PoweredBy :name="''" />
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