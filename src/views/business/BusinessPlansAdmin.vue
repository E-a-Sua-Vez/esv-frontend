<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPlans, updatePlan, addPlan } from '../../application/services/plan';
import { getPermissions } from '../../application/services/permissions';
import PlanName from '../../components/common/PlanName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import { getCountries, getPeriodicities, getProductTypes } from '../../shared/utils/data';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessPlansAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanName,
    Toggle,
    Warning,
    ComponentMenu,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      plans: ref({}),
      showAdd: false,
      periodicities: [],
      countries: [],
      newPlan: {},
      extendedEntity: undefined,
      errorsAdd: [],
      nameAddError: false,
      descriptionAddError: false,
      orderAddError: false,
      periodicityAddError: false,
      priceAddError: false,
      errorsUpdate: [],
      nameUpdateError: false,
      descriptionUpdateError: false,
      orderUpdateError: false,
      periodicityUpdateError: false,
      priceUpdateError: false,
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.periodicities = getPeriodicities();
        state.countries = getCountries();
        state.productTypes = getProductTypes();
        state.currentUser = await store.getCurrentUser;
        const plans = await getPlans();
        state.plans = plans;
        state.toggles = await getPermissions('plans', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const validateAdd = plan => {
      state.errorsAdd = [];
      if (!plan.name || plan.name.length === 0) {
        state.nameAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.name');
      } else {
        state.nameAddError = false;
      }
      if (!plan.description || plan.description.length === 0) {
        state.descriptionAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.description');
      } else {
        state.descriptionAddError = false;
      }
      if (!plan.order || plan.order === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if (!plan.periodicity || plan.periodicity.length === 0) {
        state.periodicityAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.periodicity');
      } else {
        state.periodicityAddError = false;
      }
      if (plan.price === undefined || plan.price < 0) {
        state.priceAddError = true;
        state.errorsAdd.push('businessPlansAdmin.validate.price');
      } else {
        state.priceAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = plan => {
      state.errorsUpdate = [];
      if (!plan.name || plan.name.length === 0) {
        state.nameError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.name');
      } else {
        state.nameUpdateError = false;
      }
      if (!plan.description || plan.description.length === 0) {
        state.descriptionUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.description');
      } else {
        state.descriptionUpdateError = false;
      }
      if (!plan.order || plan.order === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if (!plan.periodicity || plan.periodicity.length === 0) {
        state.periodicityUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.periodicity');
      } else {
        state.periodicityUpdateError = false;
      }
      if (plan.price === undefined || plan.price < 0) {
        state.priceUpdateError = true;
        state.errorsUpdate.push('businessPlansAdmin.validate.price');
      } else {
        state.priceUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async plan => {
      try {
        loading.value = true;
        if (validateUpdate(plan)) {
          await updatePlan(plan.id, plan);
          const plans = await getPlans();
          state.plans = plans;
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newPlan = {
        order: state.plans.length + 1,
        periodicity: 'monthly',
        online: false,
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newPlan)) {
          await addPlan(state.newPlan);
          const plans = await getPlans();
          state.plans = plans;
          state.showAdd = false;
          state.newPlan = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
    };
  },
};
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessPlansAdmin.title`)"
        :toggles="state.toggles"
        component-name="businessPlansAdmin"
        @goBack="goBack"
      >
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessPlansAdmin">
        <div v-if="state.toggles['plans.admin.view']">
          <div v-if="!loading" id="businessPlansAdmin-result" class="mt-4">
            <div>
              <div v-if="state.plans.length === 0">
                <Message
                  :title="$t('businessPlansAdmin.message.2.title')"
                  :content="$t('businessPlansAdmin.message.2.content')"
                />
              </div>
              <div class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t('businessPlansAdmin.listResult') }}</span>
                  <span class="fw-bold m-2">{{ state.plans.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(plan)"
                    :disabled="!state.toggles['plans.admin.add']"
                  >
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div
                id="add-plan"
                class="plan-card mb-4"
                v-if="state.showAdd && state.toggles['plans.admin.add']"
              >
                <div v-if="state.plans.length < state.toggles['plans.admin.limit']">
                  <div class="row g-1">
                    <div id="plan-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.name') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newPlan.name"
                          v-bind:class="{ 'is-invalid': state.nameAddError }"
                          placeholder="Plan A"
                        />
                      </div>
                    </div>
                    <div id="plan-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.type') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.productType"
                          id="countries"
                        >
                          <option
                            v-for="product in state.productTypes"
                            :key="product"
                            :value="product"
                          >
                            {{ $t(`products.types.${product}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-country-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.country') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.country"
                          id="countries"
                        >
                          <option
                            v-for="country in state.countries"
                            :key="country"
                            :value="country"
                          >
                            {{ $t(`countries.${country}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-description-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.description') }}
                      </div>
                      <div class="col-6">
                        <textarea
                          min="1"
                          max="500"
                          type="text"
                          class="form-control"
                          v-model="state.newPlan.description"
                          v-bind:class="{ 'is-invalid': state.descriptionAddError }"
                          placeholder="Benefit A-Benefit B..."
                        >
                        </textarea>
                      </div>
                    </div>
                    <div id="plan-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.order') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.plans.length + 1"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div id="plan-periodicity-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.periodicity') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPlan.periodicity"
                          id="periodicities"
                          v-bind:class="{ 'is-invalid': state.periodicityAddError }"
                        >
                          <option v-for="per in state.periodicities" :key="per" :value="per">
                            {{ $t(`periodicities.${per}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-price-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.price') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.price"
                          v-bind:class="{ 'is-invalid': state.priceAddError }"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-onlinePrice-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlinePrice') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.onlinePrice"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-saving-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.saving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.saving"
                          placeholder="25"
                        />
                      </div>
                    </div>
                    <div id="plan-onlineSaving-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlineSaving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="state.newPlan.onlineSaving"
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <div id="plan-online-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.online') }}
                      </div>
                      <div class="col-6">
                        <Toggle v-model="state.newPlan.online" />
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newPlan)"
                      >
                        {{ $t('businessPlansAdmin.add') }} <i class="bi bi-save"></i>
                      </button>
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
                <div v-else>
                  <Message
                    :title="$t('businessPlansAdmin.message.3.title')"
                    :content="$t('businessPlansAdmin.message.3.content')"
                  />
                </div>
              </div>
              <div v-for="(plan, index) in state.plans" :key="index" class="plan-card">
                <div class="row">
                  <div class="col-10">
                    <PlanName :name="plan.name" :active="plan.active"></PlanName>
                  </div>
                  <div class="col-2">
                    <a href="#" @click.prevent="showUpdateForm(index)">
                      <i
                        :id="index"
                        :class="`bi ${
                          state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                        }`"
                      ></i>
                    </a>
                  </div>
                </div>
                <div
                  v-if="state.toggles['plans.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                >
                  <div class="row g-1">
                    <div id="plan-name-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.name') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="plan.name"
                          v-bind:class="{ 'is-invalid': state.nameUpdateError }"
                          placeholder="Plan A"
                        />
                      </div>
                    </div>
                    <div id="plan-country-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.country') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="plan.country"
                          id="countries"
                        >
                          <option
                            v-for="country in state.countries"
                            :key="country"
                            :value="country"
                          >
                            {{ $t(`countries.${country}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-description-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.description') }}
                      </div>
                      <div class="col-6">
                        <textarea
                          min="1"
                          max="500"
                          type="text"
                          class="form-control"
                          v-model="plan.description"
                          v-bind:class="{ 'is-invalid': state.descriptionUpdateError }"
                          placeholder="Benefit A-Benefit B..."
                        >
                        </textarea>
                      </div>
                    </div>
                    <div id="plan-order-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.order') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.plans.length + 1"
                          type="number"
                          class="form-control"
                          v-model="plan.order"
                          v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                          placeholder="1"
                        />
                      </div>
                    </div>
                    <div id="plan-periodicity-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.periodicity') }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="plan.periodicity"
                          id="periodicities"
                          v-bind:class="{ 'is-invalid': state.periodicityUpdateError }"
                        >
                          <option v-for="per in state.periodicities" :key="per" :value="per">
                            {{ $t(`periodicities.${per}`) }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div id="plan-price-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.price') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.price"
                          v-bind:class="{ 'is-invalid': state.priceUpdateError }"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-onlinePrice-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlinePrice') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.onlinePrice"
                          placeholder="1000"
                        />
                      </div>
                    </div>
                    <div id="plan-saving-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.saving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.saving"
                          placeholder="25"
                        />
                      </div>
                    </div>
                    <div id="plan-onlineSaving-form-update" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.onlineSaving') }}
                      </div>
                      <div class="col-6">
                        <input
                          min="0"
                          type="number"
                          class="form-control"
                          v-model="plan.onlineSaving"
                          placeholder="30"
                        />
                      </div>
                    </div>
                    <div id="plan-active-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.active') }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="plan.active"
                          :disabled="!state.toggles['plans.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="plan-online-form" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t('businessPlansAdmin.online') }}
                      </div>
                      <div class="col-6">
                        <Toggle
                          v-model="plan.online"
                          :disabled="!state.toggles['plans.admin.edit']"
                        />
                      </div>
                    </div>
                    <div id="plan-id-form" class="row -2 mb-g3">
                      <div class="row plan-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ plan.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(plan)"
                        :disabled="!state.toggles['plans.admin.update']"
                      >
                        {{ $t('businessPlansAdmin.update') }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="state.errorsUpdate.length > 0">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsUpdate" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-if="!state.toggles['plans.admin.read'] && !loading">
                  <Message
                    :title="$t('businessPlansAdmin.message.1.title')"
                    :content="$t('businessPlansAdmin.message.1.content')"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!state.toggles['plans.admin.view'] && !loading">
          <Message
            :title="$t('businessPlansAdmin.message.1.title')"
            :content="$t('businessPlansAdmin.message.1.content')"
          />
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
.plan-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.plan-details-container {
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
  max-height: 600px !important;
  overflow-y: auto;
}
</style>
