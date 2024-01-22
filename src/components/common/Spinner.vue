<script>
export default {
  name: 'Spinner',
  props: {
    show: { type: Boolean, default: false }
  },
  data() {
    return {}
  },
}
</script>

<template>
  <div class="text-center">
    <div v-if="show" class="spinner-border my-2" style="width: 3rem; height: 3rem;" role="status"> </div>
  </div>
</template>