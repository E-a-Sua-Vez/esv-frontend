<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
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
import CollaboratorPermissionsAdmin from '../../components/permissions/CollaboratorPermissionsAdmin.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';

export default {
  name: 'BusinessPermissionsAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    Warning,
    SimplePermissionCard,
    RolPermissionsAdmin,
    PlanPermissionsAdmin,
    CollaboratorPermissionsAdmin,
    ComponentMenu,
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
      errorsAdd: [],
      toggles: {},
      showRoles: true,
      showPlans: false,
      showUsers: false,
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('permissions', 'collaborators');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

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

    return {
      state,
      loading,
      alertError,
      goBack,
      commerce,
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
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
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
          <div id="users" class="row" v-if="state.toggles['permissions.collaborators.view']">
            <CollaboratorPermissionsAdmin></CollaboratorPermissionsAdmin>
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
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessPermissionsAdmin.title')"
          :toggles="state.toggles"
          component-name="businessPermissionsAdmin"
          @go-back="goBack"
        />
        <div id="businessPermissionsAdmin" class="">
          <div id="users" class="row" v-if="state.toggles['permissions.collaborators.view']">
            <CollaboratorPermissionsAdmin></CollaboratorPermissionsAdmin>
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

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
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
}
</style>
