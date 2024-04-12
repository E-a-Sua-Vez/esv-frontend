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
.active {
  background-color: var(--azul-turno);
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--azul-turno);
}
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

.desactived {
  background-color: var(--gris-tooltip);
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--gris-tooltip);
}
.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: .9rem;
}
</style>