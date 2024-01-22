<script>
import Popper from "vue3-popper";
import Toggle from '@vueform/toggle';

export default {
  name: 'SimplePermissionCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    permission: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' }
  },
  data() {
    return { }
  },
  methods: {
    async update () {
      await this.$emit('update', this.permission);
    }
  }
}
</script>

<template>
  <div v-if="show">
    <div class="row metric-card h4">
      <div class="metric-card-title col-8 p-0">
        <div class="col-12">
          <i :class="`bi ${icon} ${iconStyleClass} centered p-1`" ></i>
          <span class="p-1 text-break"> {{ permission.name }} </span>
          <Popper
            v-if="showTooltip"
            :class="'dark'"
            arrow
            disableClickAway
            :content="$t(`permissions.${permission.name}`)">
            <i class='bi bi-info-circle-fill h7 m-2'></i>
          </Popper>
        </div>
      </div>
      <div class="col-3 centered justify-content-end p-0">
        <div v-if="permission.value === true || permission.value === false">
          <Toggle
            v-model="permission.value"
            :disabled="!canUpdate"
            @click="update(permission)"
          />
        </div>
        <div class="row g-2" v-else>
          <div class="col-12 col-md-9">
            <input
              min="1"
              type="number"
              class="form-control"
              v-model="permission.value"
              placeholder="Ex.: 10">
          </div>
          <div class="col-12 col-md-2">
            <button
              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-2"
              @click="update(permission)">
              <i class="bi bi-check-lg"></i>
            </button>
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
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  margin: .1rem;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-self: center;
}
.configuration-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
</style>