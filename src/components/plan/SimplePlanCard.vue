<script>
import Popper from "vue3-popper";
import Toggle from '@vueform/toggle';
import { dateYYYYMMDD } from "../../shared/utils/date";

export default {
  name: 'SimplePlanCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    plan: { type: Object, default: {} },
    planActivation: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' }
  },
  data() {
    return { }
  },
  methods: {
    getPlanName(plan) {
      return plan.name.toLowerCase();
    },
    getPlanIcon(plan) {
      if(this.getPlanName(plan) === 'premium') {
        return 'bi-star-fill';
      } else if(this.getPlanName(plan) === 'pro') {
        return 'bi-star-half';
      } else if(this.getPlanName(plan) === 'personalizado') {
        return 'bi-star-fill';
      } else {
        return 'bi-star';
      }
    },
    dateYYYYMMDD(date) {
      return dateYYYYMMDD(date);
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="h4">
      <div class="row">
        <div class="col metric-card-title">
          <div class="col-9">
            <span> {{ $t("businessPlan.yourPlan") }} </span><br>
            <span :class="`h3 plan-title plan-title-${plan.name.toLowerCase()}`"> <i :class="`bi ${getPlanIcon(plan)}`"></i> {{ $t("businessPlan.plan") }} <span class="fw-bold ">{{ plan.name }}</span></span>
          </div>
          <div class="col-2">
            <Popper
              v-if="showTooltip"
              :class="'dark'"
              arrow
              disableClickAway
              :content="$t(`plan.${plan.name}.description`)">
              <i class='bi bi-info-circle-fill h7 m-2'></i>
            </Popper>
          </div>
        </div>
        <div  class="col-2">
          <div id="plan-active" class="d-flex justify-content-end centered mx-2 my-1">
            <span v-if="plan.active" class="badge state rounded-pill bg-success"> {{ $t("businessPlan.planActive") }}</span>
            <span v-else class="badge state rounded-pill bg-danger"> {{ $t("businessPlan.planInactive") }} </span>
          </div>
          <div id="plan-active" class="d-flex justify-content-end centered mx-2 my-1">
            <span v-if="true" class="badge state rounded-pill bg-primary"> {{ $t("businessPlan.planValidated") }}</span>
            <span v-else class="badge state rounded-pill bg-warning"> {{ $t("businessPlan.planPending") }} </span>
          </div>
        </div>
      </div>
      <div>
        <div class="divider-custom">
          <div class="divider-custom-line"></div>
        </div>
      </div>
      <div id="conf-id-form" class="row mb-g2">
        <div class="row plan-details-container">
          <div class="row g-1 m-2">
            <a
              class="nav-link benefits-title"
              data-bs-toggle="collapse"
              :href="`#benefits`">
              <i class="bi bi-cart-check"></i> {{ $t("businessPlan.benefits") }} <i class="bi bi-chevron-down"></i>
            </a>
          </div>
          <div :id="`benefits`" class="row collapse benefits-list">
            <ul v-for="benefit in plan.benefits" class="list list-unstyled mb-0" :key="benefit">
              <li><span class="list-icon"><i class="bi bi-check-lg"></i></span><span>{{ benefit }}</span></li>
            </ul>
          </div>
          <div v-if="planActivation.payment" class="row g-0 m-2">
            <a
              class="nav-link benefits-title"
              data-bs-toggle="collapse"
              href="#purchase">
              <i class="bi bi-credit-card"></i> {{ $t("businessPlan.yourPurchase") }} <i class="bi bi-chevron-down"></i>
            </a>
          </div>
          <div id="purchase" class="row collapse benefits-list">
            <ul class="list list-unstyled">
              <li><span class="fw-bold"> {{ $t("businessPlan.startDate") }}</span><span> {{ dateYYYYMMDD(planActivation.startDate) || 'N/A' }} </span></li>
              <li><span class="fw-bold"> {{ $t("businessPlan.endDate") }}</span><span> {{ dateYYYYMMDD(planActivation.endDate) || 'N/A' }} </span></li>
              <li><span class="fw-bold"> {{ $t("businessPlan.purchaseDate") }}</span><span> {{ dateYYYYMMDD(planActivation.payedAt) || 'N/A' }} </span></li>
              <li><span class="fw-bold"> {{ $t("businessPlan.paymentValue") }}</span><span> {{ plan.currency || '$' }} {{ planActivation.payment?.amount || 0 }}</span></li>
              <li><span class="fw-bold"> {{ $t("businessPlan.paymentMethod") }}</span><span> {{ planActivation.payment?.method || 'N/A' }} </span></li>
              <li><span class="fw-bold"> {{ $t("businessPlan.validatedAt") }}</span><span> {{ dateYYYYMMDD(planActivation.payedAt) || 'N/A' }} </span></li>
            </ul>
          </div>
          <div class="col m-2">
            <span><strong>Plan Id:</strong> {{ plan.id }} </span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.metric-card-title {
  font-size: 1rem;
  font-weight: 500;
}
.state {
  font-size: .8rem;
  font-weight: 600;
}
.plan-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.benefits-title {
  line-height: 1.2rem;
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
  margin-bottom: .2rem;
}
.benefits-list {
  padding: .5rem;
  line-height: 1.1rem;
  font-size: .8rem;
  font-weight: 500;
  text-align: left;
}
.plan-title {
  color: var(--azul-turno);
  line-height: 1rem;
  height: 5rem;
  padding-top: 1rem;
}
.plan-title-premium {
  color: var(--verde-tu);
}
.plan-title-personalizado {
  color: var(--azul-qr);
}
</style>