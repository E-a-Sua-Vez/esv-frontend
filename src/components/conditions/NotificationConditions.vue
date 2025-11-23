<script>
import NotificationConditionsEN from './domain/NotificationConditionsEN.vue';
import NotificationConditionsES from './domain/NotificationConditionsES.vue';
import NotificationConditionsPT from './domain/NotificationConditionsPT.vue';
export default {
  components: { NotificationConditionsES, NotificationConditionsPT, NotificationConditionsEN },
  name: 'NotificationConditions',
  data() {
    return {
      locale: this.$i18n.locale || 'es',
    };
  },
};
</script>

<template>
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8">
        <h2 class="portfolio-modal-title mb-0">{{ $t('notificationConditions.title') }}</h2>
        <div class="divider-custom">
          <div class="divider-custom-line"></div>
          <div class="divider-custom-icon"><i class="bi bi-book"></i></div>
          <div class="divider-custom-line"></div>
        </div>
        <p class="mb-4 details">
          <span class="fw-bold">{{ $t('notificationConditions.subtitle.1') }}</span>
          {{ $t('notificationConditions.subtitle.2') }}
        </p>
        <p>Actualizado el 2023-08-01</p>
        <div v-if="this.$i18n.locale === 'es'">
          <NotificationConditionsES> </NotificationConditionsES>
        </div>
        <div v-if="this.$i18n.locale === 'pt'">
          <NotificationConditionsPT> </NotificationConditionsPT>
        </div>
        <div v-if="this.$i18n.locale === 'en'">
          <NotificationConditionsEN> </NotificationConditionsEN>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.details {
  line-height: normal;
}
.text {
  overflow-y: scroll;
  height: 400px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  text-align: justify;
  text-justify: inter-word;
}
</style>
