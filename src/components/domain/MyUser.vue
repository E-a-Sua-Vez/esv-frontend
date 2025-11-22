<script>
import { ref, reactive, onBeforeMount, watch, toRefs } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import { signOut, signInInvited } from '../../application/services/auth';
import { getDateAndHour } from '../../shared/utils/date';
import { sendResetPasswordEmail } from '../../application/firebase';
import { changePassword } from '../../application/services/auth';
import { markAllAsRead } from '../../application/services/message';
import { USER_TYPES } from '../../shared/constants';
import Message from '../common/Message.vue';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import Warning from '../common/Warning.vue';
import UserMessage from '../common/UserMessage.vue';

export default {
  components: { Message, Spinner, Alert, Warning, UserMessage },
  name: 'MyUser',
  props: {
    messages: { type: Array, default: [] },
  },
  async setup(props) {
    const router = useRouter();
    let store = globalStore();
    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      userName: '',
      currentUserType: '',
      currentUser: {},
      currentBusiness: {},
      showActions: false,
      showMessages: true,
      errors: [],
      passwordChanged: false,
    });

    const { messages } = toRefs(props);

    const getUser = async store => {
      state.userName = undefined;
      state.currentUserType = undefined;
      state.currentUser = await store.getCurrentUser;
      state.currentBusiness = await store.getCurrentBusiness;
      if (state.currentUser !== undefined) {
        state.userName = state.currentUser.alias || state.currentUser.name;
      }
      state.currentUserType = await store.getCurrentUserType;
    };

    onBeforeMount(async () => {
      store = globalStore();
      await getUser(store);
    });

    watch(
      () => store,
      async (newStore, oldStore) => {
        await getUser(newStore);
      },
      { immediate: true, deep: true }
    );

    const loginInvited = async () => {
      const environment = import.meta.env.VITE_NODE_ENV || 'local';
      const currentUser = await store.getCurrentUser;
      const currentUserType = await store.getCurrentUserType;
      if (environment !== 'local' && (!currentUserType || !currentUser)) {
        await signOut(undefined, currentUserType);
        await store.resetSession();
        const user = await signInInvited();
        store.setCurrentUser(user);
        store.setCurrentUserType(USER_TYPES.INVITED);
      }
    };

    const logout = async () => {
      try {
        loading.value = true;
        const currentUser = await store.getCurrentUser;
        const currentUserType = await store.getCurrentUserType;
        await signOut(currentUser.email, currentUserType);
        await store.resetSession();
        let path = '/';
        if (currentUserType === USER_TYPES.BUSINESS) {
          path = '/publico/negocio/login';
        } else if (currentUserType === USER_TYPES.COLLABORATOR) {
          path = '/publico/colaborador/login';
        } else if (currentUserType === USER_TYPES.MASTER) {
          path = '/publico/master/login';
        }
        loading.value = false;
        router.push({ path, replace: true }).then(() => {
          router.go();
        });
      } catch (error) {
        loading.value = false;
      }
    };

    const sendEmail = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        try {
          state.errors = [];
          state.passwordChanged = false;
          const { user } = await changePassword(state.currentUser.email, state.currentUserType);
          const result = await sendResetPasswordEmail(state.currentUser.email);
          if (result === 'Email Sent') {
            state.passwordChanged = true;
            store.setCurrentUser(user);
          } else {
            state.errors.push('loginData.validate.common.6');
          }
        } catch (error) {
          state.errors.push('loginData.validate.common.5');
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    const markMessagesAsRead = async () => {
      try {
        alertError.value = '';
        if (state.currentUserType && state.currentUser && state.currentUser.id) {
          if (state.currentUserType === USER_TYPES.BUSINESS) {
            const body = {
              administratorId: state.currentUser.id,
            };
            await markAllAsRead(body);
          } else if (state.currentUserType === USER_TYPES.COLLABORATOR) {
            const body = {
              collaboratorId: state.currentUser.id,
            };
            await markAllAsRead(body);
          }
        }
      } catch (error) {
        alertError.value = error.message;
      }
    };

    const showActions = () => {
      state.showActions = true;
      state.showMessages = false;
    };

    const showMessages = () => {
      state.showActions = false;
      state.showMessages = true;
    };

    return {
      state,
      store,
      loading,
      alertError,
      messages,
      getDateAndHour,
      logout,
      loginInvited,
      getUser,
      showActions,
      showMessages,
      sendEmail,
      markMessagesAsRead,
    };
  },
};
</script>

<template>
  <div>
    <div class="row mt-2 mb-2 centered">
      <div class="col-6" v-if="state.currentBusiness">
        <img
          v-if="state.currentBusiness?.logo"
          :src="state.currentBusiness?.logo"
          class="img-thumbnail rounded-start item-image"
        />
        <i v-else class="bi bi-person-circle"> </i>
      </div>
    </div>
    <div class="row mt-2 mb-2 centered">
      <div class="col centered">
        <span class="user-title">
          {{ state.userName }}
          {{ state.currentUser ? (state.currentUser.active ? '🟢' : '🔴') : '' }}
        </span>
      </div>
    </div>
    <div class="row user-subtitle">
      <div class="col-6 righted">
        <span class="">
          <span class="fw-bold"> {{ $t('myUser.credential') }} </span>
        </span>
      </div>
      <div class="col-6 lefted">
        <span>{{ state.currentUserType?.toUpperCase() }} </span>
      </div>
    </div>
    <div class="row user-subtitle">
      <div class="col-6 righted">
        <span class="user-subtitle">
          <span class="fw-bold">{{ $t('myUser.user') }} </span>
        </span>
      </div>
      <div class="col-6 lefted">
        <span>{{ state.currentUser?.email }} </span>
      </div>
    </div>
    <div class="row user-subtitle">
      <div class="col-6 righted">
        <span class="user-subtitle">
          <span class="fw-bold"> {{ $t('myUser.lastSignIn') }} </span>
        </span>
      </div>
      <div class="col-6 lefted">
        <span>{{ getDateAndHour(state.currentUser?.lastSignIn) }} </span>
      </div>
    </div>
    <hr />
    <Spinner :show="loading"></Spinner>
    <Alert :show="loading" :stack="alertError"></Alert>
    <div class="row col mx-1 mt-2 mb-1">
      <div class="col-6 centered">
        <button
          class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
          :class="state.showActions ? 'btn-selected' : ''"
          @click="showActions()"
        >
          {{ $t('myUser.actions') }} <i class="bi bi-gear-fill"></i>
        </button>
      </div>
      <div class="col-6 centered">
        <button
          class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
          :class="state.showMessages ? 'btn-selected' : ''"
          @click="showMessages()"
        >
          <div class="row centered">
            <div class="col-7">
              {{ $t('myUser.messages') }}
            </div>
            <div class="col-4 centered">
              <span class="badge bg-danger rounded-pill px-2 py-1 mx-1">
                <i class="bi bi-envelope-fill"></i> {{ messages.length || 0 }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
    <div class="row col mx-4 mt-3 mb-1" v-if="state.showActions">
      <button class="btn btn-md btn-size fw-bold btn-dark rounded-pill my-1" @click="sendEmail()">
        {{ $t('myUser.password') }} <i class="bi bi-key-fill"></i>
      </button>
      <div v-if="state.passwordChanged === true">
        <Message
          :closable="true"
          :title="$t('accessAdmin.message.1.title')"
          :content="$t('accessAdmin.message.1.content')"
          :icon="'bi bi-emoji-sunglasses'"
        />
      </div>
      <div class="errors" id="feedback" v-if="state.errors.length > 0">
        <Warning :closable="true">
          <template v-slot:message>
            <li v-for="(error, index) in state.errors" :key="index">
              {{ $t(error) }}
            </li>
          </template>
        </Warning>
      </div>
      <button class="btn btn-md btn-size fw-bold btn-danger rounded-pill my-1" @click="logout()">
        {{ $t('myUser.logout') }} <i class="bi bi-box-arrow-right"></i>
      </button>
    </div>
    <div class="row col mx-1 mt-3 mb-1" v-if="state.showMessages">
      <div v-if="messages && messages.length === 0">
        <Message
          :icon="'bi-inbox-fill'"
          :title="$t('myUser.message.1.title')"
          :content="$t('myUser.message.1.content')"
        />
      </div>
      <div v-else class="message-box">
        <div class="righted">
          <button
            class="btn btn-sm btn-size fw-bold btn-success rounded-pill mb-2"
            @click="markMessagesAsRead()"
            :disabled="
              !(
                messages &&
                messages.length > 1 &&
                messages.filter(msg => msg.type === 'SYSTEM').length !== messages.length
              )
            "
          >
            {{ $t('myUser.markAsRead') }} <i class="bi bi-check-all"></i>
          </button>
        </div>
        <div v-for="message in messages" :key="message.id">
          <Transition mode="out-in">
            <UserMessage
              :closable="true"
              :id="message.id"
              :icon="message.icon"
              :title="message.title"
              :content="message.content"
              :date="message.createdAt"
              :type="message.type"
            />
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-title {
  font-size: 1.5rem;
  font-weight: 700;
}
.user-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
}
.message-box {
  overflow-y: scroll;
  max-height: 600px;
  font-size: 0.7rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  text-align: justify;
  text-justify: inter-word;
}
</style>
