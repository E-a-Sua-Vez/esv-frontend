<script>

export default {
  name: 'NotFound',
  data() {
    return {}
  }
}
</script>

<template>
  <div class="masthead">
    <div class="text-center">
      <img class="rounded img-fluid mx-auto logo d-block d-md-none" src="/images/no_encontrado_transparente_mobile.png">
      <img class="rounded img-fluid mx-auto logo d-none d-md-block" src="/images/no_encontrado_transparente_desktop.png">
      <a href="/" class="btn btn-md btn-size fw-bold btn-dark rounded-pill mt-2 mb-2 px-4">{{ $t("backToInit") }} <i class="bi bi-arrow-left"></i></a>
    </div>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  width: 500px;
  background-repeat: no-repeat;
  background-size: 100%;
}
@media (min-width: 1024px) {
  .logo {
    width: 600px;
    background-position: center;
  }
}
</style>