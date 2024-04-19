<script>
import { ref, reactive, onBeforeMount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getValidatedPlanActivation, planValidate, planDesactivate } from '../../application/services/plan-activation';
import { useI18n } from 'vue-i18n';
import PlanName from '../../components/common/PlanName.vue';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import PlanActivationName from '../../components/common/PlanActivationName.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessPlanActivationAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, PlanName, Warning, PlanActivationName, AreYouSure, ComponentMenu },
  async setup() {
    const router = useRouter();
    const store = globalStore();
    const { t } = useI18n();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      activations: {},
      oldActivations: {},
      oldActivationsList: {},
      errorsValidate: false,
      extendedEntity: undefined,
      extendedOldEntity: undefined,
      newPaymentData: {
        paymentDate: new Date().toISOString().slice(0,10)
      },
      paymentMethods: [
        { id: 'FREE_PERIOD', name: t('paymentMethods.freePeriod')},
        { id: 'WIRE_TRANSFER', name: t('paymentMethods.wireTransfer')},
        { id: 'CASH_DEPOSIT', name: t('paymentMethods.cashDeposit')}
      ],
      bankAccounts: [
        {
          id: '0',
          name: t('paymentMethods.freePeriod'),
          idNumber: 'ETT',
          bank: 'N/A',
          accountType: 'N/A',
          accountNumber: 'N/A',
          currency: 'N/A'
        },
        {
          id: '1',
          name: '1-Bank',
          idNumber: '123123123',
          bank: 'Bank',
          accountType: 'CHECK',
          accountNumber: '123123123',
          currency: 'us'
        }
      ],
      paymentDateError: false,
      paymentAmountAddError: false,
      paymentNumberAddError: false,
      paymentMethodError: false,
      paymentBankError: false,
      goToDesactivate: false,
      searchString: '',
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.activations = await getValidatedPlanActivation(false);
        state.oldActivations = await getValidatedPlanActivation(true);
        state.oldActivationsList = state.oldActivations;
        state.toggles = await getPermissions('activations', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const goBack = () => {
      router.back();
    }

    const showForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    const showOldForm = (index) => {
      state.extendedOldEntity = state.extendedOldEntity !== index ? index : undefined;
    }

    const validateActivationPayment = (payment) => {
      state.errorsValidate = [];
      if(!payment.paymentNumber || payment.paymentNumber.length === 0) {
        state.paymentNumberAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentNumber');
      } else {
        state.paymentNumberAddError = false;
      }
      if(payment.paymentAmount === undefined || payment.paymentAmount < 0) {
        state.paymentAmountAddError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentAmount');
      } else {
        state.paymentAmountAddError = false;
      }
      if(!payment.method ||  payment.method.length === 0) {
        state.paymentMethodError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.method');
      } else {
        state.paymentMethodError = false;
      }
      if(!payment.bank ||  payment.bank.length === 0) {
        state.paymentBankError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.bank');
      } else {
        state.paymentBankError = false;
      }
      if(!payment.paymentDate ||  payment.paymentDate.length === 0) {
        state.paymentDateError = true;
        state.errorsValidate.push('businessPlanActivationAdmin.validate.paymentDate');
      } else {
        state.paymentDateError = false;
      }
      if(state.errorsValidate.length === 0) {
        return true;
      }
      return false;
    }

    const validate = async (activation) => {
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
            bankData: state.newPaymentData.bank
          };
          await planValidate(activation.id, body);
          state.activations = await getValidatedPlanActivation(false);
          state.oldActivations = await getValidatedPlanActivation(true);
          state.newPaymentData = {}
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const goToDesactivate = () => {
      state.goToDesactivate = !state.goToDesactivate;
    }

    const cancelDesactivate = () => {
      state.goToDesactivate = false;
    }

    const desactivate = async (activation) => {
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
    }

    const filter = computed(() => {
      if (state.searchString.length >= 3) {
        state.oldActivations = state.oldActivations.filter(i =>
          i.business.name.toLowerCase().startsWith(state.searchString.toLowerCase()));
      } else {
        state.oldActivations = state.oldActivationsList;
      }
    })

    return {
      state,
      loading,
      alertError,
      filter,
      goBack,
      showForm,
      showOldForm,
      validate,
      goToDesactivate,
      cancelDesactivate,
      desactivate
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessPlanActivationAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessPlanActivationAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessPlanActivationAdmin">
        <div v-if="state.toggles['activations.admin.view']">
          <div v-if="!loading" id="businessPlanActivationAdmin-result" class="mt-4">
            <div>
              <div v-if="state.activations.length === 0">
                <Message
                  :title="$t('businessPlanActivationAdmin.message.2.title')"
                  :content="$t('businessPlanActivationAdmin.message.2.content')" />
              </div>
              <div class="row mb-2">
                <div class="col text-label">
                  <span>{{ $t("businessPlanActivationAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.activations.length }}</span>
                </div>
              </div>
              <div v-for="(activation, index) in state.activations" :key="index" class="activation-card">
                <div class="row">
                  <div class="col-10">
                    <PlanActivationName :activation="activation" ></PlanActivationName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['activations.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="activation-payment-id-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessPlanActivationAdmin.number") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentNumber"
                          v-bind:class="{ 'is-invalid': state.paymentNumberAddError }"
                          placeholder="Ex: 0055433221">
                      </div>
                    </div>
                    <div id="activation-payment-amount-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessPlanActivationAdmin.amount") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          type="number"
                          class="form-control"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-model="state.newPaymentData.paymentAmount"
                          v-bind:class="{ 'is-invalid': state.paymentAmountAddError }"
                          placeholder="Ex: 69">
                      </div>
                    </div>
                    <div id="activation-payment-method-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessPlanActivationAdmin.paymentMethod") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPaymentData.method"
                          id="modules-edit"
                          :disabled="!state.toggles['activations.admin.add']"
                          >
                          <option v-for="met in state.paymentMethods" :key="met.name" :value="met.id">{{ met.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="activation-payment-method-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessPlanActivationAdmin.bank") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select px-1"
                          v-model="state.newPaymentData.bank"
                          id="modules-edit"
                          :disabled="!state.toggles['activations.admin.add']"
                          >
                          <option v-for="bank in state.bankAccounts" :key="bank.name" :value="bank">{{ bank.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="activation-payment-method-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessPlanActivationAdmin.paymentDate") }}
                      </div>
                      <div class="col-8">
                        <input
                          id="paymentDate"
                          class="form-control metric-controls"
                          type="date"
                          :disabled="!state.toggles['activations.admin.add']"
                          v-bind:class="{ 'is-invalid': state.paymentDateError }"
                          v-model="state.newPaymentData.paymentDate"/>
                      </div>
                    </div>
                    <div id="activation-id-form" class="row -2 mb-g3">
                      <div class="row activation-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ activation.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="validate(activation)"
                        :disabled="!state.toggles['activations.admin.validate']">
                        <i class="bi bi-plugin"></i>
                        {{ $t("businessPlanActivationAdmin.validated") }}
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsValidate.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsValidate" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-if="!state.toggles['activations.admin.read'] && !loading">
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.1.title')"
                    :content="$t('businessPlanActivationAdmin.message.1.content')" />
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
                    :placeholder="$t('enterSearcher')">
                    {{ filter }}
                </div>
                <div v-if="state.oldActivations.length > 0">
                  <div v-for="(activation, index) in state.oldActivations.slice(0, 10)" :key="index" class="activation-card">
                    <div class="row">
                      <div class="col-10">
                        <PlanActivationName :activation="activation" ></PlanActivationName>
                      </div>
                      <div class="col-2">
                        <a
                          href="#"
                          @click.prevent="showOldForm(index)">
                          <i :id="index" :class="`bi ${state.extendedOldEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                        </a>
                      </div>
                    </div>
                    <div v-if="state.toggles['activations.admin.read']"
                      :class="{ show: state.extendedOldEntity === index }"
                      class="detailed-data transition-slow"
                      >
                      <div class="row g-1">
                        <div id="activation-payment-id-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessPlanActivationAdmin.number") }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              :disabled="true"
                              v-model="activation.payment.paymentNumber"
                              placeholder="Ex: 0055433221">
                          </div>
                        </div>
                        <div id="activation-payment-amount-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessPlanActivationAdmin.amount") }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              type="number"
                              class="form-control"
                              :disabled="true"
                              v-model="activation.payment.amount"
                              placeholder="Ex: 69">
                          </div>
                        </div>
                        <div id="activation-payment-method-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessPlanActivationAdmin.paymentMethod") }}
                          </div>
                          <div class="col-8">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select px-1"
                              v-model="activation.payment.method"
                              id="modules-edit"
                              :disabled="true"
                              >
                              <option v-for="met in state.paymentMethods" :key="met.name" :value="met.id">{{ met.name }}</option>
                            </select>
                          </div>
                        </div>
                        <div id="activation-payment-method-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessPlanActivationAdmin.bank") }}
                          </div>
                          <div class="col-8">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select px-1"
                              :v-model="activation.payment.bank"
                              id="modules-edit"
                              :disabled="true"
                              >
                              <option v-for="bank in state.bankAccounts" :key="bank.name" :value="bank">{{ bank.name }}</option>
                            </select>
                          </div>
                        </div>
                        <div id="activation-payment-method-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t("businessPlanActivationAdmin.paymentDate") }}
                          </div>
                          <div class="col-8">
                            <input
                              id="paymentDate"
                              class="form-control metric-controls"
                              type="date"
                              :disabled="true"
                              v-model="activation.payment.paymentDate"/>
                          </div>
                        </div>
                        <div id="activation-id-form" class="row -2 mb-g3">
                          <div class="row activation-details-container">
                            <div class="col">
                              <span><strong>Id:</strong> {{ activation.id }}</span>
                            </div>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="goToDesactivate()"
                            :disabled="!state.toggles['activations.admin.desactivate'] || !activation.active">
                            <i class="bi bi-scissors"></i>
                            {{ $t("businessPlanActivationAdmin.desactivate") }}
                          </button>
                        </div>
                        <AreYouSure
                          :show="state.goToDesactivate"
                          :yesDisabled="state.toggles['activations.admin.desactivate']"
                          :noDisabled="state.toggles['activations.admin.desactivate']"
                          @actionYes="desactivate(activation)"
                          @actionNo="cancelDesactivate()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div v-if="!state.toggles['activations.admin.read'] && !loading">
                      <Message
                        :title="$t('businessPlanActivationAdmin.message.1.title')"
                        :content="$t('businessPlanActivationAdmin.message.1.content')" />
                    </div>
                  </div>

                </div>
                <div v-else>
                  <Message
                    :title="$t('businessPlanActivationAdmin.message.3.title')"
                    :content="$t('businessPlanActivationAdmin.message.3.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!state.toggles['activations.admin.view'] && !loading">
          <Message
            :title="$t('businessPlanActivationAdmin.message.1.title')"
            :content="$t('businessPlanActivationAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="''" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.activation-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.activation-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 500px !important;
  overflow-y: auto;
}
</style>