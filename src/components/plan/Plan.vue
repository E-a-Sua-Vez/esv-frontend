<script>
export default {
  name: 'Plan',
  props: {
    plan: { type: Object, default: {} },
    selectedPlan: { type: Object, default: undefined },
    selectionable: { type: Boolean, default: true },
  },
  data() {
    return {
      active: 0,
      planSelected: {},
    };
  },
  methods: {
    getPlanName(plan) {
      return plan.name.toLowerCase();
    },
    getPlanIcon(plan) {
      if (this.getPlanName(plan) === 'premium') {
        return 'bi-star-fill';
      } else if (this.getPlanName(plan) === 'pro') {
        return 'bi-star-half';
      } else if (this.getPlanName(plan) === 'personalizado') {
        return 'bi-star-fill';
      } else {
        return 'bi-star';
      }
    },
  },
};
</script>

<template>
  <div v-if="plan.active" class="m-2">
    <div
      :class="`card card-${getPlanName(plan)} ${selectionable ? 'card-selectionable' : ''} ${
        plan.id === selectedPlan.id && selectionable ? 'card-selected' : ''
      }`"
    >
      <div :class="`mt-1 plan-title plan-title-${plan.name.toLowerCase()}`">
        <span class="details"><i :class="`m-1 bi ${getPlanIcon(plan)}`"></i></span
        ><span class="plan">{{ $t('businessPlan.plan') }}</span
        ><span class="details fw-bold">{{ plan.name }}</span>
      </div>
      <div v-if="plan.value > 0" class="mt-1 plan-price">
        <span class="plan-amount details fw-bold"
          ><i class="bi bi-coin"></i> {{ plan.currency }}{{ plan.value }}</span
        >
        /{{ plan.periodicity }}
      </div>
      <div v-else class="mt-2 plan-price">
        <span class="plan-amount details fw-bold"
          ><i class="bi bi-coin"></i> {{ $t('businessPlan.consult') }}</span
        >
      </div>
      <div class="card-body">
        <div class="row g-1 m-2">
          <a
            class="nav-link benefits-title"
            data-bs-toggle="collapse"
            :href="`#benefits-${plan.id}`"
          >
            <i class="bi bi-cart-check"></i> {{ $t('businessPlan.benefits') }}
            <i class="bi bi-chevron-down"></i>
          </a>
        </div>
        <div :id="`benefits-${plan.id}`" class="row collapse benefits-list">
          <ul v-for="benefit in plan.benefits" class="list list-unstyled mb-0" :key="benefit">
            <li>
              <span class="list-icon"><i class="bi bi-check-lg"></i></span
              ><span>{{ benefit }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-body {
  margin-left: 1rem;
}
.card-premium {
  --border: 1.5px solid var(--verde-tu);
}
.card-personalizado {
  --border: 1.5px solid var(--azul-qr);
}
.card-selected {
  border: 1.5px solid var(--azul-turno);
  background-color: var(--azul-select);
  transform: perspective(500px) translate3d(0, 0, 20px);
}
.card-selected .plan-title {
  font-size: 1.5rem;
  color: var(--azul-turno);
  padding-top: 1rem;
}
.card-selectionable:hover {
  transition: transform 180ms;
  transform: perspective(500px) translate3d(0, 0, 20px);
  cursor: pointer;
}
.plan-title {
  font-size: 1.5rem;
  color: var(--gris-default);
  padding-top: 1rem;
}
.plan-title-premium {
  color: var(--verde-tu);
}
.plan-title-personalizado {
  color: var(--azul-qr) !important;
}
.plan-price {
  background-color: var(--azul-turno);
  margin: 0rem 2rem;
  border-radius: 1rem;
  line-height: 1.1rem;
  font-size: 0.8rem;
  font-weight: 300;
  color: var(--color-background);
  border: 1.5px solid var(--azul-turno);
}
.plan-amount {
  background-color: var(--azul-turno);
  font-weight: 700;
  font-size: 1rem;
}
.benefits-title {
  line-height: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  text-align: left;
  margin-bottom: 1rem;
}
.benefits-list {
  line-height: 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
}
.details {
  line-height: normal;
}
.plan {
  font-size: 1.5rem;
}
</style>
