<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { statusWhatsappConnectionById } from '../../application/services/business';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ConfigurationFeaturesManagement from '../../components/configuration/domain/ConfigurationFeaturesManagement.vue';
import ConfigurationWhatsappManagement from '../../components/configuration/domain/ConfigurationWhatsappManagement.vue';

export default {
  name: 'BusinessConfiguration',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ConfigurationFeaturesManagement,
    ConfigurationWhatsappManagement,
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
      showConfigurations: true,
      showWhatsapp: false,
      whatsappStatus: undefined,
      toggles: {},
    });

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.toggles = await getPermissions('configuration', 'admin');

        // Initialize commerce in store if not set
        const currentCommerce = store.getCurrentCommerce;
        if (!currentCommerce || !currentCommerce.id) {
          const availableCommerces = await store.getAvailableCommerces(state.business.commerces);
          if (availableCommerces && availableCommerces.length > 0) {
            await store.setCurrentCommerce(availableCommerces[0]);
          }
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const showConfigurations = () => {
      state.showConfigurations = true;
      state.showWhatsapp = false;
    };

    const showWhatsapp = async () => {
      state.showConfigurations = false;
      state.showWhatsapp = true;
      await getWhatsappStatus();
    };

    const getWhatsappStatus = async () => {
      try {
        loading.value = true;
        const result = await statusWhatsappConnectionById(state.business.id);
        if (result && result.id && result.whatsappConnection) {
          state.whatsappStatus = result.whatsappConnection;
        }
        loading.value = false;
      } catch (error) {
        state.whatsappStatus = undefined;
        loading.value = false;
      }
    };

    return {
      state,
      loading,
      alertError,
      goBack,
      isActiveBusiness,
      commerce,
      showConfigurations,
      showWhatsapp,
      getWhatsappStatus,
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
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessConfiguration.title`)"
          :toggles="state.toggles"
          component-name="businessConfiguration"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="dashboard">
          <div v-if="isActiveBusiness()">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('businessConfiguration.message.3.title')"
                :content="$t('businessConfiguration.message.3.content')"
              />
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                <div class="col-6 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showConfigurations ? 'btn-selected' : ''"
                    @click="showConfigurations()"
                    :disabled="!state.toggles['configuration.admin.features']"
                  >
                    {{ $t('businessConfiguration.features') }} <br />
                    <i class="bi bi-toggles"></i>
                  </button>
                </div>
                <div class="col-6 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showWhatsapp ? 'btn-selected' : ''"
                    @click="showWhatsapp()"
                    :disabled="!state.toggles['configuration.admin.whatsapps']"
                  >
                    {{ $t('businessConfiguration.whatsapps') }} <br />
                    <i class="bi bi-whatsapp"></i>
                  </button>
                </div>
              </div>
              <div>
                <ConfigurationFeaturesManagement
                  :show-configurations="state.showConfigurations"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :business="state.business"
                >
                </ConfigurationFeaturesManagement>
                <ConfigurationWhatsappManagement
                  :show-configurations="state.showWhatsapp"
                  :toggles="state.toggles"
                  :business="state.business"
                  :whatsapp-status="state.whatsappStatus"
                  :get-whatsapp-status-from-container="getWhatsappStatus"
                >
                </ConfigurationWhatsappManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('dashboard.message.1.title')"
              :content="$t('dashboard.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || commerce?.logo || state.business?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="commerce?.logo || state.business?.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessConfiguration.title`)"
              :toggles="state.toggles"
              component-name="businessConfiguration"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="dashboard">
          <div v-if="isActiveBusiness()">
            <div v-if="!commerce" class="control-box">
              <Message
                :title="$t('businessConfiguration.message.3.title')"
                :content="$t('businessConfiguration.message.3.content')"
              />
            </div>
            <div v-if="!loading" id="dashboard-result" class="mt-2">
              <div class="row col mx-1 mt-3 mb-1 tabs-header-divider">
                <div class="col-6 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showConfigurations ? 'btn-selected' : ''"
                    @click="showConfigurations()"
                    :disabled="!state.toggles['configuration.admin.features']"
                  >
                    {{ $t('businessConfiguration.features') }} <br />
                    <i class="bi bi-toggles"></i>
                  </button>
                </div>
                <div class="col-6 centered">
                  <button
                    class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
                    :class="state.showWhatsapp ? 'btn-selected' : ''"
                    @click="showWhatsapp()"
                    :disabled="!state.toggles['configuration.admin.whatsapps']"
                  >
                    {{ $t('businessConfiguration.whatsapps') }} <br />
                    <i class="bi bi-whatsapp"></i>
                  </button>
                </div>
              </div>
              <div>
                <ConfigurationFeaturesManagement
                  :show-configurations="state.showConfigurations"
                  :toggles="state.toggles"
                  :commerce="commerce"
                  :business="state.business"
                >
                </ConfigurationFeaturesManagement>
                <ConfigurationWhatsappManagement
                  :show-configurations="state.showWhatsapp"
                  :toggles="state.toggles"
                  :business="state.business"
                  :whatsapp-status="state.whatsappStatus"
                  :get-whatsapp-status-from-container="getWhatsappStatus"
                >
                </ConfigurationWhatsappManagement>
              </div>
            </div>
          </div>
          <div v-if="!isActiveBusiness() && !loading">
            <Message
              :title="$t('dashboard.message.1.title')"
              :content="$t('dashboard.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
    <!-- Render WhatsApp component once outside responsive sections for the modal -->
    <!-- This ensures single modal ID - buttons in both mobile and desktop will target this modal -->
    <!-- Bootstrap modals are appended to body when opened, so this hidden instance will work -->
    <div
      v-if="state.showWhatsapp && state.toggles['configuration.admin.whatsapps']"
      style="
        position: absolute;
        left: -9999px;
        width: 1px;
        height: 1px;
        overflow: hidden;
        visibility: hidden;
        pointer-events: none;
      "
    >
      <ConfigurationWhatsappManagement
        :show-configurations="true"
        :toggles="state.toggles"
        :business="state.business"
        :whatsapp-status="state.whatsappStatus"
        :get-whatsapp-status-from-container="getWhatsappStatus"
      >
      </ConfigurationWhatsappManagement>
    </div>
  </div>
</template>

<style scoped>
.metric-title {
  text-align: left;
  font-size: 1.1rem;
  font-weight: 700;
}

.tabs-header-divider {
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  padding-bottom: 0.75rem;
}
.metric-subtitle {
  text-align: left;
  font-size: 0.9rem;
  font-weight: 500;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.green-icon {
  color: var(--verde-tu);
}
.red-icon {
  color: var(--rojo-warning);
}
.yellow-icon {
  color: var(--amarillo-star);
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
