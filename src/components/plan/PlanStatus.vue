<script>
import Popper from 'vue3-popper';
import Toggle from '@vueform/toggle';
import { useRouter } from 'vue-router';
import { dateYYYYMMDD } from '../../shared/utils/date';

export default {
  name: 'PlanStatus',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canRenew: { type: Boolean, default: false },
    canAdmin: { type: Boolean, default: false },
    planActivation: { type: Object, default: {} },
  },
  data() {
    const router = useRouter();
    return {
      open: true,
      router,
    };
  },
  methods: {
    isAttention() {
      if (this.planActivation.endDate) {
        const dateToAttention = new Date(
          new Date(this.planActivation.endDate).setDate(
            new Date(this.planActivation.endDate).getDate() - 5
          )
        );
        if (new Date() > dateToAttention) {
          return 'activation-attention';
        }
        return '';
      }
      return '';
    },
    isDesactivate() {
      if (this.planActivation.endDate) {
        const dateToAttention = new Date(this.planActivation.endDate);
        if (new Date() >= dateToAttention) {
          return 'activation-desactivate';
        }
        return '';
      }
      return '';
    },
    dateYYYYMMDD(date) {
      return dateYYYYMMDD(date);
    },
    goToAdmin() {
      this.router.push({ path: '/interno/negocio/your-plan' });
    },
    gotToRenew() {
      this.$emit('renew');
    },
    close() {
      this.open = false;
    },
  },
};
</script>

<template>
  <div v-if="open && show && (isDesactivate() || isAttention())">
    <div class="h4">
      <div class="row m-2">
        <div :class="`col plan-card ${isDesactivate() + ' ' + isAttention()}`">
          <div class="row plan-card-title mb-2 centered">
            <div class="col-10">
              <span v-if="isDesactivate()"
                ><i class="bi bi-emoji-dizzy"></i> {{ $t('planStatus.title.desactivate') }}</span
              >
              <span v-else-if="isAttention()"
                ><i class="bi bi-emoji-frown"></i>{{ $t('planStatus.title.attention') }}</span
              >
            </div>
            <div class="col p-1">
              <button
                type="button"
                class="btn btn-sm btn-close"
                aria-label="Close"
                @click="close()"
              ></button>
            </div>
          </div>
          <div class="plan-card-subtitle">
            <span v-if="isDesactivate()"
              >{{ $t('planStatus.subtitle.desactivate') }}
              <span class="fw-bold"> {{ dateYYYYMMDD(planActivation.endDate) }} </span>.</span
            >
            <span v-else-if="isAttention()"
              >{{ $t('planStatus.subtitle.attention') }}
              {{ dateYYYYMMDD(planActivation.endDate) }}</span
            >
          </div>
          <div class="plan-card-subtitle fw-bold mt-2">
            <span>{{ $t('planStatus.itsYourTurn') }}</span>
          </div>
          <div>
            <button
              v-if="canRenew"
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              href="#planSelectModal"
              data-bs-toggle="modal"
              data-bs-target="#planSelectModal"
              @click="gotToRenew()"
            >
              {{ $t('planStatus.action.1') }}
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            <button
              v-if="canAdmin"
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              @click="goToAdmin()"
            >
              {{ $t('planStatus.action.2') }}
              <i class="bi bi-arrow-up-right-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plan-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.plan-card-title {
  font-size: 1rem;
  font-weight: 600;
}
.plan-card-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
}
.activation-attention {
  border: 1.5px solid var(--amarillo-star);
  background-color: var(--amarillo-light);
}
.activation-desactivate {
  border: 1.5px solid var(--rojo-warning);
  background-color: var(--rojo-ligth);
}
</style>
