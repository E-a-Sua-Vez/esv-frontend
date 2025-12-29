<script>
import QrcodeVue from 'qrcode.vue';

export default {
  name: 'QR',
  components: { QrcodeVue },
  props: {
    value: { type: String, default: '' },
    size: { type: Number, default: 132 },
    background: { type: String, default: '#00008B' },
    foreground: { type: String, default: '#ffffff' },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div id="qr" class="qr-container">
    <QrcodeVue
      :value="value"
      :size="size"
      level="H"
      :background="background"
      :foreground="foreground"
      class="qr-style"
    />
  </div>
</template>

<style scoped>
.qr-container {
  height: 250px;
  width: 250px;
  background-color: var(--azul-qr);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.qr-style {
  display: block;
}
</style>
