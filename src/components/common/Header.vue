<script>
import { ref, reactive, onBeforeMount, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import { signOut, signInInvited } from '../../application/services/auth';
import { getDateAndHour } from '../../shared/utils/date';
import { messageCollection } from '../../application/firebase';
import { query, where, orderBy, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import { useI18n } from 'vue-i18n';
import { useFirebaseListener } from '../../composables/useFirebaseListener';
import { USER_TYPES, ENVIRONMENTS } from '../../shared/constants';
import LocaleSelector from './LocaleSelector.vue';
import Spinner from '../../components/common/Spinner.vue';
import MyUser from '../domain/MyUser.vue';

export default {
  components: { LocaleSelector, Spinner, MyUser },
  name: 'Header',
  async setup() {
    const router = useRouter();
    const { t } = useI18n();
    let store = globalStore();

    const loading = ref(false);

    // Track query parameters for dynamic listener
    const messageQueryParams = ref({ collaboratorId: null, administratorId: null });

    // Create Firebase listener at top level (composable rule)
    const messagesListener = useFirebaseListener((onSnapshot, onError) => {
      const { collaboratorId, administratorId } = messageQueryParams.value;

      if (collaboratorId) {
        const messageQuery = query(
          messageCollection,
          where('collaboratorId', '==', collaboratorId),
          where('active', '==', true),
          where('read', '==', false),
          orderBy('createdAt', 'asc')
        );
        return firestoreOnSnapshot(messageQuery, onSnapshot, onError);
      } else if (administratorId) {
        const messageQuery = query(
          messageCollection,
          where('administratorId', '==', administratorId),
          where('active', '==', true),
          where('read', '==', false),
          orderBy('createdAt', 'asc')
        );
        return firestoreOnSnapshot(messageQuery, onSnapshot, onError);
      }

      // Return no-op unsubscribe if no query
      return () => {};
    });

    const state = reactive({
      userName: '',
      currentUserType: '',
      currentUser: {},
      currentBusiness: {},
      messages: [],
    });

    // Watch for changes in messages data and update state
    watch(
      () => messagesListener.data.value,
      newMessages => {
        state.messages = newMessages || [];
        loading.value = false;
      },
      { immediate: true }
    );

    const getUser = store => {
      state.userName = undefined;
      state.currentUserType = undefined;
      state.currentUser = store.getCurrentUser;
      if (state.currentUser !== undefined && state.currentUser !== null) {
        state.userName = state.currentUser.alias || state.currentUser.name;
      }
      state.currentUserType = store.getCurrentUserType;
      state.currentBusiness = store.getCurrentBusiness;
      getMessages();
    };

    onBeforeMount(() => {
      store = globalStore();
      getUser(store);
    });

    const getMessages = () => {
      loading.value = true;

      // Stop existing listener
      messagesListener.stop();

      // Update query parameters based on user type
      if (
        state.currentUserType === USER_TYPES.BUSINESS &&
        state.currentUser &&
        state.currentUser.id
      ) {
        messageQueryParams.value = {
          collaboratorId: null,
          administratorId: state.currentUser.id,
        };
        messagesListener.start();
      } else if (
        state.currentUserType === USER_TYPES.COLLABORATOR &&
        state.currentUser &&
        state.currentUser.id
      ) {
        messageQueryParams.value = {
          collaboratorId: state.currentUser.id,
          administratorId: null,
        };
        messagesListener.start();
      } else {
        messageQueryParams.value = {
          collaboratorId: null,
          administratorId: null,
        };
        state.messages = [];
        loading.value = false;
      }
    };

    const loginInvited = async () => {
      const environment = import.meta.env.VITE_NODE_ENV || ENVIRONMENTS.LOCAL;
      const currentUser = store.getCurrentUser;
      const currentUserType = store.getCurrentUserType;
      if (environment !== ENVIRONMENTS.LOCAL && (!currentUserType || !currentUser)) {
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
        const currentUser = store.getCurrentUser;
        const currentUserType = store.getCurrentUserType;
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
        messagesListener.stop();
        loading.value = false;
        router.push({ path, replace: true }).then(() => {
          router.go();
        });
      } catch (error) {
        loading.value = false;
      }
    };

    const buildMessageFirstPasswordChange = () => {
      if (state.currentUser && !state.currentUser.firstPasswordChanged) {
        const message = {
          id: 'first-password-change',
          title: t('myUser.message.2.title'),
          content: t('myUser.message.2.content'),
          icon: t('myUser.message.2.icon'),
          active: state.currentUser.firstPasswordChanged,
          createdAt: new Date(),
          read: !state.currentUser.firstPasswordChanged,
          type: 'SYSTEM',
        };
        const messageCodes = state.messages.map(message => message.id);
        if (state.messages && !messageCodes.includes(message.id)) {
          state.messages.push(message);
        }
      }
    };

    const buildMessageWhatsappStatus = async () => {
      if (
        state.currentBusiness &&
        state.currentBusiness.whatsappConnection &&
        state.currentBusiness.whatsappConnection.idConnection &&
        state.currentBusiness.whatsappConnection.connected === false
      ) {
        const message = {
          id: 'whatsapp-disconnected',
          title: t('myUser.message.3.title'),
          content: t('myUser.message.3.content'),
          icon: t('myUser.message.3.icon'),
          active: state.currentBusiness.whatsappConnection.connected,
          createdAt: new Date(),
          read: !state.currentBusiness.whatsappConnection.connected,
          type: 'SYSTEM',
        };
        const messageCodes = state.messages.map(message => message.id);
        if (state.messages && !messageCodes.includes(message.id)) {
          state.messages.push(message);
        }
      }
    };

    const changeData = computed(() => {
      const { messages } = state;
      return {
        messages,
      };
    });

    watch(
      () => store,
      async (newStore, oldStore) => {
        await getUser(newStore);
      },
      { immediate: true, deep: true }
    );

    watch(changeData, async () => {
      buildMessageFirstPasswordChange();
      buildMessageWhatsappStatus();
    });

    return {
      state,
      store,
      loading,
      getDateAndHour,
      logout,
      loginInvited,
      getUser,
      USER_TYPES, // Expose for template use
    };
  },
};
</script>

<template>
  <div class="row">
    <div class="row masthead ett-nav py-2">
      <div class="container-fluid col-8">
        <div v-if="!loading">
          <div
            v-if="
              state.currentUser &&
              state.currentUser.name !== 'invitado' &&
              (state.currentUserType === USER_TYPES.COLLABORATOR ||
                state.currentUserType === USER_TYPES.BUSINESS ||
                state.currentUserType === USER_TYPES.MASTER)
            "
          >
            <div class="user-name">
              <a data-bs-toggle="modal" :data-bs-target="`#userModal`">
                <span class="fw-bold"
                  ><i class="bi bi-person-circle"></i> {{ state.userName }}</span
                >
                <span
                  v-if="state.messages.length > 0"
                  class="message-indicator parpadea badge bg-danger rounded-pill px-2 py-1 mx-1"
                >
                  <i class="bi bi-envelope-fill"></i> {{ state.messages.length || 0 }}
                </span>
              </a>
            </div>
            <div class="">
              <a class="logout btn-light rounded-pill my-0 px-4" @click="logout()">
                {{ $t('logout') }} <i class="bi bi-box-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
        <div v-else>
          <div class="col-8 lefted">
            <Spinner :show="!loading" :ligth="true"></Spinner>
          </div>
        </div>
      </div>
      <div class="col-3">
        <div class="container-fluid">
          <LocaleSelector></LocaleSelector>
        </div>
      </div>
    </div>
    <div class="wave">
      <svg viewBox="0 0 500 30" preserveAspectRatio="none">
        <path
          d="M-16.93,26.16 C140.52,10.37 254.51,0.51 511.85,27.14 L500.00,0.00 L0.00,0.00 Z"
        ></path>
      </svg>
    </div>
    <!-- Modal User -->
    <div
      class="modal fade"
      id="userModal"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-person-circle"></i> {{ $t('myUser.title') }}
            </h5>
            <button
              id="close-modal"
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body text-center pb-3">
            <MyUser :messages="state.messages"> </MyUser>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ett-nav {
  background-color: var(--azul-hub);
  margin-top: -0.1rem;
  margin-bottom: -0.1rem;
}
.user-name {
  color: var(--color-background);
  font-size: 1.1rem;
  line-height: 1rem;
  cursor: pointer;
}
.logout {
  color: var(--color-background);
  margin-top: 0.5rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.user-title {
  font-size: 1.5rem;
  font-weight: 700;
}
.user-subtitle {
  font-size: 0.9rem;
  font-weight: 500;
}
.wave {
  height: 40px;
  overflow: hidden;
  top: -0.2rem;
}
.wave > svg {
  height: 100%;
  width: 100%;
}
.wave > svg > path {
  stroke: none;
  fill: var(--azul-hub);
}
.message-indicator {
  font-size: 0.7rem;
}
</style>
