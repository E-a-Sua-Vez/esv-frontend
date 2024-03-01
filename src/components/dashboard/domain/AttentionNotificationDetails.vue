<script>

export default {
  name: 'AttentionNotificationDetails',
  props: {
    show: { type: Boolean, default: true },
    count: { type: [String, Number], default: 0 },
    booking: { type: [String, Number], default: 0 },
    waitlist: { type: [String, Number], default: 0 },
    channels: { type: Object, default: {} },
    types: { type: Object, default: {} }
  },
  data() {
    return { }
  },
  methods: { },
}
</script>

<template>
  <div v-if="show">
    <div class="row">
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-whatsapp h4 fw-bold green-icon m-1"></i>
          {{ $t('dashboard.items.attentions.10') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ channels.WHATSAPP || 0 }}</span>
        </div>
      </div>
      <div class="col-6">
        <div class="metric-card-title">
          <i class="bi bi-envelope-fill h4 fw-bold red-icon m-1"></i>
          {{ $t('dashboard.items.attentions.11') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ channels.EMAIL || 0 }}</span>
        </div>
      </div>
    </div>
    <hr>
    <div class="row mt-2">
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-qr-code h4 fw-bold blue-icon m-1"></i>
          {{ $t('dashboard.items.attentions.19') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ count || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-calendar2-check-fill h4 fw-bold orange-icon m-1"></i>
          {{ $t('dashboard.bookings') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ booking || types.BOOKING || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-calendar-heart-fill h4 fw-bold red-icon m-1"></i>
          {{ $t('dashboard.waitlist') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ waitlist || types.WAITLIST || 0 }}</span>
        </div>
      </div>
    </div>
    <hr>
    <div class="row mt-2">
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-5-circle-fill h4 fw-bold blue-icon m-1"></i>
          {{ $t('dashboard.items.attentions.13') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.FALTANCINCO || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-1-circle-fill h4 fw-bold blue-icon m-1"></i>
          {{ $t('dashboard.items.attentions.14') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.FALTAUNO || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-bell-fill h4 fw-bold green-icon m-1"></i>
          {{ $t('dashboard.items.attentions.15') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.ESTUTURNO || 0 }}</span>
        </div>
      </div>
    </div>
    <hr>
    <div class="row mt-1">
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-star-fill h4 fw-bold blue-icon m-1"></i>
          {{ $t('dashboard.items.attentions.12') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.TUTURNO || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-star-fill h4 fw-bold yellow-icon m-1"></i>
          {{ $t('dashboard.items.attentions.25') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.ENCUESTA || 0 }}</span>
        </div>
      </div>
      <div class="col-4">
        <div class="metric-card-title">
          <i class="bi bi-calendar2-check-fill h4 fw-bold orange-icon m-1"></i>
          {{ $t('dashboard.bookingsConfirm') }}
        </div>
        <div class="centered">
          <span class="h5 fw-bold">{{ types.BOOKING_CONFIRM || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: .8rem;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
</style>