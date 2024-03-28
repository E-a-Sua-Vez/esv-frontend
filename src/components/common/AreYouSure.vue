<script>
export default {
  name: 'AreYouSure',
  props: {
    show: { type: Boolean, default: false },
    yesDisabled: { type: Boolean, default: false },
    noDisabled: { type: Boolean, default: false }
  },
  data() {
    return {
      yesClicked: false
    }
  },
  methods: {
    actionYes() {
      this.yesClicked = true;
      this.$emit('actionYes');
    },
    actionNo() {
      this.$emit('actionNo');
    }
  }
}
</script>

<template>
  <div>
    <div class="question-card g-1 mt-2 p-2 mx-2" id="sure" v-if="show">
      <div class="text-label">
        {{ $t("sureAction") }}
      </div>
      <div class="centered mt-1">
        <button
          class="col btn btn-md btn-size fw-bold btn-dark rounded-pill mt-2 px-4 mx-1"
          @click="actionYes()"
          :disabled="!yesDisabled || yesClicked">
          {{ $t("yes") }} <i class="bi bi-check2-circle"></i>
        </button>
        <button
          class="col btn btn-md btn-size fw-bold btn-danger rounded-pill mt-2 px-4 mx-1"
          @click="actionNo()"
          :disabled="!noDisabled">
          {{ $t("no") }} <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-card {
  font-size: .9rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
  line-height: 1rem;
}
</style>