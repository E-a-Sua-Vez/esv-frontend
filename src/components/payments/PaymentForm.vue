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
  <div class="payment-form-modern">
    <div id="payment-data">
      <div class="payment-form-content">
        <div v-if="state.packages && state.packages.length > 0" class="payment-form-field">
          <label class="payment-form-label">
            {{ $t('collaboratorBookingsView.packages') }}
          </label>
          <select
            class="payment-form-select"
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
        <div class="payment-form-field" id="payment-procedure-total-number-form-add">
          <label class="payment-form-label">
            {{ $t('collaboratorBookingsView.proceduresTotalNumber') }}
          </label>
          <div class="payment-form-procedure">
            <input
              min="1"
              type="number"
              class="payment-form-input"
              v-model="state.newConfirmationData.procedureNumber"
              placeholder="0"
              @keyup="sendData"
            />
            <span class="payment-form-separator">
              {{ $t('collaboratorBookingsView.procedureNumber') }}
            </span>
            <input
              min="1"
              type="number"
              class="payment-form-input"
              v-model="state.newConfirmationData.proceduresTotalNumber"
              placeholder="0"
              @keyup="sendData"
            />
          </div>
        </div>
        <div v-if="confirmPayment === true" class="payment-form-payment-section">
          <div class="payment-form-field payment-form-switch" v-if="!paidPackage()">
            <label class="payment-form-label">
              {{ $t('collaboratorBookingsView.processPaymentNow') }}
            </label>
            <div class="form-check form-switch">
              <input
                class="form-check-input payment-switch-input"
                type="checkbox"
                id="skip-payment"
                v-model="state.newConfirmationData.processPaymentNow"
                @click="processPaymentNow($event)"
                @keyup="sendData"
              />
            </div>
          </div>
          <div
            v-if="state.selectedPackage && state.pendingIncomes && state.pendingIncomes.length > 0"
          >
            <div
              v-if="state.newConfirmationData.processPaymentNow === true"
              class="payment-form-field"
            >
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.pendingPayment') }}
              </label>
              <select
                class="payment-form-select"
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
          <div v-else-if="paidPackage()">
            <Message
              :title="$t('collaboratorBookingsView.message.9.title')"
              :content="$t('collaboratorBookingsView.message.9.content')"
            />
          </div>
          <div
            v-if="state.newConfirmationData.processPaymentNow === true && !paidPackage()"
            class="payment-form-payment-fields"
          >
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentType') }}
              </label>
              <select
                class="payment-form-select"
                :class="{ 'is-invalid': state.paymentAmountError }"
                v-model="state.newConfirmationData.paymentType"
                id="types"
                @change="selectPaymentType($event)"
              >
                <option v-for="typ in state.paymentTypes" :key="typ.name" :value="typ.id">
                  {{ $t(`paymentTypes.${typ.name}`) }}
                </option>
              </select>
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentMethod') }}
              </label>
              <select
                class="payment-form-select"
                :class="{ 'is-invalid': state.paymentMethodError }"
                v-model="state.newConfirmationData.paymentMethod"
                id="types"
                @change="sendData"
              >
                <option v-for="typ in state.paymentMethods" :key="typ.name" :value="typ.id">
                  {{ $t(`paymentClientMethods.${typ.name}`) }}
                </option>
              </select>
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentFiscalNote') }}
              </label>
              <select
                class="payment-form-select"
                v-model="state.newConfirmationData.paymentFiscalNote"
                @change="sendData"
                id="types"
              >
                <option v-for="typ in state.paymentFicalNoteTypes" :key="typ.name" :value="typ.id">
                  {{ $t(`paymentFiscalNotes.${typ.name}`) }}
                </option>
              </select>
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.totalAmount') }}
              </label>
              <input
                min="1"
                type="number"
                class="payment-form-input"
                :class="{ 'is-invalid': state.totalAmountError }"
                v-model="state.newConfirmationData.totalAmount"
                placeholder="100"
                @keyup="sendData"
              />
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentAmount') }}
              </label>
              <input
                min="1"
                type="number"
                class="payment-form-input"
                :class="{ 'is-invalid': state.paymentAmountError }"
                v-model="state.newConfirmationData.paymentAmount"
                placeholder="100"
                @keyup="sendData"
              />
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.installments') }}
              </label>
              <input
                min="1"
                type="number"
                class="payment-form-input"
                :class="{ 'is-invalid': state.installmentsError }"
                v-model="state.newConfirmationData.installments"
                placeholder="100"
                @keyup="sendData"
              />
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentCommission') }}
              </label>
              <input
                min="1"
                type="number"
                class="payment-form-input"
                v-model="state.newConfirmationData.paymentCommission"
                placeholder="100"
                @keyup="sendData"
              />
            </div>
            <div class="payment-form-field payment-form-switch">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.confirmInstallments') }}
              </label>
              <div class="form-check form-switch">
                <input
                  class="form-check-input payment-switch-input"
                  type="checkbox"
                  id="confirm-installments"
                  v-model="state.newConfirmationData.confirmInstallments"
                  @click="confirmInstallments($event)"
                  @keyup="sendData"
                />
              </div>
            </div>
            <div class="payment-form-field">
              <label class="payment-form-label">
                {{ $t('collaboratorBookingsView.paymentComment') }}
              </label>
              <textarea
                class="payment-form-textarea"
                id="comment"
                rows="3"
                v-model="state.newConfirmationData.paymentComment"
                :placeholder="$t('collaboratorBookingsView.paymentComment')"
                @keyup="sendData"
              ></textarea>
            </div>
          </div>
        </div>
        <div class="payment-form-errors" v-if="errorsAdd.length > 0">
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
</template>
<style scoped>
/* Modern Payment Form - Compact */
.payment-form-modern {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.payment-form-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: -0.01em;
}

.payment-form-select,
.payment-form-input {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
}

.payment-form-select:hover,
.payment-form-input:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-select:focus,
.payment-form-input:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-select.is-invalid,
.payment-form-input.is-invalid {
  border-color: #dc3545;
}

.payment-form-procedure {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.payment-form-procedure .payment-form-input {
  flex: 1;
}

.payment-form-separator {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.payment-form-switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.payment-switch-input {
  width: 3rem;
  height: 1.5rem;
  cursor: pointer;
}

.payment-form-textarea {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
  resize: vertical;
  font-family: inherit;
}

.payment-form-textarea:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-textarea:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-payment-section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
}

.payment-form-payment-fields {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-errors {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 6px;
}

/* Legacy styles for compatibility */
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

.text-label {
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>
