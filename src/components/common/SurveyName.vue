<script>
export default {
  name: 'SurveyName',
  props: {
    type: { type: String, default: '' },
    attentionDefault: { type: Boolean, default: false },
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
.survey {
  background-color: var(--gris-clear);
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  line-height: 1.1rem;
}
.survey-name {
  background-color: var(--gris-clear);
  font-weight: 900;
  font-size: 0.8rem;
}
</style>
