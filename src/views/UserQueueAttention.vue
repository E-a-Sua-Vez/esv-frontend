<script>
import { ref, watch, reactive, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { getAttentionDetails, cancelAttention } from '../application/services/attention';
import { getCommerceById } from '../application/services/commerce';
import { getQueueById } from '../application/services/queue';
import { getUserById } from '../application/services/user';
import { getCollaboratorById } from '../application/services/collaborator';
import { getModuleById } from '../application/services/module';
import { updatedAttentions } from '../application/firebase';
import { updatedQueues } from '../application/firebase';
import { getPermissions } from '../application/services/permissions';
import Message from '../components/common/Message.vue';
import AttentionSurvey from'../components/domain/AttentionSurvey.vue';
import QueueName from '../components/common/QueueName.vue';
import AttentionNumber from'../components/common/AttentionNumber.vue';
import PoweredBy from '../components/common/PoweredBy.vue';
import QR from '../components/common/QR.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import ClientNotifyData from '../components/domain/ClientNotifyData.vue';
import ClientEmailNotifyData from '../components/domain/ClientEmailNotifyData.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import { useI18n } from 'vue-i18n';
import AreYouSure from '../components/common/AreYouSure.vue';

export default {
  name: 'UserQueueAttention',
  components: {
    AreYouSure,
    PoweredBy,
    QR,
    CommerceLogo,
    ClientNotifyData,
    ClientEmailNotifyData,
    QueueName,
    AttentionNumber,
    AttentionSurvey,
    Message,
    Spinner,
    Alert
  },
  async setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const { queueId, id } = route.params;

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      attention: {},
      queue: {},
      commerce: {},
      collaborator: {},
      module: {},
      user: {},
      survey: ref({}),
      beforeYou: ref(0),
      estimatedTime: ref("00:01"),
      soundEnabled: false,
      soundPlayed: false,
      goToCancel: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        await getAttentionDetailsFromService(id);
        state.queue = state.attention.queue;
        state.toggles = await getPermissions('user');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    let attentions = ref([]);
    attentions = updatedAttentions(id);
    let queues = ref([]);
    queues = updatedQueues(queueId);

    const getEstimatedTime = (totalMinutes) => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return estimatedTime;
    }

    const getAttentionDetailsFromService = async (id) => {
      try {
        state.attention = await getAttentionDetails(id);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getQueueAttentionValues = async (attention, oldAttention) => {
      if (attention && attention.id && attention.id !== oldAttention.id) {
        try {
          await getAttentionDetailsFromService(id);
          let attentionDetails = state.attention;
          if (attention.queueId) {
            state.queue = attentionDetails.queue;
            if (!attentionDetails.queue) {
              state.queue = await getQueueById(attention.queueId);
            }
            state.beforeYou = attention.number - state.queue.currentAttentionNumber;
            state.beforeYou = state.beforeYou < 0 ? 0 : state.beforeYou;
            const totalMinutes = (state.beforeYou) * state.queue.estimatedTime;
            state.estimatedTime = totalMinutes > 0 ? getEstimatedTime(totalMinutes) : getEstimatedTime(state.queue.estimatedTime);
            state.commerce = attentionDetails.commerce;
            if (!attentionDetails.commerce) {
              state.commerce = await getCommerceById(state.queue.commerceId);
            }
            if (state.commerce.surveys && state.commerce.surveys.length > 0) {
              const surveyQueue = state.commerce.surveys.filter(sv => sv.queueId === state.queue.id);
              if (surveyQueue.length > 0) {
                state.survey = surveyQueue[0];
              } else {
                const surveys = state.commerce.surveys.filter(sv => sv.attentionDefault === true);
                if (surveys.length > 0) {
                  state.survey = surveys[0];
                }
              }
            }
          }
          if (attention.userId !== undefined) {
            state.user = attentionDetails.user;
            if (!attentionDetails.user) {
              state.user = await getUserById(attention.userId);
            }
          }
          if (attention.collaboratorId !== undefined && (attention.collaboratorId !== oldAttention.collaboratorId)) {
            state.collaborator = attentionDetails.collaborator;
            if (!attentionDetails.collaborator) {
              state.collaborator = await getCollaboratorById(attention.collaboratorId);
            }
          }
          if (attention.moduleId !== undefined && (attention.moduleId !== oldAttention.moduleId)) {
            state.module = attentionDetails.module;
            if (!attentionDetails.module) {
              state.module = await getModuleById(attention.moduleId);
            }
          }
        } catch (error) {
          loading.value = false;
        }
      } else {
        router.push({ path: `/not-found` })
      }
    }
    const getQueueValues = async (queue, oldQueue) => {
      if (queue && queue.id) {
        state.queue = queue;
      }
    }
    const attentionActive = () => {
      return state.attention.status === 'PENDING' || state.attention.status === 'REACTIVATED';
    };
    const itsYourTurn = () => {
      return (state.beforeYou === 0 && state.attention.status === 'PROCESSING') ||
        state.attention.status === 'REACTIVATED';
    }
    const youWereAttended = () => {
      return state.attention.status === 'TERMINATED'
        && state.attention.surveyId === undefined;
    }
    const youFullfilledSurvey = () => {
      return (state.attention.status === 'TERMINATED' || state.attention.status === 'RATED')
        && state.attention.surveyId !== undefined;
    }
    const youWereReserveCancelled = () => {
      return state.attention.status === 'TERMINATED_RESERVE_CANCELLED';
    }
    const youWereSkipped = () => {
      return state.attention.status === 'CANCELLED';
    }
    const youWereAttentionCancelled = () => {
      return state.attention.status === 'USER_CANCELLED';
    }
    const getCreatedAt = (createdAt, timeZoneIn) => {
      const dateCorrected = new Date(
      new Date(createdAt).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }),
    );
    return dateCorrected.toLocaleString("en-GB");
    }
    const notify = () => { };
    const getQRValue = () => {
      return `${import.meta.env.VITE_URL}/interno/colaborador/atencion/${state.attention.id}/validar`;
    };
    const createdUser = (user) => {
      state.user = user;
    };
    const backToCommerceQueues = () => {
      router.push({ path: `/interno/comercio/${state.commerce.keyName}` })
    }
    const itsYourTurnPlay = () => {
      if (itsYourTurn() && !state.soundPlayed) {
        var audio = document.getElementById('its-your-turn-audio');
        audio.play();
        state.soundPlayed = true;
      }
    }
    const play = () => {
      state.soundEnabled = !state.soundEnabled;
      var audio = document.getElementById('its-your-turn-audio');
      audio.muted = !state.soundEnabled;
    }
    const testSound = () => {
      var audio = document.getElementById('its-your-turn-audio-test');
      audio.play();
    }
    const collaboratorName = () => {
      const name = state.collaborator.alias || state.collaborator.name;
      return name ? name.split(' ')[0] : t('userQueueAttention.collaborator');
    }
    const attentionCancelled = () => {
      return state.attention.status === 'RESERVE_CANCELLED';
    }
    const goToCancel = () => {
      state.goToCancel = !state.goToCancel;
    }
    const cancelCancel = () => {
      state.goToCancel = false;
    }
    const cancellingAttention = async () => {
      try {
        loading.value = true;
        if (state.attention.status === "PENDING") {
          await cancelAttention(state.attention.id);
          //await getBookingDetailsFromService(state.booking.id);
          state.goToCancel = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status;
        loading.value = false;
      }
    }

    watch(
      [ attentions, queues ],
      async ([newAttention, newQueue], [oldAttention, oldQueue]) => {
        try {
          await getQueueAttentionValues(newAttention[0], oldAttention);
          await getQueueValues(newQueue[0], oldQueue);
          await itsYourTurnPlay();
          loading.value = false;
        } catch (error) {
          loading.value = false;
        }
      }
    )

    return {
      id,
      state,
      loading,
      alertError,
      goToCancel,
      cancelCancel,
      cancellingAttention,
      attentionCancelled,
      notify,
      getQRValue,
      createdUser,
      itsYourTurn,
      youWereAttended,
      youFullfilledSurvey,
      youWereSkipped,
      youWereAttentionCancelled,
      backToCommerceQueues,
      getCreatedAt,
      play,
      attentionActive,
      testSound,
      collaboratorName,
      youWereReserveCancelled
    }
  }

}
</script>
<template>
  <div>
    <audio id="its-your-turn-audio" muted hidden>
      <source type="audio/mp3" src="../assets/sounds/es_tu_turno.mp3">
    </audio>
    <audio id="its-your-turn-audio-test" hidden>
      <source type="audio/mp3" src="../assets/sounds/es_tu_turno.mp3">
    </audio>
    <div  class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <QueueName :queue="state.queue"></QueueName>
      <Spinner :show="loading"></Spinner>
      <Alert :show="loading" :stack="alertError"></Alert>
      <div v-if="!loading">
        <div id="page-header" class="text-center mt-4">
          <div v-if="itsYourTurn()">
            <div class="its-your-turn parpadea">
              <span>{{ $t("userQueueAttention.itsYourTurn") }}</span>
            </div>
          </div>
          <div v-else-if="youWereAttended() || youFullfilledSurvey()">
            <div class="welcome">
              <span>{{ $t("userQueueAttention.youWereAttended") }}</span>
            </div>
            <div class="your-attention">
              <span>{{ $t("userQueueAttention.thanks") }}</span>
            </div>
          </div>
          <div v-else>
            <div class="welcome">
              <span>{{ $t("userQueueAttention.hello") }}</span>
            </div>
          </div>
        </div>
        <div id="survey" v-if="youWereAttended()">
          <AttentionSurvey
            :surveyPersonalized="state.survey"
            :attentionId="state.attention.id"
            :attentionType="state.attention.type">
          </AttentionSurvey>
        </div>
        <div id="survey-fullfilled" v-else-if="youFullfilledSurvey()">
          <div class="mt-3">
            <Message
              :title="$t('attentionSurvey.message.1.title')"
              :content="$t('attentionSurvey.message.1.content')"
              :icon="'bi bi-emoji-sunglasses'">
            </Message>
            <a
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              v-if="state.commerce.url !== undefined"
              @click="backToCommerceQueues()">
              {{ $t("userQueueAttention.actions.5.action") }} <i class="bi bi-arrow-left"></i>
            </a>
            <a
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              :href="state.commerce.url" target="_blank">
              {{ $t("userQueueAttention.actions.4.action") }} <i class="bi bi-hand-index-thumb-fill"></i>
            </a>
          </div>
        </div>
        <div v-else-if="youWereSkipped()">
          <div class="your-attention">
            <span>{{ $t("userQueueAttention.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :number="state.attention.number"
            :type="'secondary'"
            :data="state.user"
          >
          </AttentionNumber>
          <Message
            :title="$t('userQueueAttention.message.1.title')"
            :content="$t('userQueueAttention.message.1.content')"
            :icon="'bi bi-emoji-dizzy'">
          </Message>
          <div class="mt-3">
            <a
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="backToCommerceQueues()">
              {{ $t("userQueueAttention.actions.5.action") }} <i class="bi bi-arrow-left"></i>
            </a>
          </div>
        </div>
        <div v-else-if="youWereAttentionCancelled() || youWereReserveCancelled()">
          <div class="your-attention">
            <span>{{ $t("userQueueAttention.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :number="state.attention.number"
            :type="'secondary'"
            :data="state.user"
          >
          </AttentionNumber>
          <Message
            :title="$t('userQueueAttention.message.3.title')"
            :content="$t('userQueueAttention.message.3.content')"
            :icon="'bi bi-emoji-dizzy'">
          </Message>
          <div class="mt-3">
            <a
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="backToCommerceQueues()">
              {{ $t("userQueueAttention.actions.5.action") }} <i class="bi bi-arrow-left"></i>
            </a>
          </div>
        </div>
        <div id="attention" v-else>
          <div class="your-attention mt-2">
            <span>{{ $t("userQueueAttention.yourNumber") }}</span>
          </div>
          <AttentionNumber
            :number="state.attention.number"
            :data="state.user"
          ></AttentionNumber>
          <div v-if="itsYourTurn()" class="attention-details-container">
            <div class="col-6 attention-details-card">
              <label class="attention-details-title"> {{ $t("userQueueAttention.getClose") }} </label><br>
              <span class="attention-details-content"> <i class="bi bi-arrow-down-right-circle"></i> {{ state.module.name || $t("userQueueAttention.module") }} </span>
            </div>
            <div class="col-6 attention-details-card">
              <label class="attention-details-title"> {{ $t("userQueueAttention.attendedBy") }} </label><br>
              <span class="attention-details-content"><i class="bi bi-person-circle"></i> {{ collaboratorName() }} </span>
            </div>
          </div>
          <div v-if="itsYourTurn()">
            <Message
            :title="$t('userQueueAttention.message.2.title')"
            :content="$t('userQueueAttention.message.2.content')"
            :icon="'bi bi-star'">
            ></Message>
          </div>
          <div v-else class="to-goal">
            <div class="attention-details-container">
              <div v-if="state.attention.number === 1 && state.attention.status ==='PENDING' || state.beforeYou === 0" class="col-12 attention-shortly-details-card attention-details-message">
                <span class="attention-details-content"> 🚨 </span><br>
                <span class="attention-details-title">  {{ $t("userQueueAttention.willBeAttendedShortly") }} </span>
              </div>
              <div v-else class="col-6 attention-details-card">
                <span class="attention-details-title"> {{ $t("userQueueAttention.toGoal.1") }} </span><br>
                <span class="attention-details-content"> <i class="bi bi-person"></i> {{ state.beforeYou }} </span><br>
              </div>
              <div v-if=" state.beforeYou > 0" class="col-6 attention-details-card">
                <span class="attention-details-title"> {{ $t("userQueueAttention.estimatedTime") }} </span><br>
                <span class="attention-details-content parpadea"> <i class="bi bi-stopwatch"></i> {{ state.estimatedTime }} </span> <br>
              </div>
            </div>
          </div>
          <div id="sound-control" class="attention-details-sound" v-if="attentionActive()">
            <div class="row centered attention-sound">
              <div class="col-8">
                <i class="bi bi-bell"> </i>
                <span class="fw-bold" v-if="!state.soundEnabled"> {{ $t("userQueueAttention.actions.6.title.1") }} </span>
                <span class="fw-bold" v-else> {{ $t("userQueueAttention.actions.6.title.2") }} </span>
                <span>{{ $t("userQueueAttention.actions.6.title.3") }}</span>
              </div>
              <div class="col-4">
                <div class="d-flex justify-content-center mb-1">
                  <button
                    class="btn btn-md fw-bold btn-dark rounded-pill"
                    @click="play()">
                    <i :class="`bi ${state.soundEnabled ? 'bi-bell-fill' : 'bi-bell-slash-fill'} `"></i>
                  </button>
                </div>
                <span class="test-sound justify-content-end" @click="testSound()">{{ $t("userQueueAttention.actions.6.title.4") }}</span>
              </div>
            </div>
          </div>
          <div id="whatsapp-notification-control" class="d-grid gap-2 mb-2 attention-details-sound" v-if="attentionActive()">
            <div class="attention-notification-title">
              <i class="bi bi-whatsapp"></i> <span class="fw-bold"> {{ $t("clientNotifyData.phoneTitle1") }} </span> <span> {{ $t("clientNotifyData.phoneTitle2") }} </span>
            </div>
            <a v-if="state.queue.active"
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              data-bs-toggle="collapse"
              href="#client-whatsapp-data"
              :disabled="!state.toggles['user.notification.add']"
              @click="notify()">
              <i class="bi bi-phone-vibrate-fill"></i>
              {{ $t("userQueueAttention.actions.1.action") }} <i class="bi bi-chevron-down"></i>
            </a>
            <div :class="`collapse ${state.user.notificationOn ? 'show' : ''}`" id="client-whatsapp-data">
              <ClientNotifyData
                :attentionId="state.attention.id"
                :userId="state.user.id"
                :commerceId="state.commerce.id"
                :queueId="state.queue.id"
                :userIn="state.user"
                :notificationOn="state.user.notificationOn || false"
                :commerce="state.commerce"
                @createdUser="createdUser($event)" />
            </div>
          </div>
          <div id="email-notification-control" class="d-grid gap-2 mb-4 attention-details-sound" v-if="attentionActive()">
            <div class="attention-notification-title">
              <i class="bi bi-envelope"></i> <span class="fw-bold"> {{ $t("clientNotifyData.emailTitle1") }} </span> <span> {{ $t("clientNotifyData.emailTitle2") }} </span>
            </div>
            <a v-if="state.queue.active"
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              data-bs-toggle="collapse"
              href="#client-email-data"
              :disabled="!state.toggles['user.notification.add']"
              @click="notify()">
              <i class="bi bi-envelope-fill"></i>
              {{ $t("userQueueAttention.actions.7.action") }} <i class="bi bi-chevron-down"></i>
            </a>
            <div :class="`collapse ${state.user.notificationEmailOn ? 'show' : ''}`" id="client-email-data">
              <ClientEmailNotifyData
                :attentionId="state.attention.id"
                :userId="state.user.id"
                :commerceId="state.commerce.id"
                :queueId="state.queue.id"
                :userIn="state.user"
                :notificationOn="state.user.notificationEmailOn || false"
                :commerce="state.commerce"
                @createdUser="createdUser($event)" />
            </div>
          </div>
          <div id="cancel-process" class="mb-3" v-if="!itsYourTurn()">
            <button
              type="button"
              class="btn-size btn btn-lg btn-block col-9 fw-bold btn-danger rounded-pill mb-1"
              @click="goToCancel()"
              :disabled="attentionCancelled()"
              >
              {{ $t("userQueueAttention.cancel") }}
            </button>
            <AreYouSure
              :show="state.goToCancel"
              :yesDisabled="!attentionCancelled()"
              :noDisabled="!attentionCancelled()"
              @actionYes="cancellingAttention()"
              @actionNo="cancelCancel()"
            >
            </AreYouSure>
          </div>
          <div id="QR-control">
            <div class="your-attention">
              <span v-if="state.beforeYou === 0"> {{ $t("userQueueAttention.itsYourAttention") }}</span>
              <span v-else>{{ $t("userQueueAttention.yourAttention") }}</span>
            </div>
            <QR :value="getQRValue()" @click="getQRValue()"></QR>
          </div>
          <Message
            :title="$t('userQueueAttention.actions.2.action')"
            :content="$t('userQueueAttention.actions.2.title.1')"
            :icon="'bi bi-camera-fill'">
          </Message>
          <div class="row attention-details-container">
            <div class="attention-details-date attention-details-data">
              <span><strong>{{ getCreatedAt(state.attention.createdAt, state.commerce.localeInfo ? state.commerce.localeInfo.timezone : 'America/Santiago') }}</strong></span><br>
              <span><strong>Id:</strong> {{ state.attention.id }}</span>
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
.attention-details-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-left: .1rem;
  margin-right: .1rem;
  margin-bottom: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  height: 4.6rem;
}
.attention-shortly-details-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-left: .4rem;
  margin-right: .4rem;
  margin-bottom: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  height: 4.6rem;
}
.attention-details-date {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .2rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
}
.attention-details-sound {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .3rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  margin-bottom: .5rem;
}
.attention-details-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: .4rem;
  margin-right: .4rem;
  margin-top: .5rem;
  margin-bottom: 0rem;
}
.attention-details-title {
  font-size: .7rem;
  line-height: .8rem !important;
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
  margin-block-start: .2rem;
}
.attention-details-data {
  font-size: .9rem;
}
.attention-sound {
  font-size: .8rem;
  line-height: 1.1rem;
}
.attention-notification-title {
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