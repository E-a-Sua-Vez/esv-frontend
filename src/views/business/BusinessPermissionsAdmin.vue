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
import CollaboratorPermissionsAdmin from '../../components/permissions/CollaboratorPermissionsAdmin.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessPermissionsAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, Warning, SimplePermissionCard, RolPermissionsAdmin, PlanPermissionsAdmin, CollaboratorPermissionsAdmin, ComponentMenu },
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

    return {
      state,
      loading,
      alertError,
      goBack,
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
        <div id="users" class="row" v-if="state.toggles['permissions.collaborators.view']">
          <CollaboratorPermissionsAdmin></CollaboratorPermissionsAdmin>
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
.roles-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
</style>