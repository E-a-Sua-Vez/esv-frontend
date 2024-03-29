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

export default {
  name: 'BusinessMenu',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, PlanStatus, ToggleCapabilities, WelcomeMenu },
  async setup() {
    const router = useRouter();

    let loading = ref(false);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      business: {},
      manageSubMenuOption: false,
      menuOptions: [
        'dashboard',
        'tracing',
        'reports',
        'manage-admin',
        'configuration',
        'your-plan',
        'business-resume',
        'go-minisite'
      ],
      manageSubMenuOptions: [
        'commerce-admin',
        'service-admin',
        'modules-admin',
        'queues-admin',
        'collaborators-admin',
        'surveys-admin',
        'permissions-admin'
      ],
      currentPlanActivation: {},
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.renewActualBusiness();
        state.currentPlanActivation = await getValidatedPlanActivationByBusinessId(state.business.id, true) || {};
        state.toggles = await getPermissions('business', 'main-menu');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
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

    return {
      state,
      loading,
      alertError,
      isActiveBusiness,
      goToOption,
      getBusinessLink
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
        <div class="choose-attention">
          <span>{{ $t("businessMenu.choose") }}</span>
        </div>
      </div>
      <div id="menu">
        <div class="row">
          <div
            v-for="option in state.menuOptions"
            :key="option"
            class="d-grid btn-group btn-group-justified">
            <div v-if="option === 'go-minisite'" class="centered">
              <a
                type="button"
                class="btn btn-lg btn-block btn-size col-8 fw-bold btn-secondary rounded-pill mt-2 mb-2"
                :href="`${getBusinessLink()}`"
                target="_blank">
                {{ $t(`businessMenu.${option}`) }} <i class="bi bi-box-arrow-up-right"></i>
              </a>
            </div>
            <div v-else>
              <button
                  type="button"
                  class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="goToOption(option)"
                  :disabled="!state.toggles[`business.main-menu.${option}`]"
                  >
                  {{ $t(`businessMenu.${option}`) }}
                  <i v-if="option === 'manage-admin'" :class="`bi ${state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </button>
                <div v-if="option === 'manage-admin' && state.manageSubMenuOption === true" class="mb-1">
                  <div
                    v-for="opt in state.manageSubMenuOptions"
                    :key="opt"
                    ><div class="centered mx-3">
                        <button
                          type="button"
                          class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1"
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
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
</style>