<script>
import { ref, reactive, onBeforeMount, toRefs } from 'vue';
import Warning from '../../components/common/Warning.vue';
import { getPaymentMethods, getPaymentTypes } from '../../shared/utils/data';

export default {
  name: 'PaymentForm',
  components: { Warning },
  props: {
    errorsAdd: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);

    const {
      commerce,
      errorsAdd
    } = toRefs(props);

    const { receiveData } = props;

    const state = reactive({
      newConfirmationData: {},
      paymentTypes: [],
      paymentMethods: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.paymentTypes = getPaymentTypes();
        state.paymentMethods = getPaymentMethods();
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const sendData = () => {
      receiveData(state.newConfirmationData);
    }

    const selectPaymentType = ($event) => {
      if ($event && $event.target) {
        const paymentType = $event.target.value;
        if (['PAID', 'RETURN', 'EVALUATION', 'PROMOTION', 'TRIAL'].includes(paymentType)) {
          state.newConfirmationData.paymentMethod = 'PAID'
          state.newConfirmationData.paymentAmount = 0;
          state.newConfirmationData.paymentCommission = 0
        } else {
          state.newConfirmationData.paymentMethod = ''
          state.newConfirmationData.paymentAmount = null;
          state.newConfirmationData.paymentCommission = null
        }
      }
    }

    return {
      state,
      loading,
      commerce,
      errorsAdd,
      selectPaymentType,
      sendData
    }
  }
}
</script>
<template>
  <div>
    <div id="payment-data" >
      <div class="row g-1">
        <div class="col col-md-10 offset-md-1">
          <div id="payment-type-form-add" class="row g-1 my-1">
            <div class="col-4 text-label">
              {{ $t("collaboratorBookingsView.paymentType") }}
            </div>
            <div class="col-8">
              <select
                class="btn btn-md btn-light fw-bold text-dark select"
                v-model="state.newConfirmationData.paymentType"
                id="types"
                @change="selectPaymentType($event)"
                v-bind:class="{ 'is-invalid': state.paymentAmountError }">
                <option v-for="typ in state.paymentTypes" :key="typ.name" :value="typ.id">{{ $t(`paymentTypes.${typ.name}`) }}</option>
              </select>
            </div>
          </div>
          <div id="payment-method-form-add" class="row g-1 my-1">
            <div class="col-4 text-label">
              {{ $t("collaboratorBookingsView.paymentMethod") }}
            </div>
            <div class="col-8">
              <select
                class="btn btn-md btn-light fw-bold text-dark select"
                v-model="state.newConfirmationData.paymentMethod"
                id="types"
                v-bind:class="{ 'is-invalid': state.paymentMethodError }">
                <option v-for="typ in state.paymentMethods" :key="typ.name" :value="typ.id">{{ $t(`paymentClientMethods.${typ.name}`) }}</option>
              </select>
            </div>
          </div>
          <div id="payment-amount-form-add" class="row g-1 my-1">
            <div class="col-4 text-label">
              {{ $t("collaboratorBookingsView.paymentAmount") }}
            </div>
            <div class="col-8">
              <input
                min="1"
                type="number"
                class="form-control"
                v-model="state.newConfirmationData.paymentAmount"
                v-bind:class="{ 'is-invalid': state.paymentAmountError }"
                placeholder="100"
                @keyup="sendData"
                >
            </div>
          </div>
          <div id="payment-commission-form-add" class="row g-1 my-1">
            <div class="col-4 text-label">
              {{ $t("collaboratorBookingsView.paymentCommission") }}
            </div>
            <div class="col-8">
              <input
                min="1"
                type="number"
                class="form-control"
                v-model="state.newConfirmationData.paymentCommission"
                placeholder="100"
                @keyup="sendData"
                >
            </div>
          </div>
          <div id="payment-comment-form-add" class="row g-1 mt-1">
            <textarea
              class="form-control mt-2"
              id="comment"
              rows="2"
              v-model="state.newConfirmationData.paymentComment"
              :placeholder="$t('collaboratorBookingsView.paymentComment')"
              @keyup="sendData"
              >
            </textarea>
          </div>
          <div class="row g-1 errors" id="feedback" v-if="(errorsAdd.length > 0)">
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
  font-size: .9rem;
  font-weight: 500;
  line-height: 1rem;
}
.data-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
.select {
  border-radius: .5rem !important;
  border: 1.5px solid var(--gris-clear) !important;
}
</style>