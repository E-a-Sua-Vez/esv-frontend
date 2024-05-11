<script>
import { ref, watch, reactive, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { getAttentionDetails, cancelAttention } from '../application/services/attention';
import { getFormsByClient } from '../application/services/form';
import { getFormPersonalizedByCommerceId } from '../application/services/form-personalized';
import { getCommerceById } from '../application/services/commerce';
import { getQueueById } from '../application/services/queue';
import { getUserById } from '../application/services/user';
import { getCollaboratorById } from '../application/services/collaborator';
import { getModuleById } from '../application/services/module';
import { updatedAvailableAttentionsByCommerceAndQueue } from '../application/firebase';
import { getPermissions } from '../application/services/permissions';
import { useI18n } from 'vue-i18n';
import { getActiveFeature } from '../shared/features';
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
    const { t, locale } = useI18n();
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
      voiceConfig: {},
      formsPersonalized: [],
      showFormButton: false,
      formFirstAttentionCompleted: false,
      formPreAttentionCompleted: false,
      form: undefined,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        await getAttentionDetailsFromService(id);
        state.formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
        await getFormCompleted();
        state.queue = state.attention.queue;
        state.commerce = state.attention.commerce;
        state.toggles = await getPermissions('user');
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    let attentions = ref([]);
    attentions = updatedAvailableAttentionsByCommerceAndQueue(queueId);

    const getEstimatedTime = (totalMinutes) => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return estimatedTime;
    }

    const getAttentionDetailsFromService = async (id) => {
      try {
        state.attention = await getAttentionDetails(id);
        state.commerce = state.attention.commerce;
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getQueueAttentionValues = async (attention, oldAttention) => {
      if (attention && attention.id) {
        try {
          await getAttentionDetailsFromService(id);
          let attentionDetails = state.attention;
          if (attention.queueId) {
            state.queue = attentionDetails.queue;
            if (!attentionDetails.queue) {
              state.queue = await getQueueById(attention.queueId);
            }
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
      return state.attention.status === 'SKIPED' || state.attention.status === 'CANCELLED';
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

    const itsYourTurnPlay = async () => {
      if (itsYourTurn() && state.soundEnabled && !state.soundPlayed) {
        var audio = document.getElementById('its-your-turn-audio');
        await audio.play();
        setTimeout(async () => {
          await speak(false, false);
        }, 1500);
        state.soundPlayed = true;
      }
    }

    const play = async () => {
      state.soundEnabled = !state.soundEnabled;
      var audio = document.getElementById('its-your-turn-audio');
      audio.muted = !state.soundEnabled;
    }

    const testSound = async () => {
      var audio = document.getElementById('its-your-turn-audio-test');
      await audio.play();
    }

    const speak = async (test, mute) => {
      if (getActiveFeature(state.commerce, 'attention-voice-command', 'PRODUCT')) {
        let userLocaleByDefault = 'es';
        userLocaleByDefault = locale.value;
        const voices = await window.speechSynthesis.getVoices();
        if (userLocaleByDefault === 'pt') {
          state.voiceConfig = {
            text: `E a sua Vez! Senha ${state.attention.number} ${test === true ? '.' : `, Módulo' ${state.module.name}.`}`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'pt-BR',
            voice: await voices.find(voice => voice.name === 'Google português do Brasil')
          }
        } else if (userLocaleByDefault === 'en') {
          state.voiceConfig = {
            text: `It's your Turn! Number ${state.attention.number} ${test === true ? '.' : `, Module' ${state.module.name}.`}`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'en-US',
            voice: await voices.find(voice => voice.name === 'Google US English')
          }
        } else {
          state.voiceConfig = {
            text: `¡Es tu Turno! Número ${state.attention.number} ${test === true ? '.' : `, Módulo' ${state.module.name}.`}`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'es-MX',
            voice: await voices.find(voice => voice.name === 'Paulina')
          }
        }
        const msg = new SpeechSynthesisUtterance();
        msg.text = state.voiceConfig.text;
        msg.volume = mute === true ? 0 : state.voiceConfig.volume;
        msg.pitch = state.voiceConfig.pitch;
        msg.rate = state.voiceConfig.rate;
        msg.lang = state.voiceConfig.lang;
        msg.voice = state.voiceConfig.voice;
        await window.speechSynthesis.speak(msg);
      }
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
          state.goToCancel = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const getBeforeYou = (attentions) => {
      if (attentions && attentions.value && attentions.value.length > 0) {
        const attentionToProcess = attentions.value.filter(attention => attention.id === id)[0];
        const pendingAttentions = attentions.value.filter(attention => attention.status === 'PENDING');
        const beforeYou = pendingAttentions.filter(attention => attention.number < attentionToProcess.number);
        state.beforeYou = beforeYou.length;
      }
    }

    const getForm = (type, queueId, servicesId) => {
      if (state.formsPersonalized && state.formsPersonalized.length > 0 && type) {
        const filteredForms = state.formsPersonalized.filter(form => form.type === type);
        if (filteredForms && filteredForms.length > 0) {
          if (queueId) {
            const result = state.formsPersonalized.filter(form => form.queueId === queueId && form.type === type);
            if (result.length === 0) {
              return state.formsPersonalized.filter(form => form.type === type)[0];
            }
            return result;
          } else if (servicesId && servicesId.length > 0) {
            const result = state.formsPersonalized.filter(form => servicesId.includes(form.servicesId) && form.type === type);
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
    }

    const getFormCompleted = async () => {
      if (state.attention && state.attention.id && state.attention.clientId) {
        const forms = await getFormsByClient(state.commerce.id, state.attention.clientId);
        if (forms && forms.length > 0) {
          if (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT')) {
            const filteredForms = forms.filter(form => form.type === 'FIRST_ATTENTION');
            if (filteredForms && filteredForms.length > 0) {
              state.formFirstAttentionCompleted = true;
            }
          }
        }
        // Solo llena formulario la primera vez
        if (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT')) {
          if (!state.formFirstAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm('FIRST_ATTENTION', state.attention.queueId, state.attention.servicesId);
          }
        } else {
          state.showFormButton = false;
        }
      }
    }

    const goToForm = async () => {
      if (state.form && state.form.id && state.attention && state.attention.clientId) {
        let url = `/interno/form/${state.form.id}/client/${state.attention.clientId}/attention/${state.attention.id}`;
        router.push({ path: url })
      }
    }

    watch(
      attentions,
      async () => {
        try {
          if (attentions && attentions.value && attentions.value.length >= 0) {
            const newAttention = attentions.value.filter(attention => attention.id === id)[0];
            getBeforeYou(attentions);
            await getQueueAttentionValues(newAttention, state.attention);
            await itsYourTurnPlay();
          }
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
      youWereReserveCancelled,
      speak,
      goToForm,
      getActiveFeature
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
                <div v-if="state.attention.block && state.attention.block.hourFrom">
                  <p class="attention-details-title"> 🚨  {{ $t("userQueueAttention.blockInfo") }} </p>
                  <span class="attention-details-content parpadea"> {{ state.attention.block.hourFrom }} - {{ state.attention.block.hourTo }} </span>
                </div>
                <div v-else>
                  <span class="attention-details-content"> 🚨 </span><br>
                  <span class="attention-details-title">  {{ $t("userQueueAttention.willBeAttendedShortly") }} </span>
                </div>
              </div>
              <div v-else class="centered col-12">
                <div class="col-6 attention-details-card">
                  <span class="attention-details-title"> {{ $t("userQueueAttention.toGoal.1") }} </span><br>
                  <span class="attention-details-content"> <i class="bi bi-person"></i> {{ state.beforeYou }} </span><br>
                </div>
                <div class="col-6 attention-details-card">
                  <div v-if="state.attention.block && state.attention.block.hourFrom">
                    <span class="attention-details-title"> {{ $t("userQueueAttention.blockInfo") }}</span><br>
                    <span class="attention-details-content parpadea"> {{ state.attention.block.hourFrom }} - {{ state.attention.block.hourTo }} </span> <br>
                  </div>
                  <div v-else-if="state.beforeYou">
                    <span class="attention-details-title"> {{ $t("userQueueAttention.estimatedTime") }} </span><br>
                    <span class="attention-details-content parpadea"> <i class="bi bi-stopwatch"></i> {{ state.estimatedTime }} </span> <br>
                  </div>
                </div>
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
                    @click="play();speak(false, true)">
                    <i :class="`bi ${state.soundEnabled ? 'bi-bell-fill' : 'bi-bell-slash-fill'} `"></i>
                  </button>
                </div>
                <span class="test-sound justify-content-end" @click="testSound();speak(true, false)">{{ $t("userQueueAttention.actions.6.title.4") }}</span>
              </div>
            </div>
          </div>
          <div id="form-process" class="to-goal" v-if="state.showFormButton && state.form && (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') || getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT'))">
              <div class="booking-notification-title">
                <span>{{ $t("userQueueBooking.fillPreAttention") }}</span>
              </div>
              <button
                type="button"
                class="btn-size btn btn-lg btn-block col-9 fw-bold btn-primary rounded-pill mt-2 mb-1"
                v-if="state.showFormButton"
                @click="goToForm()">
                {{ $t("userQueueBooking.preAttention") }} <i class="bi bi-pencil-fill"></i>
              </button>
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
              :disabled="attentionCancelled() || !state.toggles['user.attentions.cancel']"
              >
              {{ $t("userQueueAttention.cancel") }} <i class="bi bi-x-circle-fill"></i>
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
.booking-notification-title {
  font-size: .8rem;
  line-height: 1rem;
  padding: .2rem;
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