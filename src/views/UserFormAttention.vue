<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPermissions } from '../application/services/permissions';
import { getFormPersonalizedById } from '../application/services/form-personalized';
import { getFormsByClientAndType } from '../application/services/form';
import { getBookingDetails } from '../application/services/booking';
import { getAttentionDetails } from '../application/services/attention';
import Message from '../components/common/Message.vue';
import AttentionSurvey from '../components/domain/AttentionSurvey.vue';
import QueueName from '../components/common/QueueName.vue';
import AttentionNumber from '../components/common/AttentionNumber.vue';
import QR from '../components/common/QR.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import ClientNotifyData from '../components/domain/ClientNotifyData.vue';
import ClientEmailNotifyData from '../components/domain/ClientEmailNotifyData.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import AreYouSure from '../components/common/AreYouSure.vue';
import FormDisplay from '../components/domain/FormDisplay.vue';

export default {
  name: 'UserFormAttention',
  components: {
    AreYouSure,
    QR,
    CommerceLogo,
    ClientNotifyData,
    ClientEmailNotifyData,
    QueueName,
    AttentionNumber,
    AttentionSurvey,
    Message,
    Spinner,
    Alert,
    FormDisplay,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { clientId, formId, attentionId, bookingId } = route.params;

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      formFullfilled: false,
      commerce: ref({}),
      booking: ref({}),
      attention: ref({}),
      queue: ref({}),
      form: ref({}),
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.form = await getFormPersonalizedById(formId);
        if (bookingId) {
          await getBookingDetailsFromService(bookingId);
        } else if (attentionId) {
          await getAttentionDetailsFromService(attentionId);
        }
        if (state.form && state.form.id && state.booking && state.booking.id) {
          const forms = await getFormsByClientAndType(state.commerce.id, clientId, state.form.type);
          const filteredForms = forms.filter(form => form.bookingId === bookingId);
          if (filteredForms && filteredForms.length > 0) {
            state.formFullfilled = true;
          }
        } else if (state.form && state.form.id && state.attention && state.attention.id) {
          const forms = await getFormsByClientAndType(state.commerce.id, clientId, state.form.type);
          const filteredForms = forms.filter(form => form.attentionId === attentionId);
          if (filteredForms && filteredForms.length > 0) {
            state.formFullfilled = true;
          }
        }
        state.toggles = await getPermissions('user');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const getBookingDetailsFromService = async id => {
      loading.value = true;
      try {
        state.booking = await getBookingDetails(id);
        state.queue = state.booking.queue;
        state.commerce = state.booking.commerce;
      } catch (error) {
        loading.value = false;
      }
    };

    const getAttentionDetailsFromService = async id => {
      loading.value = true;
      try {
        state.attention = await getAttentionDetails(id);
        state.queue = state.attention.queue;
        state.commerce = state.attention.commerce;
      } catch (error) {
        loading.value = false;
      }
    };

    const backToBooking = () => {
      if (bookingId) {
        router.push({ name: 'commerce-queue-booking', params: { id: bookingId } });
      }
    };

    const backToAttention = () => {
      if (attentionId && state.queue) {
        router.push({
          name: 'commerce-queue-attention',
          params: { id: attentionId, queueId: state.queue.id },
        });
      }
    };

    return {
      state,
      clientId,
      formId,
      attentionId,
      bookingId,
      loading,
      alertError,
      backToBooking,
      backToAttention,
    };
  },
};
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :business-id="state.commerce.businessId" :loading="loading" :large-size="true"></CommerceLogo>
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
          <div>
            <div class="fw-bold" v-if="!state.formFullfilled">
              <span>{{ $t('userFormAttention.title') }}</span>
            </div>
            <div class="fw-bold" v-else>
              <span>{{ $t('userFormAttention.fullfilled') }}</span>
            </div>
          </div>
        </div>
        <div id="survey" v-if="!state.formFullfilled">
          <FormDisplay
            :form-personalized="state.form"
            :client-id="clientId"
            :attention-id="attentionId"
            :booking-id="bookingId"
            :commerce-id="state.commerce.id"
            :queue-id="state.queue.id"
          >
          </FormDisplay>
        </div>
        <div v-else>
          <Message
            :title="$t('attentionForm.message.1.title')"
            :content="$t('attentionForm.message.1.content')"
            :icon="'bi bi-emoji-sunglasses'"
          >
          </Message>
          <a
            v-if="bookingId"
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="backToBooking()"
          >
            {{ $t('attentionForm.actions.2.action') }} <i class="bi bi-arrow-left"></i>
          </a>
          <a
            v-else-if="attentionId"
            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
            @click="backToAttention()"
          >
            {{ $t('attentionForm.actions.3.action') }} <i class="bi bi-arrow-left"></i>
          </a>
        </div>
      </div>
      <div></div>
    </div>
  </div>
</template>

<style scoped>
.attention-details-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-left: 0.1rem;
  margin-right: 0.1rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  height: 4.6rem;
}
.attention-shortly-details-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  height: 4.6rem;
}
.attention-details-date {
  background-color: var(--color-background);
  padding: 0.2rem;
  margin: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}
.attention-details-sound {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.3rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  margin-bottom: 0.5rem;
}
.attention-details-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  margin-top: 0.5rem;
  margin-bottom: 0rem;
}
.attention-details-title {
  font-size: 0.7rem;
  line-height: 0.8rem !important;
}
.attention-details-content {
  font-size: 1.1rem;
  line-height: 1rem;
  font-weight: 700;
}
.attention-details-message {
  line-height: 1rem;
  padding-top: 1rem;
  font-weight: 700;
  margin-block-start: 0.2rem;
}
.attention-details-data {
  font-size: 0.9rem;
}
.attention-sound {
  font-size: 0.8rem;
  line-height: 1.1rem;
}
.attention-notification-title {
  font-size: 0.8rem;
  line-height: 1rem;
  padding: 0.2rem;
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
