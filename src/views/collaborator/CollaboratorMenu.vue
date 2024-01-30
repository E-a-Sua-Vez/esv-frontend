<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivationByBusinessId } from '../../application/services/plan-activation';
import { getCommerceById } from '../../application/services/commerce';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';

export default {
  name: 'CollaboratorMenu',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, PlanStatus, ToggleCapabilities },
  async setup() {
    const router = useRouter();

    let loading = ref(false);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      commerce: {},
      manageSubMenuOption: false,
      collaboratorOptions: [
        'queue-manage',
        'dashboard',
      ],
      currentPlanActivation: {},
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.commerce = await getCommerceById(state.currentUser.commerceId);
        state.currentPlanActivation = await getValidatedPlanActivationByBusinessId(state.commerce.id, true) || {};
        state.toggles = await getPermissions('collaborator', 'main-menu');
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
          if (option === 'queue-manage') {
            router.push({ path: `/interno/commerce/${state.commerce.id}/colaborador/filas` });
          } else if (option === 'dashboard') {
            router.push({ path: `/interno/colaborador/dashboard` });
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };
    const isActiveBusiness = () => {
      return state.commerce && state.commerce.active === true;
    };

    return {
      state,
      loading,
      alertError,
      isActiveBusiness,
      goToOption
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <div id="welcome">
            <span v-if="!state.currentUser" class="welcome">{{ $t("collaboratorMenu.welcome") }}</span>
            <span v-else class="welcome-user">{{ $t("collaboratorMenu.welcome-user") }}, {{ state.currentUser.name }}!</span>
          </div>
        </div>
        <ToggleCapabilities
            :toggles="state.toggles"
            componentName="collaboratorMenu"
          ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <PlanStatus
          :show="true"
          :planActivation="state.currentPlanActivation"
          :canAdmin="true">
        </PlanStatus>
        <div class="choose-attention">
          <span>{{ $t("collaboratorMenu.choose") }}</span>
        </div>
      </div>
      <div id="menu">
        <div class="row">
          <div
            v-for="option in state.collaboratorOptions"
            :key="option"
            class="d-grid btn-group btn-group-justified">
            <div>
              <button
                  type="button"
                  class="btn btn-lg btn-block btn-size col-8 fw-bold btn-dark rounded-pill mt-2 mb-2"
                  @click="goToOption(option)"
                  :disabled="!state.toggles[`collaborator.main-menu.${option}`]"
                  >
                  {{ $t(`collaboratorMenu.${option}`) }}
                  <i v-if="option === 'manage-admin'" :class="`bi ${state.manageSubMenuOption === true ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </button>
                <div v-if="option === 'manage-admin' && state.manageSubMenuOption === true" class="mb-1">
                  <div
                    v-for="opt in state.manageSubMenuOptions"
                    :key="opt"
                    class="centered mx-3">
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size col-8 fw-bold btn-light rounded-pill mt-1"
                        @click="goToOption(opt)"
                        >
                        {{ $t(`collaboratorMenu.${opt}`) }} <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
        <div v-if="!isActiveBusiness() && !loading">
          <Message
            :title="$t('collaboratorMenu.message.1.title')"
            :content="$t('collaboratorMenu.message.1.content')"
            :icon="'bi bi-emoji-dizzy'">
          </Message>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
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
  border: 1.5px solid var(--gris-default);
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
</style>