<script>
export default {
  name: 'PDFHeader',
  props: {
    show: { type: Boolean, default: true },
    title: { type: String, default: 'Report' },
    startDate: { type: String, default: 'No Data' },
    endDate: { type: String, default: 'No Data' },
    commerce: { type: Object, default: { name: 'N/I', tag: 'N/I' } },
  },
  data() {
    return {};
  },
  methods: {},
};
</script>

<template>
  <div id="pdf-header" v-if="show" class="my-4" style="display: none">
    <div class="centered">
      <img style="width: 220px" :src="'/images/esv/esv-color-horizontal-transparente.png'" />
    </div>
    <div class="centered">
      <span class="fw-bold" style="font-size: 1rem"> {{ title }} </span>
    </div>
    <div class="pdf-details">
      <span class="fw-bold"> Filters :: </span>
      <span>
        From: {{ startDate }}, To: {{ endDate }}, Commerce:
        {{ commerce.name + ' - ' + commerce.tag }}
      </span>
    </div>
    <hr />
  </div>
</template>

<style scoped></style>
