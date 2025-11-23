<script>
export default {
  name: 'QueueSimpleName',
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    details: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    };
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
  },
};
</script>

<template>
  <div>
    <div :class="queue.active === true ? 'active' : 'desactived'">
      <span :class="queue.active === true ? 'active-name' : 'desactived-name'">
        <i class="bi bi-person-lines-fill"></i> {{ queue.name }}
      </span>
    </div>
    <div class="tag" v-if="queue.type">
      <span class="tag-name" v-if="queue.type !== 'STANDARD'">
        <i class="bi bi-tags-fill"></i> {{ queue.tag }}
      </span>
      <span class="tag-name" v-else> <i class="bi bi-tags-fill"></i> {{ queue.type }} </span>
    </div>
  </div>
</template>

<style scoped>
.show {
  padding: 0.5rem;
  overflow-y: auto;
}
.queue-details {
  cursor: pointer;
}
.tag {
  background-color: var(--gris-clear);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  line-height: 1.1rem;
}
.tag-name {
  background-color: var(--gris-clear);
  font-weight: 900;
  font-size: 0.8rem;
}
</style>
