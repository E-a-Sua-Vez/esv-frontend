<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
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
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    SimplePermissionCard,
    RolPermissionsAdmin,
    PlanPermissionsAdmin,
    UserPermissionsAdmin,
    ComponentMenu,
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
      errorsAdd: [],
      toggles: {},
      showRoles: true,
      showPlans: false,
      showUsers: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = store.getCurrentUser;
        state.toggles = await getPermissions('permissions', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        console.error('Error loading permissions:', error);
        alertError.value = error?.response?.status || error?.message || 'Error loading permissions';
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const showRoles = () => {
      state.showRoles = true;
      state.showPlans = false;
      state.showUsers = false;
    };

    const showPlans = () => {
      state.showRoles = false;
      state.showPlans = true;
      state.showUsers = false;
    };

    const showUsers = () => {
      state.showRoles = false;
      state.showPlans = false;
      state.showUsers = true;
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      showRoles,
      showPlans,
      showUsers,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessPermissionsAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessPermissionsAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPermissionsAdmin" class="">
          <div class="row m-3 justify-content-center">
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showRoles()"
                :disabled="!state.toggles['permissions.admin.roles']"
              >
                <i class="bi bi-file-earmark-person-fill"></i>
                {{ $t('businessPermissionsAdmin.roles') }}
              </button>
            </div>
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showPlans()"
                :disabled="!state.toggles['permissions.admin.plans']"
              >
                <i class="bi bi-card-list"></i> {{ $t('businessPermissionsAdmin.plans') }}
              </button>
            </div>
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showUsers()"
                :disabled="!state.toggles['permissions.admin.users']"
              >
                <i class="bi bi-person-fill"></i> {{ $t('businessPermissionsAdmin.users') }}
              </button>
            </div>
          </div>
          <div
            id="roles"
            class="row"
            v-if="state.showRoles === true && state.toggles['permissions.admin.roles']"
          >
            <RolPermissionsAdmin></RolPermissionsAdmin>
          </div>
          <div
            id="plans"
            class="row"
            v-if="state.showPlans === true && state.toggles['permissions.admin.plans']"
          >
            <PlanPermissionsAdmin></PlanPermissionsAdmin>
          </div>
          <div
            id="plans"
            class="row"
            v-if="state.showUsers === true && state.toggles['permissions.admin.users']"
          >
            <UserPermissionsAdmin></UserPermissionsAdmin>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="$t('logo')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessPermissionsAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessPermissionsAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessPermissionsAdmin" class="">
          <div class="row m-3 justify-content-center">
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showRoles()"
                :disabled="!state.toggles['permissions.admin.roles']"
              >
                <i class="bi bi-file-earmark-person-fill"></i>
                {{ $t('businessPermissionsAdmin.roles') }}
              </button>
            </div>
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showPlans()"
                :disabled="!state.toggles['permissions.admin.plans']"
              >
                <i class="bi bi-card-list"></i> {{ $t('businessPermissionsAdmin.plans') }}
              </button>
            </div>
            <div class="col-auto">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
                @click="showUsers()"
                :disabled="!state.toggles['permissions.admin.users']"
              >
                <i class="bi bi-person-fill"></i> {{ $t('businessPermissionsAdmin.users') }}
              </button>
            </div>
          </div>
          <div
            id="roles"
            class="row"
            v-if="state.showRoles === true && state.toggles['permissions.admin.roles']"
          >
            <RolPermissionsAdmin></RolPermissionsAdmin>
          </div>
          <div
            id="plans"
            class="row"
            v-if="state.showPlans === true && state.toggles['permissions.admin.plans']"
          >
            <PlanPermissionsAdmin></PlanPermissionsAdmin>
          </div>
          <div
            id="plans"
            class="row"
            v-if="state.showUsers === true && state.toggles['permissions.admin.users']"
          >
            <UserPermissionsAdmin></UserPermissionsAdmin>
          </div>
        </div>
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

/* Desktop Layout Styles */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
  }

  .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
  }

  .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
  }
}
</style>
