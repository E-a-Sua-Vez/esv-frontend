<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPlans, getPlanById } from '../../application/services/plan';
import {
  addPlanActivation,
  getValidatedPlanActivationByBusinessId,
} from '../../application/services/plan-activation';
import { getPermissions } from '../../application/services/permissions';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SimplePlanCard from '../../components/plan/SimplePlanCard.vue';
import Plan from '../../components/plan/Plan.vue';
import PlanSelection from '../../components/domain/PlanSelection.vue';
import NotificationConditions from '../../components/conditions/NotificationConditions.vue';
import PlanStatus from '../../components/plan/PlanStatus.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessPlan',
  components: {
    CommerceLogo,
    Message,
    PoweredBy,
    Spinner,
    Alert,
    Warning,
    SimplePlanCard,
    Plan,
    PlanSelection,
    NotificationConditions,
    PlanStatus,
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
      plans: ref({}),
      plan: {},
      currentPlanActivationRequested: {},
      planSelected: {},
      newPlan: {},
      toggles: {},
      acceptTerms: false,
      active: 0,
      errorsAdd: [],
      errorPlan: false,
      acceptTermsError: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        if (state.business.planId) {
          state.plan = await getPlanById(state.business.planId);
          const benefits = state.plan.description.split('-');
          state.plan.benefits = benefits;
          state.planSelected = state.plan;
        }
        state.plans = await getPlans();
        state.plans.forEach(plan => {
          const benefits = plan.description.split('-');
          plan.benefits = benefits;
        });
        state.currentPlanActivation = await getValidatedPlanActivationByBusinessId(
          state.business.id,
          true
        );
        state.currentPlanActivationRequested = await getValidatedPlanActivationByBusinessId(
          state.business.id,
          false
        );
        state.toggles = await getPermissions('plan', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = () => {
      state.errorsAdd = [];
      if (state.planSelected === {}) {
        state.planSelected = state.plan;
      }
      if (!state.planSelected || !state.planSelected.id) {
        state.planError = true;
        state.errorsAdd.push('businessPlan.validate.plan');
      } else {
        state.planError = false;
      }
      if (state.errorsAdd.length === 0) {
        const purchaseModal = document.getElementById('openPlanModal');
        purchaseModal.click();
      }
      return false;
    };

    const selectPlan = plan => {
      state.planSelected = plan;
    };

    const select = async (plan, paymentMethod, acceptTerms) => {
      try {
        loading.value = true;
        const body = {
          businessId: state.business.id,
          planId: plan.id,
          planPayedCopy: plan,
          renewable: false,
          origin: 'INTERNAL_SITE',
          paymentMethod,
          termsAccepted: acceptTerms,
        };
        await addPlanActivation(body);
        state.currentPlanActivationRequested = await getValidatedPlanActivationByBusinessId(
          state.business.id,
          false
        );
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    return {
      state,
      loading,
      alertError,
      validateAdd,
      goBack,
      isActiveBusiness,
      selectPlan,
      select,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessPlan.title`)"
        :toggles="state.toggles"
        component-name="businessPlan"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessPlan">
        <div v-if="state.toggles['plan.admin.view']">
          <div v-if="!loading" id="businessPlan-result" class="mt-4">
            <div>
              <div class="mb-4">
                <div v-if="state.plan.id && state.toggles['plan.admin.edit']">
                  <div class="plan-card">
                    <SimplePlanCard
                      :show="true"
                      :can-update="state.toggles[`plan.admin.update`]"
                      :plan="state.plan"
                      :show-tooltip="false"
                      :plan-activation="state.currentPlanActivation"
                    >
                    </SimplePlanCard>
                  </div>
                  <PlanStatus
                    :show="true"
                    :plan-activation="state.currentPlanActivation"
                    :can-renew="true"
                    @renew="validateAdd()"
                  >
                  </PlanStatus>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessPlan.message.2.title')"
                    :content="$t('businessPlan.message.2.content')"
                  />
                </div>
              </div>
              <div
                v-if="
                  !state.currentPlanActivationRequested.id && state.toggles['plan.admin.update']
                "
              >
                <div v-if="!state.plan.id" class="plan-select-title m-2">
                  <span class="fw-bold"> {{ $t('businessPlan.selectAPlan.1') }}</span>
                  {{ $t('businessPlan.selectAPlan.2') }}
                </div>
                <div v-else class="plan-select-title m-2">
                  <span class="fw-bold"> {{ $t('businessPlan.upgradePlan.1') }}</span>
                  {{ $t('businessPlan.upgradePlan.2') }}
                </div>
                <div class="plan-card my-3">
                  <div class="row row-cols-1 row-cols-md-1 g-1 m-2">
                    <div v-for="(plan, index) in state.plans" :key="index">
                      <Plan
                        :plan="plan"
                        :selected-plan="state.planSelected"
                        @click="selectPlan(plan)"
                      >
                      </Plan>
                    </div>
                  </div>
                  <div class="col">
                    <a
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill my-2 px-4"
                      @click="validateAdd()"
                      ><i class="bi bi-emoji-heart-eyes"></i> {{ $t('businessPlan.iwantit') }}</a
                    >
                    <button
                      id="openPlanModal"
                      href="#planSelectModal"
                      data-bs-toggle="modal"
                      data-bs-target="#planSelectModal"
                      hidden
                    ></button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsAdd" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                </div>
              </div>
              <div class="plan-card" v-if="state.currentPlanActivationRequested.id">
                <Message
                  :title="$t('businessPlan.message.3.title')"
                  :content="$t('businessPlan.message.3.content')"
                />
                <span>{{ $t('businessPlan.request') }}</span>
                <Plan
                  :plan="state.currentPlanActivationRequested.planPayedCopy"
                  :selected-plan="state.currentPlanActivationRequested.planPayedCopy"
                  @click="undefined"
                >
                </Plan>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!state.toggles['plan.admin.view'] && !loading">
          <Message
            :title="$t('businessPlan.message.1.title')"
            :content="$t('businessPlan.message.1.content')"
          />
        </div>
      </div>
      <!-- Modal Select Plan -->
      <div
        class="modal fade"
        id="planSelectModal"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0">
              <button
                id="closePlanSelectModal"
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body text-center pb-5">
              <PlanSelection :plan="state.planSelected" @select="select"> </PlanSelection>
            </div>
          </div>
        </div>
      </div>
      <!-- Modal Data Conditions -->
      <div
        class="modal fade"
        id="conditionsModal"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0">
              <button
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body text-center pb-5">
              <NotificationConditions></NotificationConditions>
              <a
                class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
                data-bs-toggle="modal"
                data-bs-target="#conditionsModal"
                >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
              ></a>
            </div>
          </div>
        </div>
      </div>
      <!-- Modal Use Conditions -->
      <div
        class="modal fade"
        id="useConditionsModal"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="staticBackdropLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header border-0">
              <button
                class="btn-close"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body text-center pb-5">
              <NotificationConditions></NotificationConditions>
              <a
                class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
                data-bs-toggle="modal"
                data-bs-target="#useConditionsModal"
                >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
              ></a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.plan-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.plan-select-title {
  line-height: 1rem;
}
</style>
