<script>
import Plan from '../../components/plan/Plan.vue';
import Warning from '../../components/common/Warning.vue';

export default {
  name: 'PlanSelection',
  components: { Plan, Warning },
  props: {
    plan: { type: Object, default: {} }
  },
  data() {
    return {
      paymentMethod: 'OTHER',
      acceptTerms: false,
      acceptTermsError: false,
      errorsAdd: []
    }
  },
  methods: {
    validate() {
      this.errorsAdd = [];
      if(this.acceptTerms === false) {
        this.acceptTermsError = true;
        this.errorsAdd.push('businessPlan.validate.terms');
      } else {
        this.acceptTermsError = false;
      }
      if(this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async select(plan, acceptTerms) {
      if (this.validate()) {
        await this.$emit('select', plan, this.paymentMethod, acceptTerms)
        const closePurchaseModal = document.getElementById('closePlanSelectModal');
        closePurchaseModal.click();
      }
    }
  }
}
</script>

<template>
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h2 class="portfolio-modal-title mb-0">{{ $t("planSelection.title") }}</h2>
        <div class="divider-custom">
          <div class="divider-custom-line"></div>
          <div class="divider-custom-icon"><i class="bi bi-cart"></i></div>
          <div class="divider-custom-line"></div>
        </div>
        <p class="mb-4 details"><span class="fw-bold">{{ $t("planSelection.subtitle.1") }}</span> {{ $t("planSelection.subtitle.2") }}</p>
        <div class="m-2">
          <Plan
            :plan="plan"
            :selectionable="false"
            :selectedPlan="{}">
          </Plan>
        </div>
        <div>
          <div class="payment-card m-3 p-3">
            <div class="centered">
              <span> <i class="h1 bi bi-cash-coin"></i> </span> <span class="details m-2"> {{ $t("planSelection.canPayWays") }} </span>
            </div>
            <div class="card-body mt-4">
              <div class="row g-1">
                <div class="col-2">
                  <input type="radio" class="" v-model="paymentMethod" value="WIRE_TRANSFER" name="payment-method" id="success-outlined" autocomplete="off" checked>
                </div>
                <a
                  class="col-8 nav-link benefits-title"
                  data-bs-toggle="collapse"
                  :href="`#wire`">
                  {{ $t("planSelection.wireTransfer") }} <i class="bi bi-chevron-down"></i>
                </a>
              </div>
              <div :id="`wire`" class="row collapse benefits-list ml-4">
                <ul class="list list-unstyled mb-0 m-2">
                  <li><span class="fw-bold"> {{ $t("planSelection.bank") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.accountType") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.accountNumber") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.id") }}</span><span> N/A </span></li>
                </ul>
              </div>
            </div>
            <div class="card-body mt-1">
              <div class="row g-1">
                <div class="col-2">
                  <input type="radio" class="" v-model="paymentMethod" value="CASH_DEPOSIT" name="payment-method" id="success-outlined" autocomplete="off">
                </div>
                <a
                  class="col-8 nav-link benefits-title"
                  data-bs-toggle="collapse"
                  :href="`#deposit`">
                  {{ $t("planSelection.cashDeposit") }} <i class="bi bi-chevron-down"></i>
                </a>
              </div>
              <div :id="`deposit`" class="row collapse benefits-list ml-4">
                <ul class="list list-unstyled mb-0 m-2">
                  <li><span class="fw-bold"> {{ $t("planSelection.bank") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.accountType") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.accountNumber") }}</span><span> N/A </span></li>
                  <li><span class="fw-bold"> {{ $t("planSelection.id") }}</span><span> N/A </span></li>
                </ul>
              </div>
            </div>
            <div class="card-body mt-2">
              <div class="row g-1">
                <div class="col-2 centered">
                  <input type="radio" class="" v-model="paymentMethod" value="OTHER" name="payment-method" id="success-outlined" autocomplete="off">
                </div>
                <a
                  class="col-8 nav-link benefits-title">
                  {{ $t("planSelection.contact") }}
                </a>
              </div>
            </div>
            <div class="centered mt-4">
              <span class="details details-payment"> {{ $t("planSelection.wantContact") }} </span>
            </div>
          </div>
        </div>
        <div class="recaptcha-area plan-select-title form-check m-2">
          <input type="checkbox" class="form-check-input" id="conditions" v-model="acceptTerms">
          <label class="form-check-label label-conditions text-left" for="conditions">
            {{ $t("businessPlan.acceptData.1") }}
            <a href="#conditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("businessPlan.acceptData.2") }}</a>
            {{ $t("businessPlan.acceptPurchase.1") }}
            <a href="#useConditionsModal" data-bs-toggle="modal" data-bs-target="#conditionsModal"> {{ $t("businessPlan.acceptPurchase.2") }}</a>
          </label>
        </div>
        <a
          class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
          data-bs-target="#planSelectModal"
          @click="select(plan, acceptTerms)">{{ $t("planSelection.action") }} <i class="bi bi-check-lg"></i>
        </a>
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
</template>

<style scoped>
.details {
  line-height: normal;
}
.details-payment {
  font-size: .9rem;
}
.card-body {
  margin-left: 1rem;
}
.benefits-title {
  line-height: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: left;
}
.benefits-list {
  line-height: .8rem;
  font-size: .9rem;
  font-weight: 500;
  text-align: left;
}
.payment-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.plan-select-title {
  line-height: 1rem;
}
</style>