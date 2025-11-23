<script>
export default {
  name: 'ModuleName',
  props: {
    name: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div :class="active === true ? 'active' : 'desactived'">
    <span :class="active === true ? 'active-name' : 'desactived-name'">
      <i class="bi bi-laptop"></i> {{ name }}
    </span>
  </div>
</template>

<style scoped>
.active {
  background-color: var(--azul-turno);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1rem;
  border: 1.5px solid var(--azul-turno);
}
.desactived {
  background-color: var(--gris-tooltip);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--gris-tooltip);
}
.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
