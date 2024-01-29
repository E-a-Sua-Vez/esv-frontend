<script>
export default {
  name: 'Spinner',
  props: {
    show: { type: Boolean, default: false },
    ligth: { type: Boolean, default: false }
  },
  data() {
    return {}
  },
}
</script>

<template>
  <div v-if="!ligth" class="text-center">
    <div v-if="show" class="spinner-border my-2" style="width: 3rem; height: 3rem;" role="status"> </div>
  </div>
  <div v-else class="text-left">
    <div class="spinner-border spinner-border text-light my-2" style="width: 2rem; height: 2rem;" role="status"> </div>
  </div>
</template>