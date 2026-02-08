<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivationByBusinessId } from '../../application/services/plan-activation';
import { getCommerceById } from '../../application/services/commerce';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';
import CollaboratorSpySection from '../../components/collaborator/CollaboratorSpySection.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import { getCollaboratorById } from '../../application/services/collaborator';

export default {
  name: 'CollaboratorMenu',
  components: {
    Message,
    Spinner,
    Alert,
    PlanStatus,
    ToggleCapabilities,
    WelcomeMenu,
    CollaboratorSpySection,
    CommerceLogo,
  },
  async setup() {
    const router = useRouter();

    const loading = ref(false);
    const alertError = ref('');

    const store = globalStore();

    // Use global commerce and business from store
    const commerce = computed(() => store.getCurrentCommerce);
    const business = computed(() => store.getCurrentBusiness);

    const state = reactive({
      currentUser: {},
      collaborator: {},
      manageSubMenuOption: false,
      collaboratorOptions: [
        'queue-manage',
        'booking-manage',
        'tracing',
        'product-stock',
        'dashboard',
        'go-minisite',
        'client-portal',
      ],
      menuIcons: {
        'queue-manage': 'bi-list-check',
        'booking-manage': 'bi-calendar-check',
        tracing: 'bi-search',
        'product-stock': 'bi-box-seam',
        dashboard: 'bi-speedometer2',
        'go-minisite': 'bi-globe',
        'client-portal': 'bi-person-circle',
      },
      currentPlanActivation: {},
      toggles: {},
      showMobileMenuSide: true,
      showMobileSpySide: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.collaborator = state.currentUser;
        if (!state.collaborator.id) {
          state.collaborator = await getCollaboratorById(state.currentUser.id);
        }

        // Set initial commerce if not set - check both commerceId and commercesId
        if (!commerce.value || !commerce.value.id) {
          // First try commerceId (single commerce)
          if (state.collaborator.commerceId) {
            const initialCommerce = await getCommerceById(state.collaborator.commerceId);
            if (initialCommerce && initialCommerce.id) {
              await store.setCurrentCommerce(initialCommerce);
            }
          }
          // If still no commerce, try commercesId (multiple commerces)
          if (
            (!commerce.value || !commerce.value.id) &&
            state.collaborator.commercesId &&
            state.collaborator.commercesId.length > 0
          ) {
            const firstCommerceId = state.collaborator.commercesId[0];
            if (firstCommerceId) {
              const initialCommerce = await getCommerceById(firstCommerceId);
              if (initialCommerce && initialCommerce.id) {
                await store.setCurrentCommerce(initialCommerce);
              }
            }
          }
        }

        // Load business if not set
        if (!business.value || !business.value.id) {
          const businessData = await store.renewActualBusiness();
          if (businessData && businessData.id) {
            await store.setCurrentBusiness(businessData);
          }
        }

        // Load plan activation and permissions in parallel
        const [planActivation, toggles] = await Promise.all([
          commerce.value?.id
            ? getValidatedPlanActivationByBusinessId(commerce.value?.id, true)
            : Promise.resolve({}),
          getPermissions('collaborator', 'main-menu'),
        ]);

        state.currentPlanActivation = planActivation || {};
        state.toggles = toggles;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    const goToOption = async option => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'queue-manage') {
            router.push({ path: `/interno/commerce/${commerce.value?.id}/colaborador/filas` });
          } else if (option === 'booking-manage') {
            router.push({ path: `/interno/commerce/${commerce.value?.id}/colaborador/bookings` });
          } else if (option === 'dashboard') {
            router.push({ path: '/interno/colaborador/dashboard' });
          } else if (option === 'tracing') {
            router.push({ path: '/interno/colaborador/tracing' });
          } else if (option === 'product-stock') {
            router.push({ path: '/interno/colaborador/product-stock' });
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };
    const isActiveBusiness = () => commerce.value && commerce.value.active === true;
    const getCommerceLink = () => {
      const commerceKeyName = commerce.value?.keyName;
      return commerceKeyName
        ? `${import.meta.env.VITE_URL}/interno/comercio/${commerceKeyName}`
        : '';
    };

    const getClientPortalLink = () => {
      const commerceKeyName = commerce.value?.keyName;
      return commerceKeyName ? `/public/portal/${commerceKeyName}/login` : '';
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
      commerce,
      business,
      loading,
      alertError,
      isActiveBusiness,
      goToOption,
      getCommerceLink,
      getClientPortalLink,
      onShowMobileMenuSide,
      onShowMobileSpySide,
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none mobile-menu-layout">
      <div class="content text-center">
        <div class="mobile-commerce-logo">
          <CommerceLogo
            :business-id="business?.id"
            :commerce-id="commerce?.id"
            :loading="loading"
          />
        </div>
        <WelcomeMenu
          :title="$t(`collaboratorMenu.welcome`)"
          :name="state.currentUser.name"
          :toggles="state.toggles"
          component-name="collaboratorMenu"
        >
        </WelcomeMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div id="menu-mobile">
          <div class="sub-menu-spy">
            <span v-if="state.showMobileMenuSide" @click="onShowMobileSpySide()"
              >{{ $t('collaboratorMenu.seeSpy') }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
            </span>
            <span v-else @click="onShowMobileMenuSide()"
              >{{ $t('collaboratorMenu.seeMenu')
              }}<i class="bi bi-arrow-right-circle-fill mx-1"></i>
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
                  <span>{{ $t('collaboratorMenu.choose') }}</span>
                </div>
                <!-- Main menu options (including portal and minisite) -->
                <div class="row col-12">
                  <div
                    v-for="option in state.collaboratorOptions.filter(
                      opt => opt !== 'go-minisite' && opt !== 'client-portal'
                    )"
                    :key="option"
                    class="col-6 centered mobile-card-wrapper"
                  >
                    <div
                      class="col-6 menu-card mobile-menu-card"
                      @click="goToOption(option)"
                      :class="{ disabled: !state.toggles[`collaborator.main-menu.${option}`] }"
                    >
                      <div class="card-icon">
                        <i :class="`bi ${state.menuIcons[option]}`"></i>
                      </div>
                      <div class="card-text">{{ $t(`collaboratorMenu.${option}`) }}</div>
                    </div>
                  </div>
                  <!-- Portal and Minisite buttons in same row -->
                  <div class="row">
                    <div class="col-6 centered mobile-portal-wrapper">
                      <a
                        class="menu-card mobile-menu-card portal-card external-link"
                        :href="`${getCommerceLink()}`"
                        target="_blank"
                      >
                        <div class="card-icon">
                          <i :class="`bi ${state.menuIcons['go-minisite']}`"></i>
                        </div>
                        <div class="card-text">{{ $t('collaboratorMenu.go-minisite') }}</div>
                        <i class="bi bi-box-arrow-up-right external-icon"></i>
                      </a>
                    </div>
                    <div class="col-6 centered mobile-portal-wrapper">
                      <a
                        class="menu-card mobile-menu-card portal-card external-link"
                        :href="`${getClientPortalLink()}`"
                        target="_blank"
                      >
                        <div class="card-icon">
                          <i :class="`bi ${state.menuIcons['client-portal']}`"></i>
                        </div>
                        <div class="card-text">{{ $t('collaboratorMenu.client-portal') }}</div>
                        <i class="bi bi-box-arrow-up-right external-icon"></i>
                      </a>
                    </div>
                  </div>
                </div>
                <div v-if="!isActiveBusiness() && !loading">
                  <Message
                    :title="$t('collaboratorMenu.message.1.title')"
                    :content="$t('collaboratorMenu.message.1.content')"
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
                <CollaboratorSpySection
                  :show="true"
                  :commerce="commerce"
                  :collaborator="state.collaborator"
                >
                </CollaboratorSpySection>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <PlanStatus :show="true" :plan-activation="state.currentPlanActivation" :can-admin="true">
          </PlanStatus>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <CommerceLogo
                  :business-id="business?.id"
                  :commerce-id="commerce?.id"
                  :loading="loading"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <WelcomeMenu
              :title="$t(`collaboratorMenu.welcome`)"
              :name="state.currentUser.name"
              :toggles="state.toggles"
              component-name="collaboratorMenu"
            >
            </WelcomeMenu>
          </div>
        </div>
        <div id="menu-desktop" class="row desktop-menu-content">
          <div id="menu-side" class="col-lg-5 desktop-menu-column">
            <div class="choose-attention my-3 mb-4">
              <span>{{ $t('collaboratorMenu.choose') }}</span>
            </div>
            <!-- Main menu options (excluding portal and minisite) -->
            <div class="row menu-cards-grid">
              <div
                v-for="option in state.collaboratorOptions.filter(
                  opt => opt !== 'go-minisite' && opt !== 'client-portal'
                )"
                :key="option"
                class="col-12 col-md-6 col-lg-4 menu-card-wrapper"
              >
                <div
                  class="menu-card"
                  @click="goToOption(option)"
                  :class="{ disabled: !state.toggles[`collaborator.main-menu.${option}`] }"
                >
                  <div class="card-icon">
                    <i :class="`bi ${state.menuIcons[option]}`"></i>
                  </div>
                  <div class="card-text">{{ $t(`collaboratorMenu.${option}`) }}</div>
                </div>
              </div>
            </div>
            <!-- Portal and Minisite buttons in separate row -->
            <div class="row portal-row justify-content-center mt-3">
              <div class="col-auto portal-card-wrapper">
                <a
                  class="menu-card portal-card external-link"
                  :href="`${getCommerceLink()}`"
                  target="_blank"
                >
                  <div class="card-icon">
                    <i :class="`bi ${state.menuIcons['go-minisite']}`"></i>
                  </div>
                  <div class="card-text">{{ $t('collaboratorMenu.go-minisite') }}</div>
                  <i class="bi bi-box-arrow-up-right external-icon"></i>
                </a>
              </div>
              <div class="col-auto portal-card-wrapper">
                <a
                  class="menu-card portal-card external-link"
                  :href="`${getClientPortalLink()}`"
                  target="_blank"
                >
                  <div class="card-icon">
                    <i :class="`bi ${state.menuIcons['client-portal']}`"></i>
                  </div>
                  <div class="card-text">{{ $t('collaboratorMenu.client-portal') }}</div>
                  <i class="bi bi-box-arrow-up-right external-icon"></i>
                </a>
              </div>
            </div>
            <div v-if="!isActiveBusiness() && !loading">
              <Message
                :title="$t('collaboratorMenu.message.1.title')"
                :content="$t('collaboratorMenu.message.1.content')"
                :icon="'bi bi-emoji-dizzy'"
              >
              </Message>
            </div>
          </div>
          <div id="spy-side" class="col-lg-7 desktop-spy-column" v-if="!loading">
            <CollaboratorSpySection
              :show="true"
              :commerce="commerce"
              :collaborator="state.collaborator"
            >
            </CollaboratorSpySection>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}

.btn-style {
  line-height: 1rem;
  padding: 0.65rem 0rem;
}

/* Mobile card container for slide transition */
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

/* New card-based menu styles */
.menu-cards-grid {
  gap: 0.5rem;
  justify-content: center;
}

.menu-card-wrapper {
  display: flex;
  justify-content: center;
}

.menu-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.5rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-left: 3px solid #007bff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  height: 90px;
  width: 140px;
  text-decoration: none;
  color: inherit;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.12);
  border-color: var(--azul-turno);
}

.menu-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-card.disabled:hover {
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.card-icon {
  font-size: 1.25rem;
  color: var(--azul-turno);
  margin-bottom: 0.15rem;
  position: relative;
}

.card-text {
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  color: #333;
  line-height: 1.1;
  word-wrap: break-word;
  hyphens: auto;
  padding: 0 0.1rem;
}

.external-link .card-text {
  margin-right: 0.1rem;
}

.external-icon {
  font-size: 0.6rem;
  color: var(--azul-turno);
}

/* Portal card styles - blue background with white icons */
.portal-card {
  background: var(--azul-turno) !important;
  border-color: var(--azul-turno) !important;
  border-left: 3px solid #0056b3 !important;
  color: white !important;
  width: 120px !important;
}

.portal-card .card-icon {
  color: white !important;
}

.portal-card .card-text {
  color: white !important;
}

.portal-card .external-icon {
  color: white !important;
}

.portal-card:hover {
  background: var(--azul-turno-hover, #0056b3) !important;
  border-color: var(--azul-turno-hover, #0056b3) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.25) !important;
}

/* Portal row styles */
.portal-row {
  margin-top: 1rem;
}

.portal-card-wrapper {
  padding: 0 0.25rem;
}

/* Mobile card styles */
.mobile-cards-grid {
  gap: 0.4rem;
  justify-content: center;
  padding: 0 0.5rem;
}

.mobile-card-wrapper {
  display: flex;
  justify-content: center;
  padding: 0.15rem;
}

.mobile-menu-card {
  height: 100px;
  padding: 0.5rem 0.4rem;
  width: 140px; /* Regular buttons wider */
}

.mobile-menu-card .card-icon {
  font-size: 1.1rem;
  margin-bottom: 0.1rem;
}

.mobile-menu-card .card-text {
  font-size: 0.85rem; /* Reduced for long text */
  font-weight: 500;
  padding: 0 0.1rem;
  word-wrap: break-word;
  hyphens: auto;
  line-height: 1.1;
}

/* Mobile portal row */
.mobile-portal-row {
  margin-top: 1rem;
  padding: 0 0.5rem;
}

.mobile-portal-wrapper {
  padding: 0.15rem;
}

/* Portal cards in mobile should be narrower */
.mobile-menu-card.portal-card {
  width: 100% !important;
}

/* Mobile card styles */
.mobile-cards-grid {
  gap: 0.5rem;
  justify-content: center;
}

.mobile-card-wrapper {
  display: flex;
  justify-content: center;
  padding: 0.25rem;
}

.mobile-menu-card {
  height: 100px;
  padding: 0.75rem 0.5rem;
  width: 140px; /* Regular buttons wider */
}

.mobile-menu-card .card-icon {
  font-size: 1.25rem;
  margin-bottom: 0.2rem;
}

.mobile-menu-card .card-text {
  font-size: 0.85rem; /* Better readability */
  font-weight: 500;
}
</style>
