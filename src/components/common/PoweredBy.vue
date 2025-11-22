<script>
export default {
  name: 'PoweredBy',
  props: {
    name: { type: String, default: '' },
    logo: { type: String, default: '/images/estuturno_logo_powered.png' },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div id="powered" class="powered text-center mt-4">
    <div class="name">
      <span>{{ name }}</span>
    </div>
    <div class="mt-2">
      <span>{{ $t('poweredBy') }}</span>
    </div>
    <div>
      <img class="rounded img-fluid mx-auto logo-powered" :src="$t('logoPoweredBy')" />
    </div>
  </div>
</template>

<style scoped>
.logo-powered {
  display: flex;
  width: 70px;
  background-repeat: no-repeat;
  background-size: 100%;
}
.powered {
  padding: 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 0.7rem;
}
.name {
  padding-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
}
</style>
