<script>
export default {
  name: 'PlanName',
  props: {
    name: { type: String, default: '' },
    active: { type: Boolean, default: true }
  },
  data() {
    return {}
  }
}
</script>

<template>
  <div :class="active === true ? 'active' : 'desactived'">
    <span :class="active === true ? 'active-name' : 'desactived-name'">
      <i class="bi bi-star"></i> {{ name }}
    </span>
  </div>
</template>

<style scoped>
</style>