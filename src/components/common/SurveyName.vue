<script>
export default {
  name: 'SurveyName',
  props: {
    type: { type: String, default: '' },
    attentionDefault: { type: Boolean, default: false },
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
      <i class="bi bi-pencil"></i> {{ $t(`surveys.types.${type}`) }}
    </span>
  </div>
  <div class="survey">
    <span class="survey-name">
      <i class="bi bi-comment"></i> {{ attentionDefault ? 'Post Attention' : 'Other' }}
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
.survey {
  background-color: var(--gris-clear);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  line-height: 1.1rem;
}
.survey-name {
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