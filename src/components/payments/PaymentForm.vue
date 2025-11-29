<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
import Warning from '../../components/common/Warning.vue';
import {
  getPaymentFiscalNoteTypes,
  getPaymentMethods,
  getPaymentTypes,
} from '../../shared/utils/data';
import { getAvailablePackageByClient } from '../../application/services/package';
import { getPendingIncomeByPackage } from '../../application/services/income';
import Message from '../common/Message.vue';

export default {
  name: 'PaymentForm',
  components: { Warning, Message },
  props: {
    id: { type: String, default: undefined },
    commerce: { type: Object, default: {} },
    clientId: { type: String, default: undefined },
    confirmPayment: { type: Boolean, default: false },
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { id, commerce, clientId, errorsAdd, confirmPayment } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newConfirmationData: {
        procedureNumber: 1,
        proceduresTotalNumber: 1,
        processPaymentNow: !confirmPayment.value || false,
        packagePaid: false,
      },
      paymentTypes: [],
      paymentMethods: [],
      paymentFicalNoteTypes: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      totalAmountError: false,
      installmentsError: false,
      packages: [],
      selectedPackage: {},
      pendingIncomes: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.paymentTypes = getPaymentTypes();
        state.paymentMethods = getPaymentMethods();
        state.paymentFicalNoteTypes = getPaymentFiscalNoteTypes();
        if (confirmPayment.value === true && commerce.value.id && clientId.value) {
          state.packages = await getAvailablePackageByClient(commerce.value.id, clientId.value);
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = () => {
      receiveData(state.newConfirmationData);
    };

    const selectPaymentType = $event => {
      if ($event && $event.target) {
        const paymentType = $event.target.value;
        if (['PAID', 'RETURN', 'EVALUATION', 'PROMOTION', 'TRIAL'].includes(paymentType)) {
          state.newConfirmationData.paymentMethod = 'PAID';
          state.newConfirmationData.paymentAmount = 0;
          state.newConfirmationData.totalAmount = 0;
          state.newConfirmationData.paymentCommission = 0;
          state.newConfirmationData.installments = 1;
        } else {
          state.newConfirmationData.paymentMethod = '';
          state.newConfirmationData.paymentAmount = null;
          state.newConfirmationData.totalAmount = null;
          state.newConfirmationData.paymentCommission = null;
          state.newConfirmationData.installments = 1;
        }
      }
    };

    const selectPackage = async pack => {
      if (pack && pack.id) {
        state.newConfirmationData.packageId = pack.id;
        state.newConfirmationData.proceduresTotalNumber = pack.proceduresAmount;
        if (id.value && (pack.firstBookingId === id.value || pack.firstAttentionId === id.value)) {
          state.newConfirmationData.procedureNumber = 1;
        } else {
          if (pack.bookingsId || pack.attentionsId) {
            let procedures = 0;
            const bookingProcedures =
              pack.bookingsId && pack.bookingsId.length >= 0 ? pack.bookingsId.length : 0;
            const attentionProcedures =
              pack.attentionsId && pack.attentionsId.length >= 0 ? pack.attentionsId.length : 0;
            if (bookingProcedures >= attentionProcedures) {
              procedures = bookingProcedures;
            } else {
              procedures = attentionProcedures;
            }
            state.newConfirmationData.procedureNumber = procedures + 1;
          }
        }
        state.pendingIncomes = await getPendingIncomeByPackage(
          commerce.value.id,
          state.selectedPackage.id
        );
        if (state.pendingIncomes && state.pendingIncomes.length === 0) {
          state.newConfirmationData.packagePaid = true;
        } else {
          state.newConfirmationData.packagePaid = false;
        }
        sendData();
      } else if (pack === 'NEW') {
        state.pendingIncomes = undefined;
        state.newConfirmationData.procedureNumber = 1;
        state.newConfirmationData.proceduresTotalNumber = 1;
      } else if (pack === 'NONE') {
        state.pendingIncomes = undefined;
        state.newConfirmationData.procedureNumber = 1;
        state.newConfirmationData.proceduresTotalNumber = 1;
      }
      state.selectedPayment = undefined;
      state.newConfirmationData.processPaymentNow = false;
    };

    const selectPayment = payment => {
      if (payment && payment.id) {
        state.newConfirmationData.paymentType = 'PARTIAL';
        state.newConfirmationData.paymentMethod = payment.paymentMethod || undefined;
        state.newConfirmationData.paymentAmount = payment.amount || undefined;
        state.newConfirmationData.totalAmount = payment.totalAmount || undefined;
        state.newConfirmationData.paymentCommission = 0;
        state.newConfirmationData.paymentFiscalNote = payment.fiscalNote || undefined;
        state.newConfirmationData.installments = payment.installments || undefined;
        state.newConfirmationData.pendingPaymentId = payment.id;
        sendData();
      }
    };

    const processPaymentNow = async event => {
      state.newConfirmationData.processPaymentNow = event.target.checked;
      if (state.newConfirmationData.processPaymentNow) {
        state.newConfirmationData.paymentType = undefined;
        state.newConfirmationData.paymentMethod = undefined;
        state.newConfirmationData.paymentAmount = undefined;
        state.newConfirmationData.totalAmount = undefined;
        state.newConfirmationData.paymentCommission = undefined;
        state.newConfirmationData.paymentFiscalNote = undefined;
        state.newConfirmationData.installments = undefined;
        state.newConfirmationData.pendingPaymentId = undefined;
        state.selectedPayment = undefined;
      }
      sendData();
    };

    const confirmInstallments = async event => {
      if (event.target.checked) {
        state.newConfirmationData.confirmInstallments = event.target.checked;
      }
      sendData();
    };

    const paidPackage = () =>
      state.selectedPackage &&
      state.selectedPackage.id &&
      state.selectedPackage.status !== 'REQUESTED' &&
      state.pendingIncomes &&
      state.pendingIncomes.length === 0;

    return {
      state,
      loading,
      commerce,
      errorsAdd,
      selectPaymentType,
      sendData,
      confirmPayment,
      selectPackage,
      selectPayment,
      processPaymentNow,
      confirmInstallments,
      paidPackage,
    };
  },
};
</script>
<template>
  <div>
    <div id="payment-data">
      <div class="row g-1">
        <div class="col col-md-10 offset-md-1">
          <div v-if="state.packages && state.packages.length > 0">
            <div id="payment-type-form-add" class="row g-1 my-1">
              <div class="col-4 text-label">
                {{ $t('collaboratorBookingsView.packages') }}
              </div>
              <div class="col-8">
                <select
                  class="btn btn-sm btn-light fw-bold text-dark select"
                  v-model="state.selectedPackage"
                  @change="selectPackage(state.selectedPackage)"
                  id="types"
                >
                  <option v-for="typ in state.packages" :key="typ.name" :value="typ">
                    {{ typ.name }}
                  </option>
                  <option key="NEW" value="NEW">NUEVO</option>
                  <option key="NONE" value="NONE">NINGUNO</option>
                </select>
              </div>
            </div>
          </div>
          <div id="payment-procedure-total-number-form-add" class="row g-1 my-1">
            <div class="col-5 text-label">
              {{ $t('collaboratorBookingsView.proceduresTotalNumber') }}
            </div>
            <div class="col-3">
              <input
                min="1"
                type="number"
                class="form-control form-control-sm"
                v-model="state.newConfirmationData.procedureNumber"
                placeholder="0"
                @keyup="sendData"
              />
            </div>
            <div class="col-1 text-label">
              {{ $t('collaboratorBookingsView.procedureNumber') }}
            </div>
            <div class="col-3">
              <input
                min="1"
                type="number"
                class="form-control form-control-sm"
                v-model="state.newConfirmationData.proceduresTotalNumber"
                placeholder="0"
                @keyup="sendData"
              />
            </div>
          </div>
          <div v-if="confirmPayment === true">
            <div id="payment-skip-payment-form-add" class="row m-1 my-1" v-if="!paidPackage()">
              <div class="col-8 text-label">
                {{ $t('collaboratorBookingsView.processPaymentNow') }}
              </div>
              <div class="col-4 form-check form-switch">
                <input
                  class="form-check-input py-2 px-3 col-12"
                  type="checkbox"
                  id="skip-payment"
                  v-model="state.newConfirmationData.processPaymentNow"
                  @click="processPaymentNow($event)"
                  @keyup="sendData"
                />
              </div>
            </div>
            <div
              v-if="
                state.selectedPackage && state.pendingIncomes && state.pendingIncomes.length > 0
              "
            >
              <div v-if="state.newConfirmationData.processPaymentNow === true">
                <div id="payment-type-form-add" class="row g-1 my-1">
                  <div class="col-4 text-label">
                    {{ $t('collaboratorBookingsView.pendingPayment') }}
                  </div>
                  <div class="col-8">
                    <select
                      class="btn btn-sm btn-light fw-bold text-dark select"
                      v-model="state.selectedPayment"
                      @change="selectPayment(state.selectedPayment)"
                      id="types"
                    >
                      <option key="NONE" :value="undefined">Select</option>
                      <option v-for="typ in state.pendingIncomes" :key="typ.name" :value="typ">
                        {{ typ.installmentNumber }} - {{ typ.amount }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div v-else-if="paidPackage()">
              <Message
                :title="$t('collaboratorBookingsView.message.9.title')"
                :content="$t('collaboratorBookingsView.message.9.content')"
              />
            </div>
            <div v-if="state.newConfirmationData.processPaymentNow === true && !paidPackage()">
              <div id="payment-type-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.paymentType') }}
                </div>
                <div class="col-8">
                  <select
                    class="btn btn-sm btn-light fw-bold text-dark select"
                    v-model="state.newConfirmationData.paymentType"
                    id="types"
                    @change="selectPaymentType($event)"
                    v-bind:class="{ 'is-invalid': state.paymentAmountError }"
                  >
                    <option v-for="typ in state.paymentTypes" :key="typ.name" :value="typ.id">
                      {{ $t(`paymentTypes.${typ.name}`) }}
                    </option>
                  </select>
                </div>
              </div>
              <div id="payment-method-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.paymentMethod') }}
                </div>
                <div class="col-8">
                  <select
                    class="btn btn-sm btn-light fw-bold text-dark select"
                    v-model="state.newConfirmationData.paymentMethod"
                    id="types"
                    @change="sendData"
                    v-bind:class="{ 'is-invalid': state.paymentMethodError }"
                  >
                    <option v-for="typ in state.paymentMethods" :key="typ.name" :value="typ.id">
                      {{ $t(`paymentClientMethods.${typ.name}`) }}
                    </option>
                  </select>
                </div>
              </div>
              <div id="payment-type-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.paymentFiscalNote') }}
                </div>
                <div class="col-8">
                  <select
                    class="btn btn-sm btn-light fw-bold text-dark select"
                    v-model="state.newConfirmationData.paymentFiscalNote"
                    @change="sendData"
                    id="types"
                  >
                    <option
                      v-for="typ in state.paymentFicalNoteTypes"
                      :key="typ.name"
                      :value="typ.id"
                    >
                      {{ $t(`paymentFiscalNotes.${typ.name}`) }}
                    </option>
                  </select>
                </div>
              </div>
              <div id="payment-totalAmount-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.totalAmount') }}
                </div>
                <div class="col-8">
                  <input
                    min="1"
                    type="number"
                    class="form-control form-control-sm"
                    v-model="state.newConfirmationData.totalAmount"
                    v-bind:class="{ 'is-invalid': state.totalAmountError }"
                    placeholder="100"
                    @keyup="sendData"
                  />
                </div>
              </div>
              <div id="payment-amount-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.paymentAmount') }}
                </div>
                <div class="col-8">
                  <input
                    min="1"
                    type="number"
                    class="form-control form-control-sm"
                    v-model="state.newConfirmationData.paymentAmount"
                    v-bind:class="{ 'is-invalid': state.paymentAmountError }"
                    placeholder="100"
                    @keyup="sendData"
                  />
                </div>
              </div>
              <div id="payment-installments-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.installments') }}
                </div>
                <div class="col-8">
                  <input
                    min="1"
                    type="number"
                    class="form-control form-control-sm"
                    v-model="state.newConfirmationData.installments"
                    v-bind:class="{ 'is-invalid': state.installmentsError }"
                    placeholder="100"
                    @keyup="sendData"
                  />
                </div>
              </div>
              <div id="payment-commission-form-add" class="row m-1 my-1">
                <div class="col-4 text-label">
                  {{ $t('collaboratorBookingsView.paymentCommission') }}
                </div>
                <div class="col-8">
                  <input
                    min="1"
                    type="number"
                    class="form-control form-control-sm"
                    v-model="state.newConfirmationData.paymentCommission"
                    placeholder="100"
                    @keyup="sendData"
                  />
                </div>
              </div>
              <div id="payment-confirm-installments-payment-form-add" class="row m-1 my-1">
                <div class="col-8 text-label">
                  {{ $t('collaboratorBookingsView.confirmInstallments') }}
                </div>
                <div class="col-4 form-check form-switch">
                  <input
                    class="form-check-input py-2 px-3 col-12"
                    type="checkbox"
                    id="skip-payment"
                    v-model="state.newConfirmationData.confirmInstallments"
                    @click="confirmInstallments($event)"
                    @keyup="sendData"
                  />
                </div>
              </div>
              <div id="payment-comment-form-add" class="row m-1 mt-1">
                <textarea
                  class="form-control mt-2 form-control-sm"
                  id="comment"
                  rows="2"
                  v-model="state.newConfirmationData.paymentComment"
                  :placeholder="$t('collaboratorBookingsView.paymentComment')"
                  @keyup="sendData"
                >
                </textarea>
              </div>
            </div>
          </div>
          <div class="row g-1 errors" id="feedback" v-if="errorsAdd.length > 0">
            <Warning>
              <template v-slot:message>
                <li v-for="(error, index) in errorsAdd" :key="index">
                  {{ $t(error) }}
                </li>
              </template>
            </Warning>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
.data-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.examples {
  font-size: 0.8rem;
  line-height: 1rem;
  color: 0.5px solid var(--gris-default);
}
.select {
  border-radius: 0.5rem !important;
  border: 1.5px solid var(--gris-clear) !important;
  font-size: 0.8rem !important;
  -webkit-line-clamp: 1 !important;
  -webkit-box-orient: vertical;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: normal !important;
}
.text-label {
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>
