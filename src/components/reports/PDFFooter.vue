<script>

export default {
  name: 'PDFFooter',
  props: {
    show: { type: Boolean, default: true }
  },
  data() {
    return { }
  },
  methods: { },
}
</script>

<template>
  <div id="pdf-footer" v-if="show" class="pdf-details" style="display:none">
    <hr>
    <span> Report provided By EsTuTurno </span>
  </div>
</template>

<style scoped>
</style>