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
    <div class="logo-container">
      <img
        class="rounded img-fluid mx-auto logo-powered"
        :src="$t('logoPoweredBy')"
        alt="Powered by É a sua Vez"
        loading="lazy"
        width="120"
        height="auto"
      />
    </div>
  </div>
</template>

<style scoped>
.logo-container {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.logo-powered {
  display: flex;
  width: 120px;
  max-width: 100%;
  height: auto;
  background-repeat: no-repeat;
  background-size: contain;
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
