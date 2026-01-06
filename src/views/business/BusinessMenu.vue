<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivationByBusinessId } from '../../application/services/plan-activation';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';
import SpySection from '../../components/domain/SpySection.vue';

export default {
  name: 'BusinessMenu',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanStatus,
    ToggleCapabilities,
    WelcomeMenu,
    SpySection,
  },
  async setup() {
    const router = useRouter();

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      business: {},
      commerces: [],
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      medicalManagementSubMenuOption: false,
      menuOptions: [
        'dashboard',
        'reports',
        'booking-manage',
        'control-admin',
        'manage-admin',
        'medical-management',
        'configuration',
        'documents',
        'your-plan',
        'business-resume',
        'go-minisite',
        'client-portal',
      ],
      manageControlSubMenuOptions: [
        'tracing',
        'product-stock',
        'financial',
        //'patients',
        //'marketing'
      ],
      manageSubMenuOptions: [
        'commerce-admin',
        'service-admin',
        'modules-admin',
        'queues-admin',
        'collaborators-admin',
        'surveys-admin',
        'product-admin',
        'outcome-types-admin',
        'company-admin',
        'forms-admin',
        'lgpd-consent-admin',
        'permissions-admin',
      ],
      medicalManagementSubMenuOptions: [
        'patient-history-item-admin',
        'medications-admin',
        'medical-exams-admin',
        'medical-templates-admin',
        'pdf-templates-admin',
        'audit-log',
      ],
      currentPlanActivation: {},
      toggles: {},
      showMobileMenuSide: true,
      showMobileSpySide: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.renewActualBusiness();
        state.commerces = state.business.commerces || [];
        state.currentPlanActivation =
          (await getValidatedPlanActivationByBusinessId(state.business.id, true)) || {};
        state.toggles = await getPermissions('business', 'main-menu');
        // Ensure lgpd-consent-admin permission exists (default to false if not found)
        if (state.toggles['business.main-menu.lgpd-consent-admin'] === undefined) {
          console.warn(
            'LGPD Consent Admin permission not found in toggles. Available permissions:',
            Object.keys(state.toggles),
          );
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? (error.response ? error.respose.status : 500) : 500;
        loading.value = false;
      }
    });

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'manage-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'control-admin') {
            state.manageControlSubMenuOption = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
            state.medicalManagementSubMenuOption = false;
            loading.value = false;
          } else if (option === 'medical-management') {
            state.medicalManagementSubMenuOption = !state.medicalManagementSubMenuOption;
            state.manageSubMenuOption = false;
            state.manageControlSubMenuOption = false;
            loading.value = false;
          } else {
            try {
              await router.push({ path: `/interno/negocio/${option}` });
              loading.value = false;
            } catch (routeError) {
              loading.value = false;
              alertError.value = routeError?.message || 'Error navigating to route';
            }
          }
        }
      } catch (error) {
        loading.value = false;
        alertError.value = error?.message || 'An unexpected error occurred';
      }
    };

    const isActiveBusiness = () => state.business && state.business.active === true;

    const getBusinessLink = () => {
      const businessKeyName = state.business.keyName;
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    };

    const getClientPortalLink = () => {
      // Use commerce keyName for client portal, fallback to business if no commerce selected
      const keyName = state.commerces.length > 0 && store.getCurrentCommerce?.keyName
        ? store.getCurrentCommerce.keyName
        : state.business.keyName;
      return `/public/portal/${keyName}/login`;
    };

    const onShowMobileMenuSide = () => {
      state.showMobileMenuSide = true;
      state.showMobileSpySide = false;
    };

    const onShowMobileSpySide = () => {
      state.showMobileMenuSide = false;
      state.showMobileSpySide = true;
    };

    return {
      state,
      loading,
      alertError,
      isActiveBusiness,
      goToOption,
      getBusinessLink,
      getClientPortalLink,
      onShowMobileMenuSide,
      onShowMobileSpySide,
    };
  },
};
</script>

<template>
  <div>
    <div class="content">
      <!-- Mobile/Tablet Layout -->
      <div class="d-block d-lg-none mobile-menu-layout">
        <div class="text-center">
          <CommerceLogo :src="state.business?.logo" :loading="loading"></CommerceLogo>
          <WelcomeMenu
            :name="state.currentUser.name"
            :toggles="state.toggles"
            component-name="businessMenu"
          >
          </WelcomeMenu>
        </div>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div id="menu-mobile">
          <div class="sub-menu-spy">
            <span v-if="state.showMobileMenuSide" @click="onShowMobileSpySide()"
              >{{ $t('businessMenu.seeSpy') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
            <span v-else @click="onShowMobileMenuSide()"
              >{{ $t('businessMenu.seeMenu') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
          </div>
          <div class="mobile-content-wrapper">
            <Transition name="slide" mode="out-in">
              <div
                v-if="state.showMobileMenuSide === true"
                id="menu-side-mobile"
                :key="`menu-side-mobile`"
              >
                <div class="choose-attention my-3 mt-4">
                  <span>{{ $t('businessMenu.choose') }}</span>
                </div>
                <div class="row">
                  <div
                    v-for="option in state.menuOptions"
                    :key="option"
                    class="d-grid btn-group btn-group-justified mobile-button-wrapper"
                  >
                    <div v-if="option === 'go-minisite'" class="centered">
                      <a
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style mobile-menu-btn"
                        :href="`${getBusinessLink()}`"
                        target="_blank"
                      >
                        {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                      </a>
                    </div>
                    <div v-else-if="option === 'client-portal'" class="centered">
                      <a
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style mobile-menu-btn"
                        :href="`${getClientPortalLink()}`"
                        target="_blank"
                      >
                        {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                      </a>
                    </div>
                    <div v-else>
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style mobile-menu-btn"
                        @click="goToOption(option)"
                        :disabled="!state.toggles[`business.main-menu.${option}`]"
                      >
                        {{ $t(`businessMenu.${option}`) }}
                        <i
                          v-if="option === 'manage-admin'"
                          :class="`bi ${
                            state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                          }`"
                        ></i>
                        <i
                          v-if="option === 'control-admin'"
                          :class="`bi ${
                            state.manageControlSubMenuOption === true
                              ? 'bi-chevron-up'
                              : 'bi-chevron-down'
                          }`"
                        ></i>
                        <i
                          v-if="option === 'medical-management'"
                          :class="`bi ${
                            state.medicalManagementSubMenuOption === true
                              ? 'bi-chevron-up'
                              : 'bi-chevron-down'
                          }`"
                        ></i>
                      </button>
                      <div
                        v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                        class="mobile-submenu-container"
                      >
                        <div
                          v-for="opt in state.manageSubMenuOptions"
                          :key="opt"
                          class="mobile-submenu-item"
                        >
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style mobile-menu-btn mobile-submenu-btn"
                            @click="goToOption(opt)"
                            :disabled="!state.toggles[`business.main-menu.${opt}`]"
                            :title="
                              !state.toggles[`business.main-menu.${opt}`]
                                ? $t('businessMenu.permissionRequired')
                                : ''
                            "
                          >
                            {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="
                          option === 'control-admin' && state.manageControlSubMenuOption === true
                        "
                        class="mobile-submenu-container"
                      >
                        <div
                          v-for="opt in state.manageControlSubMenuOptions"
                          :key="opt"
                          class="mobile-submenu-item"
                        >
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style mobile-menu-btn mobile-submenu-btn"
                            @click="goToOption(opt)"
                            :disabled="!state.toggles[`business.main-menu.${opt}`]"
                          >
                            {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                      <div
                        v-if="
                          option === 'medical-management' &&
                          state.medicalManagementSubMenuOption === true
                        "
                        class="mobile-submenu-container"
                      >
                        <div
                          v-for="opt in state.medicalManagementSubMenuOptions"
                          :key="opt"
                          class="mobile-submenu-item"
                        >
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style mobile-menu-btn mobile-submenu-btn"
                            @click="goToOption(opt)"
                            :disabled="!state.toggles[`business.main-menu.${opt}`]"
                          >
                            {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="!isActiveBusiness() && !loading">
                  <Message
                    :title="$t('businessMenu.message.1.title')"
                    :content="$t('businessMenu.message.1.content')"
                    :icon="'bi bi-emoji-dizzy'"
                  >
                  </Message>
                </div>
              </div>
              <div
                v-else-if="state.showMobileSpySide"
                id="spy-side-mobile"
                :key="`spy-side-mobile`"
              >
                <SpySection :show="true" :commerces="state.commerces"> </SpySection>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Desktop Layout -->
      <div class="d-none d-lg-block desktop-menu-layout">
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row">
          <div class="col-auto desktop-logo-wrapper">
            <CommerceLogo :src="state.business?.logo" :loading="loading" />
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <WelcomeMenu
              :name="state.currentUser.name"
              :toggles="state.toggles"
              component-name="businessMenu"
            >
            </WelcomeMenu>
          </div>
        </div>
        <div id="menu-desktop" class="row desktop-menu-content">
          <div id="menu-side" class="col-lg-5 desktop-menu-column">
            <div class="choose-attention my-3 mb-4">
              <span>{{ $t('businessMenu.choose') }}</span>
            </div>
            <div class="row menu-buttons-grid">
              <div
                v-for="option in state.menuOptions"
                :key="option"
                class="col-12 col-lg-6 menu-button-wrapper"
              >
                <div v-if="option === 'go-minisite'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style desktop-menu-btn"
                    :href="`${getBusinessLink()}`"
                    target="_blank"
                  >
                    {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else-if="option === 'client-portal'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style desktop-menu-btn"
                    :href="`${getClientPortalLink()}`"
                    target="_blank"
                  >
                    {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else>
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style desktop-menu-btn"
                    @click="goToOption(option)"
                    :disabled="!state.toggles[`business.main-menu.${option}`]"
                  >
                    {{ $t(`businessMenu.${option}`) }}
                    <i
                      v-if="option === 'manage-admin'"
                      :class="`bi ${
                        state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'control-admin'"
                      :class="`bi ${
                        state.manageControlSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                    <i
                      v-if="option === 'medical-management'"
                      :class="`bi ${
                        state.medicalManagementSubMenuOption === true
                          ? 'bi-chevron-up'
                          : 'bi-chevron-down'
                      }`"
                    ></i>
                  </button>
                  <Transition name="fade">
                    <div
                      v-if="option === 'manage-admin' && state.manageSubMenuOption === true"
                      class="submenu-container"
                    >
                      <div
                        v-for="opt in state.manageSubMenuOptions"
                        :key="opt"
                        class="submenu-item"
                      >
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size fw-bold btn-light rounded-pill mt-1 btn-style desktop-menu-btn desktop-submenu-btn"
                          @click="goToOption(opt)"
                          :disabled="!state.toggles[`business.main-menu.${opt}`]"
                        >
                          {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  </Transition>
                  <Transition name="fade">
                    <div
                      v-if="option === 'control-admin' && state.manageControlSubMenuOption === true"
                      class="submenu-container"
                    >
                      <div
                        v-for="opt in state.manageControlSubMenuOptions"
                        :key="opt"
                        class="submenu-item"
                      >
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size fw-bold btn-light rounded-pill mt-1 btn-style desktop-menu-btn desktop-submenu-btn"
                          @click="goToOption(opt)"
                          :disabled="!state.toggles[`business.main-menu.${opt}`]"
                        >
                          {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  </Transition>
                  <Transition name="fade">
                    <div
                      v-if="
                        option === 'medical-management' &&
                        state.medicalManagementSubMenuOption === true
                      "
                      class="submenu-container"
                    >
                      <div
                        v-for="opt in state.medicalManagementSubMenuOptions"
                        :key="opt"
                        class="submenu-item"
                      >
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size fw-bold btn-light rounded-pill mt-1 btn-style desktop-menu-btn desktop-submenu-btn"
                          @click="goToOption(opt)"
                          :disabled="!state.toggles[`business.main-menu.${opt}`]"
                        >
                          {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
            <div v-if="!isActiveBusiness() && !loading">
              <Message
                :title="$t('businessMenu.message.1.title')"
                :content="$t('businessMenu.message.1.content')"
                :icon="'bi bi-emoji-dizzy'"
              >
              </Message>
            </div>
          </div>
          <div id="spy-side" class="col-lg-7 desktop-spy-column" v-if="!loading">
            <SpySection :show="true" :commerces="state.commerces"> </SpySection>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-style {
  line-height: 1rem;
  padding: 0.65rem 0rem;
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
.spy-details {
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 0.8rem;
  cursor: pointer;
}
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}
/* Mobile card container for slide transition */
.mobile-card-container {
  position: relative;
  overflow: hidden;
}

.mobile-content-wrapper {
  position: relative;
  min-height: 400px;
  width: 100%;
}

/* Slide transition for mobile card swap */
.slide-enter-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

#menu-side-mobile,
#spy-side-mobile {
  width: 100%;
  will-change: transform, opacity;
}
.sub-menu-spy {
  text-decoration: underline;
  margin: 1rem;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 0.8rem;
  cursor: pointer;
}

/* Desktop menu layout improvements */
.menu-buttons-grid {
  gap: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: stretch;
}

.menu-button-wrapper {
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
}

.menu-button-wrapper > div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.desktop-menu-btn {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

/* Submenu styles */
.submenu-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.submenu-item {
  width: 100%;
  display: flex;
  justify-content: center;
  max-width: 100%;
}

.submenu-item .desktop-submenu-btn {
  width: 100%;
  max-width: 100%;
}

/* Desktop: more compact button layout */
@media (min-width: 992px) {
  .desktop-menu-btn {
    font-size: 0.85rem;
    padding: 0.45rem 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    margin: 0 auto;
  }

  .desktop-submenu-btn {
    font-size: 0.8rem;
    padding: 0.4rem 0.85rem;
    width: 100%;
    max-width: 100%;
  }

  .menu-button-wrapper {
    padding: 0 0.25rem;
    justify-content: flex-start;
    align-items: center;
  }

  .submenu-container {
    width: 100%;
    gap: 0.25rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .submenu-item {
    width: 100%;
    max-width: 100%;
  }

  .menu-buttons-grid {
    gap: 0.35rem;
    justify-content: center;
  }
}

/* Desktop Menu Layout Styles */
@media (min-width: 992px) {
  .desktop-menu-layout {
    padding: 0;
    width: 100%;
  }

  .desktop-menu-layout .content {
    padding-left: 15px;
    padding-right: 15px;
    max-width: 100%;
  }

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

  .desktop-menu-content {
    align-items: flex-start;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .desktop-menu-column {
    padding-right: 1.5rem;
  }

  .desktop-spy-column {
    min-width: 0;
    padding-left: 1.5rem;
  }

  /* Align titles to the center in desktop layout */
  .desktop-menu-column .choose-attention {
    text-align: center;
  }

  .desktop-spy-column .spy-title {
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .desktop-spy-column .spy-subdetails {
    text-align: center;
  }

  .desktop-spy-column .spy-details {
    text-align: center;
  }
}

/* Mobile: Center menu buttons */
@media (max-width: 991px) {
  #menu-side-mobile .row {
    justify-content: center;
  }

  .mobile-button-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .mobile-button-wrapper > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .mobile-menu-btn.col-8 {
    flex: 0 0 auto;
    width: 66.666667%;
    margin-left: auto;
    margin-right: auto;
  }

  /* Mobile submenu styles */
  .mobile-submenu-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .mobile-submenu-item {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .mobile-submenu-btn {
    width: 66.666667%;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
