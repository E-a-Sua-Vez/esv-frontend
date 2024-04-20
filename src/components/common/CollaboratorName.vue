<script>
export default {
  name: 'CollaboratorName',
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
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
      <i class="bi bi-person"></i> {{ name }}
    </span>
  </div>
  <div class="email">
    <span class="email-name">
      <i class="bi bi-at"></i> {{ email }}
    </span>
  </div>
</template>

<style scoped>
.email {
  background-color: var(--gris-clear);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  line-height: 1.1rem;
}
.email-name {
  background-color: var(--gris-clear);
  font-weight: 900;
  font-size: .8rem;
}
</style>