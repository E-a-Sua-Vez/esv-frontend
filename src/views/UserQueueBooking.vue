<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getBookingDetails,
  cancelBooking,
  acceptBookingTermsAndConditions,
} from '../application/services/booking';
import { getFormsByClient } from '../application/services/form';
import { getFormPersonalizedByCommerceId } from '../application/services/form-personalized';
import { getPermissions } from '../application/services/permissions';
import { getDate } from '../shared/utils/date';
import { globalStore } from '../stores';
import { getActiveFeature } from '../shared/features';
import { BOOKING_STATUS, USER_TYPES } from '../shared/constants';
import Message from '../components/common/Message.vue';
import AttentionNumber from '../components/common/AttentionNumber.vue';
import QueueName from '../components/common/QueueName.vue';
import QR from '../components/common/QR.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import ClientNotifyData from '../components/domain/ClientNotifyData.vue';
import ClientEmailNotifyData from '../components/domain/ClientEmailNotifyData.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import CommerceContactInfo from '../components/domain/CommerceContactInfo.vue';
import AreYouSure from '../components/common/AreYouSure.vue';

export default {
  name: 'UserQueueBooking',
  components: {
    QR,
    CommerceLogo,
    ClientNotifyData,
    ClientEmailNotifyData,
    QueueName,
    AttentionNumber,
    Message,
    Spinner,
    Alert,
    CommerceContactInfo,
    AreYouSure,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id, code } = route.params;

    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      booking: {},
      queue: {},
      commerce: {},
      user: {},
      formsPersonalized: [],
      showFormButton: false,
      formFirstAttentionCompleted: false,
      formPreAttentionCompleted: false,
      form: undefined,
      beforeYou: ref(0),
      estimatedTime: ref('00:01'),
      goToCancel: false,
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (code) {
          await acceptBookingTermsAndConditions(id, code);
        }
        await getBookingDetailsFromService(id);
        state.formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
        await getFormCompleted();
        state.toggles = await getPermissions('user');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const getEstimatedTime = () => {
      const totalMinutes = state.booking.beforeYou * state.queue.estimatedTime;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
      return estimatedTime;
    };

    const getBeforeYou = () => {
      const beforeYou = state.booking.beforeYou;
      return beforeYou;
    };

    const getBookingDetailsFromService = async id => {
      try {
        state.booking = await getBookingDetails(id);
        state.queue = state.booking.queue;
        state.commerce = state.booking.commerce;
        if (state.booking.status === 'PROCESSED' && state.booking.attentionId) {
          const user = store.getCurrentUserType;
          if (user && user === USER_TYPES.COLLABORATOR) {
            router.push({
              name: 'collaborator-queue-attention',
              params: { queueId: state.queue.id, id: state.booking.attentionId },
            });
          } else {
            router.push({
              name: 'commerce-queue-attention',
              params: { queueId: state.queue.id, id: state.booking.attentionId },
            });
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const bookingActive = () =>
      state.booking.status === BOOKING_STATUS.PENDING ||
      state.booking.status === BOOKING_STATUS.CONFIRMED ||
      state.booking.status === 'PROCESSED'; // Note: PROCESSED is not in constants yet

    const getCreatedAt = (createdAt, timeZoneIn) => {
      const dateCorrected = new Date(
        new Date(createdAt).toLocaleString('en-US', {
          timeZone: timeZoneIn,
        })
      );
      return dateCorrected.toLocaleString('en-GB');
    };

    const backToCommerceQueues = () => {
      router.push({ path: `/interno/comercio/${state.commerce.keyName}` });
    };

    const bookingCancelled = () => state.booking.status === 'RESERVE_CANCELLED';

    const goToCancel = () => {
      state.goToCancel = !state.goToCancel;
    };

    const cancelCancel = () => {
      state.goToCancel = false;
    };

    const cancellingBooking = async () => {
      try {
        loading.value = true;
        if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(state.booking.status)) {
          await cancelBooking(state.booking.id);
          await getBookingDetailsFromService(state.booking.id);
          state.goToCancel = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const getForm = (type, queueId, servicesId) => {
      if (state.formsPersonalized && state.formsPersonalized.length > 0 && type) {
        const filteredForms = state.formsPersonalized.filter(form => form.type === type);
        if (filteredForms && filteredForms.length > 0) {
          if (queueId) {
            const result = state.formsPersonalized.filter(
              form => form.queueId === queueId && form.type === type
            );
            if (result.length === 0) {
              return state.formsPersonalized.filter(form => form.type === type)[0];
            }
            return result;
          } else if (servicesId && servicesId.length > 0) {
            const result = state.formsPersonalized.filter(
              form => servicesId.includes(form.servicesId) && form.type === type
            );
            if (result.length === 0) {
              return state.formsPersonalized.filter(form => form.type === type)[0];
            }
            return result;
          } else {
            return state.formsPersonalized.filter(form => form.type === type)[0];
          }
        }
      }
      return undefined;
    };

    const getFormCompleted = async () => {
      if (state.booking && state.booking.id && state.booking.user && state.booking.user.clientId) {
        const forms = await getFormsByClient(state.commerce.id, state.booking.user.clientId);
        const attentionFilteredForms = forms.filter(form => form.bookingId === state.booking.id);
        if (forms && forms.length > 0) {
          if (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT')) {
            const filteredForms = forms.filter(form => form.type === 'FIRST_ATTENTION');
            if (filteredForms && filteredForms.length > 0) {
              state.formFirstAttentionCompleted = true;
            }
          }
          if (getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')) {
            const filteredForms = attentionFilteredForms.filter(
              form => form.type === 'PRE_ATTENTION'
            );
            if (filteredForms && filteredForms.length > 0) {
              if (attentionFilteredForms && attentionFilteredForms.length > 0) {
                state.formPreAttentionCompleted = true;
              }
            }
          }
        }
        // Solo llena formulario la primera vez
        if (
          getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          !getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          if (!state.formFirstAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm(
              'FIRST_ATTENTION',
              state.booking.queueId,
              state.booking.servicesId
            );
          }
          // Llena formulario siempre
        } else if (
          !getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          if (!state.formPreAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm('PRE_ATTENTION', state.booking.queueId, state.booking.servicesId);
          }
          // llena un formulario la primera vez y otro distinto para el resto
        } else if (
          getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          const formFirstAttention = getForm(
            'FIRST_ATTENTION',
            state.booking.queueId,
            state.booking.servicesId
          );
          const formPreAttention = getForm(
            'PRE_ATTENTION',
            state.booking.queueId,
            state.booking.servicesId
          );
          if (!state.formFirstAttentionCompleted && formFirstAttention) {
            state.showFormButton = true;
            state.form = formFirstAttention;
          } else if (!state.formPreAttentionCompleted && formFirstAttention) {
            state.showFormButton = true;
            state.form = formFirstAttention;
          } else if (
            !state.formFirstAttentionCompleted &&
            !state.formPreAttentionCompleted &&
            !formFirstAttention &&
            formPreAttention
          ) {
            state.showFormButton = true;
            state.form = formPreAttention;
          } else if (!state.formPreAttentionCompleted && formPreAttention) {
            state.showFormButton = true;
            state.form = formPreAttention;
          } else {
            state.showFormButton = false;
          }
        } else {
          state.showFormButton = false;
        }
      }
    };

    const goToForm = async () => {
      if (
        state.form &&
        state.form.id &&
        state.booking &&
        state.booking.user &&
        state.booking.user.clientId
      ) {
        const url = `/interno/form/${state.form.id}/client/${state.booking.user.clientId}/booking/${state.booking.id}`;
        router.push({ path: url });
      }
    };

    return {
      id,
      state,
      loading,
      alertError,
      getActiveFeature,
      getDate,
      bookingCancelled,
      goToCancel,
      cancelCancel,
      cancellingBooking,
      backToCommerceQueues,
      getCreatedAt,
      bookingActive,
      getEstimatedTime,
      getBeforeYou,
      goToForm,
    };
  },
};
</script>
<template>
  <div>
    <div class="content text-center">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
          <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
          <QueueName :queue="state.queue"></QueueName>
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
          <div v-if="!loading">
            <div id="page-header" class="text-center mt-4">
              <div>
                <div class="welcome">
                  <span>{{ $t('userQueueBooking.hello') }}</span>
                </div>
              </div>
            </div>
            <div id="booking">
              <div id="booking-cancelled" v-if="bookingCancelled()">
                <div class="your-booking mt-2">
                  <span
                    >{{ $t('userQueueBooking.cancelledTitle') }}
                    <strong>{{ $t('userQueueBooking.cancelled') }}</strong></span
                  >
                </div>
                <AttentionNumber
                  :number="state.booking.number"
                  :type="'secondary'"
                  :show-data="false"
                >
                </AttentionNumber>
                <Message
                  :title="$t('userQueueBooking.message.1.title')"
                  :content="$t('userQueueBooking.message.1.content')"
                  :icon="'bi bi-emoji-dizzy'"
                >
                </Message>
                <div class="to-goal">
                  <div class="mt-2">
                    <div class="mt-2">
                      <button
                        class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                        @click="backToCommerceQueues()"
                      >
                        {{ $t('userQueueBooking.actions.5.action') }}
                        <i class="bi bi-arrow-left"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="booking active" v-else>
                <div class="your-booking mt-2">
                  <span class="fw-bold">{{ $t('userQueueBooking.yourNumber') }}</span>
                </div>
                <AttentionNumber
                  :number="state.booking.number"
                  :show-data="false"
                ></AttentionNumber>
                <div id="booking-data" class="to-goal">
                  <div class="row g-2 booking-details-container">
                    <div v-if="state.booking.date" class="col-6 booking-details-card">
                      <div class="booking-card-content">
                        <span class="booking-details-title">
                          {{ $t('userQueueBooking.shouldCome') }}</span
                        >
                        <strong>{{ getDate(state.booking.date) }}</strong>
                      </div>
                    </div>
                    <div
                      v-if="state.booking.block && state.booking.block.hourFrom"
                      class="col-6 booking-details-card"
                    >
                      <div class="booking-card-content">
                        <span class="booking-details-title">
                          {{ $t('userQueueBooking.blockInfo') }}</span
                        >
                        <strong
                          >{{ state.booking.block.hourFrom }} -
                          {{ state.booking.block.hourTo }}</strong
                        >
                      </div>
                    </div>
                    <div
                      v-else-if="state.beforeYou >= 0 && state.booking.date"
                      class="col-6 booking-details-card"
                    >
                      <div class="booking-card-content">
                        <span class="booking-details-title">
                          {{ $t('userQueueBooking.estimatedTime') }}*
                        </span>
                        <span class="booking-details-content">
                          <i class="bi bi-stopwatch"></i> {{ getEstimatedTime() }}
                        </span>
                      </div>
                    </div>
                    <div
                      v-else-if="state.beforeYou >= 0 && !state.booking.date"
                      class="col-12 booking-details-card"
                    >
                      <span class="booking-details-title">
                        {{ $t('userQueueBooking.estimatedTime') }}* </span
                      ><br />
                      <span class="booking-details-content">
                        <i class="bi bi-stopwatch"></i> {{ getEstimatedTime() }}
                      </span>
                    </div>
                  </div>
                </div>
                <div id="booking-important" class="to-goal">
                  <div class="booking-details-sound mt-2">
                    <div class="">
                      <div class="booking-notification-content">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <span class="fw-bold"> {{ $t('userQueueBooking.important') }} </span>
                      </div>
                      <div class="booking-notification-title" hidden>
                        {{ $t('userQueueBooking.shouldCome') }}
                        <h6>
                          <span class="badge rounded-pill bg-secondary py-2 px-2 fw-bold m-1"
                            >{{ getDate(state.booking.date) }}
                          </span>
                        </h6>
                      </div>
                      <div
                        v-if="
                          state.commerce.serviceInfo && state.commerce.serviceInfo.attentionHourFrom
                        "
                        class="booking-notification-title"
                      >
                        {{ $t('userQueueBooking.operationStart') }}
                        <strong>{{ state.commerce.serviceInfo.attentionHourFrom }}:00</strong>
                      </div>
                      <div class="booking-notification-title mt-2">
                        {{ $t('userQueueBooking.advice') }}
                      </div>
                      <hr />
                      <div
                        id="form-process"
                        class="to-goal"
                        v-if="
                          state.showFormButton &&
                          state.form &&
                          (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') ||
                            getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT'))
                        "
                      >
                        <div class="booking-notification-title">
                          <span>{{ $t('userQueueBooking.fillPreAttention') }}</span>
                        </div>
                        <button
                          type="button"
                          class="btn-size btn btn-lg btn-block col-9 fw-bold btn-primary rounded-pill mt-2 mb-1"
                          v-if="state.showFormButton"
                          @click="goToForm()"
                        >
                          {{ $t('userQueueBooking.preAttention') }}
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        <hr />
                      </div>
                      <div class="container-commerce centered">
                        <div class="col-10 mb-2">
                          <CommerceContactInfo :commerce="state.commerce"></CommerceContactInfo>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div id="cancel-process" class="to-goal">
                  <button
                    type="button"
                    class="btn-size btn btn-lg btn-block col-9 fw-bold btn-danger rounded-pill mt-2 mb-1"
                    @click="goToCancel()"
                    :disabled="bookingCancelled() || !state.toggles['user.bookings.cancel']"
                  >
                    {{ $t('userQueueBooking.cancel') }} <i class="bi bi-x-circle-fill"></i>
                  </button>
                  <AreYouSure
                    :show="state.goToCancel"
                    :yes-disabled="!bookingCancelled()"
                    :no-disabled="!bookingCancelled()"
                    @actionYes="cancellingBooking()"
                    @actionNo="cancelCancel()"
                  >
                  </AreYouSure>
                </div>
                <Message
                  :title="$t('userQueueBooking.actions.2.action')"
                  :content="$t('userQueueBooking.actions.2.title.1')"
                  :icon="'bi bi-camera-fill'"
                >
                </Message>
              </div>
              <div class="row booking-details-container">
                <div class="booking-details-date booking-details-data">
                  <span
                    ><strong>{{
                      getCreatedAt(
                        state.booking.createdAt,
                        state.commerce.localeInfo
                          ? state.commerce.localeInfo.timezone
                          : 'America/Santiago'
                      )
                    }}</strong></span
                  ><br />
                  <span><strong>Id:</strong> {{ state.booking.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  </div>
</template>

<style scoped>
.booking-details-card {
  background-color: var(--color-background);
  padding: 0.75rem 0.5rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  min-height: 5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.booking-card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
}
.booking-shortly-details-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  height: 4.6rem;
}
.booking-details-date {
  background-color: var(--color-background);
  padding: 0.2rem;
  margin: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}
.booking-details-sound {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.3rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  margin-bottom: 0.5rem;
}
.booking-details-container {
  margin-top: 0.5rem;
  margin-bottom: 0rem;
  margin-left: 0;
  margin-right: 0;
}
.booking-details-title {
  font-size: 0.75rem;
  line-height: 1rem !important;
  margin-bottom: 0;
}
.booking-details-content {
  font-size: 1.5rem;
  line-height: 1.4rem;
  font-weight: 700;
}
.booking-details-card strong {
  font-size: 1.5rem;
  line-height: 1.4rem;
  font-weight: 700;
}
.booking-details-message {
  line-height: 1rem;
  padding-top: 1rem;
  font-weight: 700;
  margin-block-start: 0.2rem;
}
.booking-details-data {
  font-size: 0.9rem;
}
.booking-sound {
  font-size: 0.8rem;
  line-height: 1.1rem;
}
.booking-notification-title {
  font-size: 0.9rem;
  line-height: 1.2rem;
  padding: 0.2rem;
}

.booking-notification-title.mb-2 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.4rem;
}

.booking-notification-content {
  font-size: 1.1rem;
  line-height: 1.4rem;
  padding: 0.4rem 0.2rem;
  text-align: center;
  color: var(--rojo-warning);
}

/* Style for CommerceContactInfo component text */
:deep(.whatsapp-question) {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.4rem;
}

.parpadea {
  animation-name: parpadeo;
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;

  -webkit-animation-name: parpadeo;
  -webkit-animation-duration: 1s;
  -webkit-animation-timing-function: linear;
  -webkit-animation-iteration-count: infinite;
}
.to-goal {
  padding-bottom: 0rem !important;
  font-size: 1rem;
  font-weight: 400;
}
.test-sound {
  font-size: 0.6rem;
  line-height: 0.8rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}
.container-commerce {
  --bs-gutter-x: 1.5rem;
  --bs-gutter-y: 0;
  margin-top: calc(-1 * var(--bs-gutter-y));
  margin-left: calc(-1 * var(--bs-gutter-x));
  margin-right: calc(0 var(--bs-gutter-x));
}
@-moz-keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@-webkit-keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
