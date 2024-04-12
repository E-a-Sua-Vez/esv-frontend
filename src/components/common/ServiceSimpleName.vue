<script>

export default {
  name: 'ServiceSimpleName',
  props: {
    service: { type: Object, default: { name: '', active: false } },
    details: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    }
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    }
  }
}
</script>

<template>
  <div>
    <div :class="service.active === true ? 'active' : 'desactived'">
      <span
        v-if="details"
        class="service-details"
        :class="service.active === true ? 'active-name' : 'desactived-name'"
      >
        <div class="row centered">
          <div class="col-8">
            <i class="bi bi-person-lines-fill"></i> {{ service.name }}
          </div>
          <div class="col-2">
            <span>
              <i class="dark fw-bold" :class="'bi bi-arrow-right-circle-fill'"></i>
            </span>
          </div>
        </div>
      </span>
      <span v-else :class="service.active === true ? 'active-name' : 'desactived-name'">
        <i class="bi bi-person-lines-fill"></i> {{ service.name }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.active {
  background-color: var(--azul-turno);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--azul-turno);
}
.desactived {
  background-color: var(--gris-tooltip);
  margin: .1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--gris-tooltip);
}
.desactived-name {
  background-color: var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: .9rem;
}
.show {
  padding: .5rem;
  overflow-y: auto;
}
.service-details {
  cursor: pointer;
}

</style>