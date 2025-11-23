<script>
export default {
  name: 'CommerceName',
  props: {
    name: { type: String, default: '' },
    tag: { type: String, default: '' },
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
      <i class="bi bi-shop"></i> {{ name }}
    </span>
  </div>
  <div class="tag">
    <span class="tag-name"> <i class="bi bi-tags-fill"></i> {{ tag }} </span>
  </div>
</template>

<style scoped>
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
