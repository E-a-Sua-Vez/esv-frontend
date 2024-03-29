<script>
import { ref, reactive, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { createBookingFromWaitlist } from '../application/services/booking';
import { getWaitlistDetails } from '../application/services/waitlist';
import Message from '../components/common/Message.vue';
import QueueName from '../components/common/QueueName.vue';
import PoweredBy from '../components/common/PoweredBy.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';

export default {
  name: 'UserQueueWaitlist',
  components: {
    PoweredBy,
    CommerceLogo,
    QueueName,
    Message,
    Spinner,
    Alert
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id, block } = route.params;

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      booking: {},
      queue: {},
      commerce: {},
      user: {},
      waitlist: {},
      bookingCreated: true,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.waitlist = await getWaitlistDetails(id);
        if (state.waitlist && state.waitlist.id) {
          state.queue = state.waitlist.queue;
          state.commerce = state.waitlist.commerce;
          if (state.waitlist.statue === 'PENDING') {
            const booking = await createBookingFromWaitlist(id, block);
            if (booking && booking.id) {
              state.bookingCreated = true;
              router.push({ path: `/interno/booking/${booking.id}` });
            } else {
              state.bookingCreated = false;
            }
          } else {
            state.bookingCreated = false;
          }
        } else {
          router.push({ path: `/not-found` });
        }
        loading.value = false;
      } catch (error) {
        state.bookingCreated = false;
        loading.value = false;
      }
    })

    const backToCommerceQueues = () => {
      router.push({ path: `/interno/comercio/${state.commerce.keyName}` })
    }

    return {
      id,
      state,
      loading,
      alertError,
      backToCommerceQueues
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
              <span>{{ $t("userQueueWaitlist.hello") }}</span>
            </div>
          </div>
        </div>
        <div id="booking">
          <div id="booking-cancelled" v-if="!state.bookingCreated">
            <Message
              :title="$t('userQueueWaitlist.message.1.title')"
              :content="$t('userQueueWaitlist.message.1.content')"
              :icon="'bi bi-emoji-dizzy'">
            </Message>
            <div class="to-goal">
              <div class="mt-2">
                <div class="mt-2">
                  <button
                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                    @click="backToCommerceQueues()">
                    {{ $t("userQueueWaitlist.actions.1.action") }} <i class="bi bi-arrow-left"></i>
                  </button>
                </div>
              </div>
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