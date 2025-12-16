<script>
import { ref, reactive, onBeforeMount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import {
  getValidatedPlanActivation,
  planValidate,
  planDesactivate,
} from '../../application/services/plan-activation';
import { useI18n } from 'vue-i18n';
import PlanName from '../../components/common/PlanName.vue';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import PlanActivationName from '../../components/common/PlanActivationName.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessPlanActivationAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    PlanName,
    Warning,
    PlanActivationName,
    AreYouSure,
    ComponentMenu,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();
    const { t } = useI18n();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      activations: {},
      oldActivations: {},
      oldActivationsList: {},
      errorsValidate: false,
      extendedEntity: undefined,
      extendedOldEntity: undefined,
      newPaymentData: {
        paymentDate: new Date().toISOString().slice(0, 10),
      },
      paymentMethods: [
        { id: 'FREE_PERIOD', name: t('paymentMethods.freePeriod') },
        { id: 'WIRE_TRANSFER', name: t('paymentMethods.wireTransfer') },
        { id: 'CASH_DEPOSIT', name: t('paymentMethods.cashDeposit') },
      ],
      bankAccounts: [
        {
          id: '0',
          name: t('paymentMethods.freePeriod'),
          idNumber: 'ETT',
          bank: 'N/A',
          accountType: 'N/A',
          accountNumber: 'N/A',
          currency: 'N/A',
        },
        {
          id: '1',
          name: '1-Bank',
          idNumber: '123123123',
          bank: 'Bank',
          accountType: 'CHECK',
          accountNumber: '123123123',
          currency: 'us',
        },
      ],
      paymentDateError: false,
      paymentAmountAddError: false,
      paymentNumberAddError: false,
      paymentMethodError: false,
      paymentBankError: false,
      goToDesactivate: false,
      searchString: '',
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        const activationsData = await getValidatedPlanActivation(false);
        state.activations = Array.isArray(activationsData)
          ? activationsData
          : activationsData?.data || activationsData || [];
        const oldActivationsData = await getValidatedPlanActivation(true);
        state.oldActivations = Array.isArray(oldActivationsData)
          ? oldActivationsData
          : oldActivationsData?.data || oldActivationsData || [];
        state.oldActivationsList = state.oldActivations;
        state.toggles = await getPermissions('activations', 'admin');

        // Debug log
        console.log('BusinessPlanActivationAdmin - Loaded data:', {
          activations: state.activations,
          activationsType: typeof state.activations,
          isArray: Array.isArray(state.activations),
          activationsLength: Array.isArray(state.activations) ? state.activations.length : 'N/A',
          toggles: state.toggles,
          viewPermission: state.toggles['activations.admin.view'],
        });
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

    const showForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const showOldForm = index => {
      state.extendedOldEntity = state.extendedOldEntity !== index ? index : undefined;
    };

    const validateActivationPayment = payment => {
      state.errorsValidate = [];
      if (!payment.paymentNumber || payment.paymentNumber.length === 0) {
        state.paymentNumberAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentNumber');
      } else {
        state.paymentNumberAddError = false;
      }
      if (payment.paymentAmount === undefined || payment.paymentAmount < 0) {
        state.paymentAmountAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentAmount');
      } else {
        state.paymentAmountAddError = false;
      }
      if (!payment.method || payment.method.length === 0) {
        state.paymentMethodError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.method');
      } else {
        state.paymentMethodError = false;
      }
      if (!payment.bank || payment.bank.length === 0) {
        state.paymentBankError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.bank');
      } else {
        state.paymentBankError = false;
      }
      if (!payment.paymentDate || payment.paymentDate.length === 0) {
        state.paymentDateError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentDate');
      } else {
        state.paymentDateError = false;
      }
      if (state.errorsValidate.length === 0) {
        return true;
      }
      return false;
    };

    const validate = async activation => {
      try {
        loading.value = true;
        if (validateActivationPayment(state.newPaymentData)) {
          const body = {
            id: activation.id,
            businessId: activation.businessId,
            planId: activation.planId,
            amount: state.newPaymentData.paymentAmount,
            method: state.newPaymentData.method,
            paymentNumber: state.newPaymentData.paymentNumber,
            paymentDate: state.newPaymentData.paymentDate,
            bankData: state.newPaymentData.bank,
          };
          await planValidate(activation.id, body);
          state.activations = await getValidatedPlanActivation(false);
          state.oldActivations = await getValidatedPlanActivation(true);
          state.newPaymentData = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const goToDesactivate = () => {
      state.goToDesactivate = !state.goToDesactivate;
    };

    const cancelDesactivate = () => {
      state.goToDesactivate = false;
    };

    const desactivate = async activation => {
      try {
        loading.value = true;
        if (activation.active === true) {
          await planDesactivate(activation.id);
          state.activations = await getValidatedPlanActivation(false);
          state.oldActivations = await getValidatedPlanActivation(true);
          state.newPaymentData = {};
          state.goToDesactivate = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    watch(
      () => state.searchString,
      () => {
        if (state.searchString.length >= 3) {
          state.oldActivations = state.oldActivationsList.filter(i =>
            i.business.name.toLowerCase().startsWith(state.searchString.toLowerCase())
          );
        } else {
          state.oldActivations = state.oldActivationsList;
        }
      },
      { immediate: true }
    );

    return {
      state,
      loading,
      alertError,
      goBack,
      showForm,
      showOldForm,
      validate,
      goToDesactivate,
      cancelDesactivate,
      desactivate,
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
          :title="$t(`businessPlanActivationAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessPlanActivationAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessPlanActivationAdmin">
          <!-- DEBUG INFO -->
          <div style="background: yellow; padding: 10px; margin: 10px; border: 2px solid red">
            <strong>DEBUG INFO:</strong><br />
            Loading: {{ loading }}<br />
            Activations:
            {{
              Array.isArray(state.activations)
                ? state.activations.length
                : 'NOT ARRAY: ' + typeof state.activations
            }}<br />
            Activations Type: {{ typeof state.activations }}<br />
            Has Toggles: {{ !!state.toggles && Object.keys(state.toggles).length > 0 }}<br />
            View Permission: {{ state.toggles['activations.admin.view'] }}<br />
            Toggles Keys: {{ state.toggles ? Object.keys(state.toggles).join(', ') : 'NO TOGGLES'
            }}<br />
            Activations Value: {{ JSON.stringify(state.activations).substring(0, 200) }}
          </div>
          <div v-if="state.toggles['activations.admin.view']">
            <div v-if="!loading" id="businessPlanActivationAdmin-result" class="mt-4">
              <div>
                <div v-if="state.activations.length === 0">
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.2.title')"
                    :content="$t('businessPlanActivationAdmin.message.2.content')"
                  />
                </div>
                <div class="row mb-2">
                  <div class="col text-label">
                    <span>{{ $t('businessPlanActivationAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.activations.length }}</span>
                  </div>
                </div>
                <div
                  v-for="(activation, index) in state.activations"
                  :key="index"
                  class="result-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <PlanActivationName :activation="activation"></PlanActivationName>
                    </div>
                    <div class="col-2">
                      <a href="#" @click.prevent="showForm(index)">
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
                    v-if="state.toggles['activations.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                  >
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.number') }}
                        </label>
                        <input
                          id="activation-payment-id-form-add"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentNumber"
                          :class="{ 'is-invalid': state.paymentNumberAddError }"
                          placeholder="Ex: 0055433221"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.amount') }}
                        </label>
                        <input
                          id="activation-payment-amount-form-add"
                          min="1"
                          type="number"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentAmount"
                          :class="{ 'is-invalid': state.paymentAmountAddError }"
                          placeholder="Ex: 69"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                        </label>
                        <select
                          id="activation-payment-method-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.method"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="met in state.paymentMethods"
                            :key="met.name"
                            :value="met.id"
                          >
                            {{ met.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.bank') }}
                        </label>
                        <select
                          id="activation-payment-bank-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.bank"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="bank in state.bankAccounts"
                            :key="bank.name"
                            :value="bank.id"
                          >
                            {{ bank.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentDate') }}
                        </label>
                        <input
                          id="paymentDate"
                          class="form-control-modern"
                          type="date"
                          :disabled="!state.toggles['activations.admin.add']"
                          :class="{ 'is-invalid': state.paymentDateError }"
                          v-model="state.newPaymentData.paymentDate"
                        />
                      </div>
                      <div id="activation-id-form" class="activation-details-container">
                        <span><strong>Id:</strong> {{ activation.id }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="validate(activation)"
                      :disabled="!state.toggles['activations.admin.validate']"
                    >
                      <i class="bi bi-plugin"></i>
                      {{ $t('businessPlanActivationAdmin.validated') }}
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsValidate.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsValidate" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                  <div v-if="!state.toggles['activations.admin.read'] && !loading">
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.1.title')"
                      :content="$t('businessPlanActivationAdmin.message.1.content')"
                    />
                  </div>
                </div>
                <div id="activation-history">
                  <span class="fw-bold"> {{ $t('businessPlanActivationAdmin.historic') }} </span>
                  <div class="row mx-4 mb-3">
                    <input
                      min="1"
                      max="50"
                      type="text"
                      class="form-control"
                      v-model="state.searchString"
                      :placeholder="$t('enterSearcher')"
                    />
                  </div>
                  <div v-if="state.oldActivations.length > 0">
                    <div
                      v-for="(activation, index) in state.oldActivations.slice(0, 10)"
                      :key="index"
                      class="result-card"
                    >
                      <div class="row">
                        <div class="col-10">
                          <PlanActivationName :activation="activation"></PlanActivationName>
                        </div>
                        <div class="col-2">
                          <a href="#" @click.prevent="showOldForm(index)">
                            <i
                              :id="index"
                              :class="`bi ${
                                state.extendedOldEntity === index
                                  ? 'bi-chevron-up'
                                  : 'bi-chevron-down'
                              }`"
                            ></i>
                          </a>
                        </div>
                      </div>
                      <div
                        v-if="state.toggles['activations.admin.read']"
                        :class="{ show: state.extendedOldEntity === index }"
                        class="detailed-data transition-slow"
                      >
                        <div class="form-fields-container">
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.number') }}
                            </label>
                            <input
                              id="activation-payment-id-form-add"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.paymentNumber"
                              placeholder="Ex: 0055433221"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.amount') }}
                            </label>
                            <input
                              id="activation-payment-amount-form-add"
                              min="1"
                              type="number"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.amount"
                              placeholder="Ex: 69"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                            </label>
                            <select
                              id="activation-payment-method-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.method"
                              :disabled="true"
                            >
                              <option
                                v-for="met in state.paymentMethods"
                                :key="met.name"
                                :value="met.id"
                              >
                                {{ met.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.bank') }}
                            </label>
                            <select
                              id="activation-payment-bank-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.bank"
                              :disabled="true"
                            >
                              <option
                                v-for="bank in state.bankAccounts"
                                :key="bank.name"
                                :value="bank.id"
                              >
                                {{ bank.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentDate') }}
                            </label>
                            <input
                              id="paymentDate"
                              class="form-control-modern"
                              type="date"
                              :disabled="true"
                              v-model="activation.payment.paymentDate"
                            />
                          </div>
                          <div id="activation-id-form" class="activation-details-container">
                            <span><strong>Id:</strong> {{ activation.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col" v-if="state.extendedOldEntity === index">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="goToDesactivate()"
                          :disabled="
                            !state.toggles['activations.admin.desactivate'] || !activation.active
                          "
                        >
                          <i class="bi bi-scissors"></i>
                          {{ $t('businessPlanActivationAdmin.desactivate') }}
                        </button>
                        <AreYouSure
                          :show="state.goToDesactivate"
                          :yes-disabled="state.toggles['activations.admin.desactivate']"
                          :no-disabled="state.toggles['activations.admin.desactivate']"
                          @actionYes="desactivate(activation)"
                          @actionNo="cancelDesactivate()"
                        >
                        </AreYouSure>
                      </div>
                      <div v-if="!state.toggles['activations.admin.read'] && !loading">
                        <Message
                          :title="$t('businessPlanActivationAdmin.message.1.title')"
                          :content="$t('businessPlanActivationAdmin.message.1.content')"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.3.title')"
                      :content="$t('businessPlanActivationAdmin.message.3.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['activations.admin.view'] && !loading">
            <Message
              :title="$t('businessPlanActivationAdmin.message.1.title')"
              :content="$t('businessPlanActivationAdmin.message.1.content')"
            />
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
              :title="$t(`businessPlanActivationAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessPlanActivationAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessPlanActivationAdmin">
          <div v-if="state.toggles['activations.admin.view']">
            <div v-if="!loading" id="businessPlanActivationAdmin-result" class="mt-4">
              <div>
                <div v-if="state.activations.length === 0">
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.2.title')"
                    :content="$t('businessPlanActivationAdmin.message.2.content')"
                  />
                </div>
                <div class="row mb-2">
                  <div class="col text-label">
                    <span>{{ $t('businessPlanActivationAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.activations.length }}</span>
                  </div>
                </div>
                <div
                  v-for="(activation, index) in state.activations"
                  :key="index"
                  class="result-card"
                >
                  <div class="row">
                    <div class="col-10">
                      <PlanActivationName :activation="activation"></PlanActivationName>
                    </div>
                    <div class="col-2">
                      <a href="#" @click.prevent="showForm(index)">
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
                    v-if="state.toggles['activations.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                  >
                    <div class="form-fields-container">
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.number') }}
                        </label>
                        <input
                          id="activation-payment-id-form-add"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentNumber"
                          :class="{ 'is-invalid': state.paymentNumberAddError }"
                          placeholder="Ex: 0055433221"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.amount') }}
                        </label>
                        <input
                          id="activation-payment-amount-form-add"
                          min="1"
                          type="number"
                          class="form-control-modern"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentAmount"
                          :class="{ 'is-invalid': state.paymentAmountAddError }"
                          placeholder="Ex: 69"
                        />
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                        </label>
                        <select
                          id="activation-payment-method-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.method"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="met in state.paymentMethods"
                            :key="met.name"
                            :value="met.id"
                          >
                            {{ met.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.bank') }}
                        </label>
                        <select
                          id="activation-payment-bank-form-update"
                          class="form-control-modern form-select-modern"
                          v-model="state.newPaymentData.bank"
                          :disabled="!state.toggles['activations.admin.add']"
                        >
                          <option
                            v-for="bank in state.bankAccounts"
                            :key="bank.name"
                            :value="bank.id"
                          >
                            {{ bank.name }}
                          </option>
                        </select>
                      </div>
                      <div class="form-group-modern">
                        <label class="form-label-modern">
                          {{ $t('businessPlanActivationAdmin.paymentDate') }}
                        </label>
                        <input
                          id="paymentDate"
                          class="form-control-modern"
                          type="date"
                          :disabled="!state.toggles['activations.admin.add']"
                          :class="{ 'is-invalid': state.paymentDateError }"
                          v-model="state.newPaymentData.paymentDate"
                        />
                      </div>
                      <div id="activation-id-form" class="activation-details-container">
                        <span><strong>Id:</strong> {{ activation.id }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col" v-if="state.extendedEntity === index">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="validate(activation)"
                      :disabled="!state.toggles['activations.admin.validate']"
                    >
                      <i class="bi bi-plugin"></i>
                      {{ $t('businessPlanActivationAdmin.validated') }}
                    </button>
                  </div>
                  <div class="row g-1 errors" id="feedback" v-if="state.errorsValidate.length > 0">
                    <Warning>
                      <template v-slot:message>
                        <li v-for="(error, index) in state.errorsValidate" :key="index">
                          {{ $t(error) }}
                        </li>
                      </template>
                    </Warning>
                  </div>
                  <div v-if="!state.toggles['activations.admin.read'] && !loading">
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.1.title')"
                      :content="$t('businessPlanActivationAdmin.message.1.content')"
                    />
                  </div>
                </div>
                <div id="activation-history">
                  <span class="fw-bold"> {{ $t('businessPlanActivationAdmin.historic') }} </span>
                  <div class="row mx-4 mb-3">
                    <input
                      min="1"
                      max="50"
                      type="text"
                      class="form-control"
                      v-model="state.searchString"
                      :placeholder="$t('enterSearcher')"
                    />
                  </div>
                  <div v-if="state.oldActivations.length > 0">
                    <div
                      v-for="(activation, index) in state.oldActivations.slice(0, 10)"
                      :key="index"
                      class="result-card"
                    >
                      <div class="row">
                        <div class="col-10">
                          <PlanActivationName :activation="activation"></PlanActivationName>
                        </div>
                        <div class="col-2">
                          <a href="#" @click.prevent="showOldForm(index)">
                            <i
                              :id="index"
                              :class="`bi ${
                                state.extendedOldEntity === index
                                  ? 'bi-chevron-up'
                                  : 'bi-chevron-down'
                              }`"
                            ></i>
                          </a>
                        </div>
                      </div>
                      <div
                        v-if="state.toggles['activations.admin.read']"
                        :class="{ show: state.extendedOldEntity === index }"
                        class="detailed-data transition-slow"
                      >
                        <div class="form-fields-container">
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.number') }}
                            </label>
                            <input
                              id="activation-payment-id-form-add"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.paymentNumber"
                              placeholder="Ex: 0055433221"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.amount') }}
                            </label>
                            <input
                              id="activation-payment-amount-form-add"
                              min="1"
                              type="number"
                              class="form-control-modern"
                              :disabled="true"
                              v-model="activation.payment.amount"
                              placeholder="Ex: 69"
                            />
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentMethod') }}
                            </label>
                            <select
                              id="activation-payment-method-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.method"
                              :disabled="true"
                            >
                              <option
                                v-for="met in state.paymentMethods"
                                :key="met.name"
                                :value="met.id"
                              >
                                {{ met.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.bank') }}
                            </label>
                            <select
                              id="activation-payment-bank-form-update"
                              class="form-control-modern form-select-modern"
                              v-model="activation.payment.bank"
                              :disabled="true"
                            >
                              <option
                                v-for="bank in state.bankAccounts"
                                :key="bank.name"
                                :value="bank.id"
                              >
                                {{ bank.name }}
                              </option>
                            </select>
                          </div>
                          <div class="form-group-modern">
                            <label class="form-label-modern">
                              {{ $t('businessPlanActivationAdmin.paymentDate') }}
                            </label>
                            <input
                              id="paymentDate"
                              class="form-control-modern"
                              type="date"
                              :disabled="true"
                              v-model="activation.payment.paymentDate"
                            />
                          </div>
                          <div id="activation-id-form" class="activation-details-container">
                            <span><strong>Id:</strong> {{ activation.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col" v-if="state.extendedOldEntity === index">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="goToDesactivate()"
                          :disabled="
                            !state.toggles['activations.admin.desactivate'] || !activation.active
                          "
                        >
                          <i class="bi bi-scissors"></i>
                          {{ $t('businessPlanActivationAdmin.desactivate') }}
                        </button>
                        <AreYouSure
                          :show="state.goToDesactivate"
                          :yes-disabled="state.toggles['activations.admin.desactivate']"
                          :no-disabled="state.toggles['activations.admin.desactivate']"
                          @actionYes="desactivate(activation)"
                          @actionNo="cancelDesactivate()"
                        >
                        </AreYouSure>
                      </div>
                      <div v-if="!state.toggles['activations.admin.read'] && !loading">
                        <Message
                          :title="$t('businessPlanActivationAdmin.message.1.title')"
                          :content="$t('businessPlanActivationAdmin.message.1.content')"
                        />
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <Message
                      :title="$t('businessPlanActivationAdmin.message.3.title')"
                      :content="$t('businessPlanActivationAdmin.message.3.content')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!state.toggles['activations.admin.view'] && !loading">
            <Message
              :title="$t('businessPlanActivationAdmin.message.1.title')"
              :content="$t('businessPlanActivationAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: rgba(220, 53, 69, 0.6);
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
}

.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

.activation-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
  padding: 0.5rem;
  background-color: rgba(248, 249, 250, 0.5);
  border-radius: 5px;
}

.is-disabled {
  opacity: 0.5;
}

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
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
