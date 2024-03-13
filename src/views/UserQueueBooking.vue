<script>
import { ref, reactive, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { getBookingDetails, cancelBooking } from '../application/services/booking';
import { getPermissions } from '../application/services/permissions';
import Message from '../components/common/Message.vue';
import AttentionNumber from'../components/common/AttentionNumber.vue';
import QueueName from '../components/common/QueueName.vue';
import PoweredBy from '../components/common/PoweredBy.vue';
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
    PoweredBy,
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
    AreYouSure
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      booking: {},
      queue: {},
      commerce: {},
      user: {},
      beforeYou: ref(0),
      estimatedTime: ref("00:01"),
      goToCancel: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        await getBookingDetailsFromService(id);
        state.toggles = await getPermissions('user');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const getEstimatedTime = () => {
      const totalMinutes = (state.booking.beforeYou) * state.queue.estimatedTime;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return estimatedTime;
    }

    const getBeforeYou = () => {
      const beforeYou = state.booking.beforeYou;
      return beforeYou;
    }

    const getBookingDetailsFromService = async (id) => {
      try {
        state.booking = await getBookingDetails(id);
        state.queue = state.booking.queue;
        state.commerce = state.booking.commerce;
        if (state.booking.status === 'PROCESSED' && state.booking.attentionId) {
          router.push({ path: `/interno/fila/${state.queue.id}/atencion/${state.booking.attentionId}` });
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };
    const bookingActive = () => {
      return state.booking.status === 'PENDING' || state.booking.status === 'PROCESSED';
    };
    const getCreatedAt = (createdAt, timeZoneIn) => {
      const dateCorrected = new Date(
      new Date(createdAt).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected.toLocaleString("en-GB");
    }
    const backToCommerceQueues = () => {
      router.push({ path: `/interno/comercio/${state.commerce.keyName}` })
    }
    const bookingCancelled = () => {
      return state.booking.status === 'RESERVE_CANCELLED';
    }
    const goToCancel = () => {
      state.goToCancel = !state.goToCancel;
    }
    const cancelCancel = () => {
      state.goToCancel = false;
    }
    const cancellingBooking = async () => {
      try {
        loading.value = true;
        if (state.booking.status === "PENDING") {
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
    }

    return {
      id,
      state,
      loading,
      alertError,
      bookingCancelled,
      goToCancel,
      cancelCancel,
      cancellingBooking,
      backToCommerceQueues,
      getCreatedAt,
      bookingActive,
      getEstimatedTime,
      getBeforeYou
    }
  }

}
</script>
<template>
  <div>
    <div  class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <QueueName :queue="state.queue"></QueueName>
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
      <div v-if="!loading">
        <div id="page-header" class="text-center mt-4">
          <div>
            <div class="welcome">
              <span>{{ $t("userQueueBooking.hello") }}</span>
            </div>
          </div>
        </div>
        <div id="booking">
          <div id="booking-cancelled" v-if="bookingCancelled()">
            <div class="your-booking mt-2">
              <span>{{ $t("userQueueBooking.cancelledTitle") }} <strong>{{ $t("userQueueBooking.cancelled") }}</strong></span>
            </div>
            <AttentionNumber
              :number="state.booking.number"
              :type="'secondary'"
              :data="state.booking.user"
            >
            </AttentionNumber>
            <Message
              :title="$t('userQueueBooking.message.1.title')"
              :content="$t('userQueueBooking.message.1.content')"
              :icon="'bi bi-emoji-dizzy'">
            </Message>
            <div class="to-goal">
              <div class="mt-2">
                <div class="mt-2">
                  <button
                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                    @click="backToCommerceQueues()">
                    {{ $t("userQueueBooking.actions.5.action") }} <i class="bi bi-arrow-left"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="booking active" v-else>
            <div class="your-booking mt-2">
              <span class="fw-bold">{{ $t("userQueueBooking.yourNumber") }}</span>
            </div>
            <AttentionNumber
              :number="state.booking.number"
              :data="state.booking.user"
            ></AttentionNumber>
            <div id="booking-data" class="to-goal">
              <div class="booking-details-container">
                <div class="col-6 booking-details-card">
                  <span class="booking-details-title"> {{ $t("userQueueBooking.toGoal.1") }}* </span><br>
                  <span class="booking-details-content"> <i class="bi bi-person"></i> {{ getBeforeYou() }} </span><br>
                </div>
                <div v-if="state.booking.block && state.booking.block.hourFrom" class="col-6 booking-details-card">
                  <span class="booking-details-title"> {{ $t("userQueueBooking.blockInfo") }}</span><br>
                  <strong>{{ state.booking.block.hourFrom }} - {{ state.booking.block.hourTo }}</strong>
                </div>
                <div v-else-if="state.beforeYou >= 0" class="col-6 booking-details-card">
                  <span class="booking-details-title"> {{ $t("userQueueBooking.estimatedTime") }}* </span><br>
                  <span class="booking-details-content"> <i class="bi bi-stopwatch"></i> {{ getEstimatedTime() }} </span> <br>
                </div>
              </div>
            </div>
            <div id="booking-important" class="to-goal">
              <div class="booking-details-sound mt-2">
                <div class="">
                  <div class="booking-notification-content">
                    <i class="bi bi-exclamation-triangle-fill"></i> <span class="fw-bold"> {{ $t("userQueueBooking.important") }} </span>
                  </div>
                  <div class="booking-notification-title">
                    {{ $t("userQueueBooking.shouldCome") }}
                    <h6>
                      <span
                        class="badge rounded-pill bg-secondary py-2 px-2 fw-bold m-1">{{ state.booking.date }}
                      </span>
                    </h6>
                  </div>
                  <div
                    v-if="state.commerce.serviceInfo && state.commerce.serviceInfo.attentionHourFrom"
                    class="booking-notification-title">
                    {{ $t("userQueueBooking.operationStart") }}
                    <strong>{{ state.commerce.serviceInfo.attentionHourFrom }}:00</strong>
                  </div>
                  <div
                    class="booking-notification-title mt-2">
                    {{ $t("userQueueBooking.advice") }}
                  </div>
                  <hr>
                  <div v-if="state.commerce.serviceInfo || state.commerce.contactInfo"
                    class="booking-notification-title mb-2">
                    {{ $t("userQueueBooking.commerceDetails") }}
                  </div>
                  <div class="col-10 col-md-12 centered mb-2">
                    <CommerceContactInfo :commerce="state.commerce"></CommerceContactInfo>
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
                {{ $t("userQueueBooking.cancel") }}
              </button>
              <AreYouSure
                :show="state.goToCancel"
                :yesDisabled="!bookingCancelled()"
                :noDisabled="!bookingCancelled()"
                @actionYes="cancellingBooking()"
                @actionNo="cancelCancel()"
              >
              </AreYouSure>
            </div>
            <Message
              :title="$t('userQueueBooking.actions.2.action')"
              :content="$t('userQueueBooking.actions.2.title.1')"
              :icon="'bi bi-camera-fill'">
            </Message>
          </div>
          <div class="row booking-details-container">
            <div class="booking-details-date booking-details-data">
              <span><strong>{{ getCreatedAt(state.booking.createdAt, state.commerce.localeInfo ? state.commerce.localeInfo.timezone : 'America/Santiago') }}</strong></span><br>
              <span><strong>Id:</strong> {{ state.booking.id }}</span>
            </div>
          </div>
        </div>
      </div>
      <div>
    </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
  </div>
</template>

<style scoped>
.booking-details-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-left: .1rem;
  margin-right: .1rem;
  margin-bottom: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  height: 4.6rem;
}
.booking-shortly-details-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-left: .4rem;
  margin-right: .4rem;
  margin-bottom: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  height: 4.6rem;
}
.booking-details-date {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
}
.booking-details-sound {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .3rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  margin-bottom: .5rem;
}
.booking-details-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: .4rem;
  margin-right: .4rem;
  margin-top: .5rem;
  margin-bottom: 0rem;
}
.booking-details-title {
  font-size: .7rem;
  line-height: .8rem !important;
}
.booking-details-content {
  font-size: 1.1rem;
  line-height: 1rem;
  font-weight: 700;
}
.booking-details-message {
  line-height: 1rem;
  padding-top: 1rem;
  font-weight: 700;
  margin-block-start: .2rem;
}
.booking-details-data {
  font-size: .9rem;
}
.booking-sound {
  font-size: .8rem;
  line-height: 1.1rem;
}
.booking-notification-title {
  font-size: .8rem;
  line-height: 1rem;
  padding: .2rem;
}
.parpadea {
  animation-name: parpadeo;
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;

  -webkit-animation-name:parpadeo;
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
  font-size: .6rem;
  line-height: .8rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}
@-moz-keyframes parpadeo{
  0% { opacity: 1.0; }
  50% { opacity: 0.0; }
  100% { opacity: 1.0; }
}

@-webkit-keyframes parpadeo {
  0% { opacity: 1.0; }
  50% { opacity: 0.0; }
   100% { opacity: 1.0; }
}

@keyframes parpadeo {
  0% { opacity: 1.0; }
   50% { opacity: 0.0; }
  100% { opacity: 1.0; }
}
</style>