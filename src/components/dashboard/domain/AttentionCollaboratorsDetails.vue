<script>

export default {
  name: 'AttentionCollaboratorsDetails',
  props: {
    show: { type: Boolean, default: true },
    collaborators: { type: Array, default: [] },
    limit: { type: Number, default: 5 },
  },
  data() {
    return {
    }
  },
  methods: {
  },
}
</script>

<template>
  <div v-if="show">
    <div v-if="collaborators.length > 0">
      <div class="row mx-2" v-for="(collaborator, index) in collaborators.slice(0, limit)" :key="collaborator.id">
        <div class="metric-card-title">
          <i :class="`h6 col-2 bi bi-${index+1}-circle-fill`"></i>
          <span class="col-8"> {{ collaborator.name || 'No Data' }} </span>
          <span class="col-2 badge rounded-pill bg-secondary metric-card-subtitle"> {{ collaborator.attention_counter || 0 }} </span>
        </div>
        <hr>
      </div>
    </div>
    <div v-else>
      <div class="row">
        <div class="col">
          <div class="metric-card-title">
            <span class="col-8"> {{ 'No Data' }} </span>
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
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>