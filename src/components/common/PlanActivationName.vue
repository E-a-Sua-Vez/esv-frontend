<script>
export default {
  name: 'PlanActivationName',
  props: {
    activation: { type: Object, default: {} }
  },
  data() {
    return {}
  },
  methods: {
    isActive() {
      if (this.activation.active === true) {
        return 'active';
      } else {
        return 'desactived';
      }
    },
    isAttention() {
      if (this.activation.endDate) {
        const dateToAttention = new Date(new Date(this.activation.endDate).setDate(new Date().getDate() - 5));
        if (new Date() > dateToAttention) {
          return 'activation-attention';
        }
        return '';
      }
      return '';
    },
    isDesactivate() {
      if (this.activation.endDate) {
        const dateToAttention = new Date(this.activation.endDate);
        if (new Date() >= dateToAttention) {
          return 'activation-desactivate';
        }
        return '';
      }
      return '';
    }
  }
}
</script>

<template>
  <div :class="`${isActive() + ' ' + isAttention() + ' ' + isDesactivate()}`">
    <span :class="activation.active === true ? 'active-name' : 'desactived-name'">
      <i class="bi bi-star"></i> {{ activation.business.name }}
      <div id="plan-active" class=" mx-2 my-1">
        <span class="badge state rounded-pill bg-info m-1"> {{ activation.planPayedCopy.name }} </span>
        <span v-if="activation.active" class="badge state rounded-pill bg-success mx-1"> {{ $t("businessPlan.planActive") }}</span>
        <span v-else class="badge state rounded-pill bg-danger mx-1"> {{ $t("businessPlan.planInactive") }} </span>
        <span v-if="activation.validated" class="badge state rounded-pill bg-primary mx-1"> {{ $t("businessPlan.planValidated") }}</span>
        <span v-else class="badge state rounded-pill bg-warning mx-1"> {{ $t("businessPlan.planPending") }} </span><br>
        <span class="badge state rounded-pill bg-dark mx-1"> {{ activation.createdAt.slice(0,10) }} </span>
        <span v-if="activation.startDate" class="badge state rounded-pill bg-primary mx-1"> {{ activation.startDate.slice(0,10) }} </span>
        <span v-if="activation.endDate" class="badge state rounded-pill bg-danger mx-1"> {{ activation.endDate.slice(0,10) }} </span>
      </div>
    </span>
  </div>
</template>

<style scoped>
.active-name {
  background-color: var(--color-background);
  color: var(--color-text);
  font-weight: 700;
  font-size: .9rem;
}
.desactived {
  background-color: var(--gris-clear);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1px solid var(--gris-default);
}s
.activation-attention {
  border: 1.5px solid var(--amarillo-star);
}
.activation-desactivate {
  border: 1.5px solid var(--rojo-warning);
}
</style>