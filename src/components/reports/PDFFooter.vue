<script>
import dayjs from 'dayjs';

export default {
  name: 'PDFFooter',
  props: {
    show: { type: Boolean, default: true },
  },
  data() {
    return {};
  },
  computed: {
    currentDate() {
      return dayjs().format('DD/MM/YYYY HH:mm');
    },
  },
  methods: {},
};
</script>

<template>
  <div id="pdf-footer" v-if="show" class="pdf-details" style="display: none">
    <hr />
    <div class="d-flex justify-content-between">
      <span> Report provided By EsTuTurno </span>
      <span> Generated on: {{ currentDate }}</span>
    </div>
  </div>
</template>

<style scoped></style>
