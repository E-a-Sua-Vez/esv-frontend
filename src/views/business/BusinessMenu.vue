<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivationByBusinessId } from '../../application/services/plan-activation';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';
import WelcomeMenu from '../../components/common/WelcomeMenu.vue';
import SpySection from '../../components/domain/SpySection.vue';

export default {
  name: 'BusinessMenu',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, PlanStatus, ToggleCapabilities, WelcomeMenu, SpySection },
  async setup() {
    const router = useRouter();

    let loading = ref(false);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      business: {},
      commerces: [],
      manageSubMenuOption: false,
      manageControlSubMenuOption: false,
      menuOptions: [
        'dashboard',
        'reports',
        'booking-manage',
        'control-admin',
        'manage-admin',
        'configuration',
        'documents',
        'your-plan',
        'business-resume',
        'go-minisite'
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
        'permissions-admin'
      ],
      currentPlanActivation: {},
      toggles: {},
      showMobileMenuSide: true,
      showMobileSpySide: false
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.renewActualBusiness();
        state.commerces = state.business.commerces || [];
        state.currentPlanActivation = await getValidatedPlanActivationByBusinessId(state.business.id, true) || {};
        state.toggles = await getPermissions('business', 'main-menu');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error ? error.response ? error.respose.status : 500 : 500;
        loading.value = false;
      }
    })

    const goToOption = async (option) => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          if (option === 'manage-admin') {
            state.manageSubMenuOption = !state.manageSubMenuOption;
            state.manageControlSubMenuOption = false;
          } else if (option === 'control-admin') {
            state.manageControlSubMenuOption  = !state.manageControlSubMenuOption;
            state.manageSubMenuOption = false;
          } else {
            router.push({ path: `/interno/negocio/${option}` });
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const getBusinessLink = () => {
      const businessKeyName = state.business.keyName;
      return `${import.meta.env.VITE_URL}/interno/negocio/${businessKeyName}`;
    }

    const onShowMobileMenuSide = () => {
      state.showMobileMenuSide = true;
      state.showMobileSpySide = false;
    }

    const onShowMobileSpySide = () => {
      state.showMobileMenuSide = false;
      state.showMobileSpySide = true;
    }

    return {
      state,
      loading,
      alertError,
      isActiveBusiness,
      goToOption,
      getBusinessLink,
      onShowMobileMenuSide,
      onShowMobileSpySide
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <WelcomeMenu
        :name="state.currentUser.name"
        :toggles="state.toggles"
        componentName="businessMenu"
      >
      </WelcomeMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <PlanStatus
          :show="true"
          :planActivation="state.currentPlanActivation"
          :canAdmin="true">
        </PlanStatus>
      </div>
      <div id="menu-mobile" class="d-block d-md-none">
        <div class="sub-menu-spy">
          <span v-if="state.showMobileMenuSide" @click="onShowMobileSpySide()">{{ $t("businessMenu.seeSpy") }}<i class="bi bi-arrow-right-circle-fill mx-1"></i> </span>
          <span v-else @click="onShowMobileMenuSide()">{{ $t("businessMenu.seeMenu") }}<i class="bi bi-arrow-right-circle-fill mx-1"></i> </span>
        </div>
        <Transition name="flip">
          <div id="menu-side-mobile" :key="`menu-side-mobile`" v-if="state.showMobileMenuSide === true">
            <div class="choose-attention my-3 mt-4">
              <span>{{ $t("businessMenu.choose") }}</span>
            </div>
            <div class="row">
              <div
                v-for="option in state.menuOptions"
                :key="option"
                class="d-grid btn-group btn-group-justified">
                <div v-if="option === 'go-minisite'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style"
                    :href="`${getBusinessLink()}`"
                    target="_blank">
                    {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else>
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style"
                    @click="goToOption(option)"
                    :disabled="!state.toggles[`business.main-menu.${option}`]"
                    >
                    {{ $t(`businessMenu.${option}`) }}
                    <i v-if="option === 'manage-admin'" :class="`bi ${state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    <i v-if="option === 'control-admin'" :class="`bi ${state.manageControlSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                  </button>
                  <div v-if="option === 'manage-admin' && state.manageSubMenuOption === true" class="mb-1">
                    <div
                      v-for="opt in state.manageSubMenuOptions"
                      :key="opt"
                      >
                      <div class="centered mx-3">
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style"
                          @click="goToOption(opt)"
                          :disabled="!state.toggles[`business.main-menu.${opt}`]"
                          >
                          {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="option === 'control-admin' && state.manageControlSubMenuOption === true" class="mb-1">
                    <div
                      v-for="opt in state.manageControlSubMenuOptions"
                      :key="opt"
                      >
                      <div class="centered mx-3">
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style"
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
            </div>
            <div v-if="!isActiveBusiness() && !loading">
              <Message
                :title="$t('businessMenu.message.1.title')"
                :content="$t('businessMenu.message.1.content')"
                :icon="'bi bi-emoji-dizzy'">
              </Message>
            </div>
          </div>
        </Transition>
        <Transition name="flip">
          <div id="spy-side-mobile" :key="`spy-side-mobile`" v-if="state.showMobileSpySide">
            <SpySection
              :show="true"
              :commerces="state.commerces"
            >
            </SpySection>
          </div>
        </Transition>
      </div>
      <div id="menu-desktop" class="d-none d-md-block">
        <div class="row">
          <div id="menu-side" class="col-6">
            <div class="choose-attention my-3 mb-4">
              <span>{{ $t("businessMenu.choose") }}</span>
            </div>
            <div class="row">
              <div
                v-for="option in state.menuOptions"
                :key="option"
                class="d-grid btn-group btn-group-justified">
                <div v-if="option === 'go-minisite'" class="centered">
                  <a
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2 btn-style"
                    :href="`${getBusinessLink()}`"
                    target="_blank">
                    {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
                <div v-else>
                  <button
                    type="button"
                    class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-1 mb-2 btn-style"
                    @click="goToOption(option)"
                    :disabled="!state.toggles[`business.main-menu.${option}`]"
                    >
                    {{ $t(`businessMenu.${option}`) }}
                    <i v-if="option === 'manage-admin'" :class="`bi ${state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    <i v-if="option === 'control-admin'" :class="`bi ${state.manageControlSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                  </button>
                  <Transition name="fade">
                    <div v-if="option === 'manage-admin' && state.manageSubMenuOption === true" class="mb-1">
                    <div
                      v-for="opt in state.manageSubMenuOptions"
                      :key="opt"
                      ><div class="centered mx-3">
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style"
                            @click="goToOption(opt)"
                            :disabled="!state.toggles[`business.main-menu.${opt}`]"
                            >
                            {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Transition>
                  <Transition name="fade">
                    <div v-if="option === 'control-admin' && state.manageControlSubMenuOption === true" class="mb-1">
                      <div
                        v-for="opt in state.manageControlSubMenuOptions"
                        :key="opt"
                        >
                        <div class="centered mx-3">
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1 btn-style"
                            @click="goToOption(opt)"
                            :disabled="!state.toggles[`business.main-menu.${opt}`]"
                            >
                            {{ $t(`businessMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                          </button>
                        </div>
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
                :icon="'bi bi-emoji-dizzy'">
              </Message>
            </div>
          </div>
          <div id="spy-side" class="col-6" v-if="!loading">
            <SpySection
              :show="true"
              :commerces="state.commerces"
            >
            </SpySection>
          </div>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-style {
  line-height: 1rem;
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
.spy-details {
  font-size: .7rem;
  font-weight: 500;
  line-height: .8rem;
  cursor: pointer;
}
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
}
.flip-enter-active,
.flip-leave-active {
  transition: all 1s ease;
}
.flip-enter-from, .flip-leave-to {
  transform: rotateY(180deg);
  opacity: 0;
}
.flip-enter-active {
  animation: bounce-in 0.5s;
}
.flip-leave-active {
  animation: bounce-in 0.5s reverse;
}
.sub-menu-spy {
  text-decoration: underline;
  margin: 1rem;
  text-align: right;
  font-size: .9rem;
  font-weight: 500;
  line-height: .8rem;
  cursor: pointer;
}
</style>