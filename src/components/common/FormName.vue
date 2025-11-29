<script>
export default {
  name: 'FormName',
  props: {
    type: { type: String, default: '' },
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
      <i class="bi bi-pencil"></i> {{ $t(`forms.types.${type}`) }}
    </span>
  </div>
</template>

<style scoped>
.active {
  background-color: var(--azul-turno);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1rem;
  border: 1px solid var(--azul-turno);
}
.desactived {
  background-color: var(--gris-tooltip);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1rem;
  border: 1px solid var(--gris-tooltip);
}
.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
}
.show {
  padding: 0.5rem;
  overflow-y: auto;
}
</style>
