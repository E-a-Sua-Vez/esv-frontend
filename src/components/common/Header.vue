<script>
import { ref, reactive, onBeforeMount, watch, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores/index';
import { signOut, signInInvited } from '../../application/services/auth';
import { getDateAndHour } from '../../shared/utils/date';
import { messageCollection } from '../../application/firebase';
import { useI18n } from 'vue-i18n';
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

    let loading = ref(false);
    let messages = ref([]);
    let unsubscribeMessages = () => {};

    onUnmounted(() => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    })

    const state = reactive({
      userName: '',
      currentUserType: '',
      currentUser: {},
      currentBusiness: {},
      messages: []
    });

    const getUser = async (store) => {
      state.userName = undefined;
      state.currentUserType = undefined;
      state.currentUser = await store.getCurrentUser;
      if (state.currentUser !== undefined) {
        state.userName = state.currentUser.alias || state.currentUser.name;
      }
      state.currentUserType = await store.getCurrentUserType;
      getMessages();
    }

    onBeforeMount(async () => {
      store = globalStore();
      await getUser(store);
    })

    const getMessages = () => {
      loading.value = true;
      if (state.currentUserType === 'business' && state.currentUser && state.currentUser.id) {
        const { unsubscribe } = updatedAvailableMessages(undefined, state.currentUser.id);
        unsubscribeMessages = unsubscribe;

      } else if (state.currentUserType === 'collaborator' && state.currentUser && state.currentUser.id) {
        const { unsubscribe } = updatedAvailableMessages(state.currentUser.id, undefined);
        unsubscribeMessages = unsubscribe;
      }
      loading.value = false;
    }

    const updatedAvailableMessages = (collaboratorId, administratorId) => {
      if (collaboratorId) {
        const messages = ref([]);
        const messageQuery = messageCollection
          .where('collaboratorId', "==", collaboratorId)
          .where('active', "==", true)
          .where('read', "==", false)
          .orderBy('createdAt', 'asc');
        const unsubscribe = messageQuery.onSnapshot(snapshot => {
          messages.value = snapshot.docs
            .map(doc => {
              return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
            })
        })
        state.messages = messages;
        return { unsubscribe };
      } else if (administratorId) {
        const messages = ref([]);
        const messageQuery = messageCollection
          .where('administratorId', "==", administratorId)
          .where('active', "==", true)
          .where('read', "==", false)
          .orderBy('createdAt', 'asc');
        const unsubscribe = messageQuery.onSnapshot(snapshot => {
          messages.value = snapshot.docs
            .map(doc => {
              return { id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate().toString() }
            })
        })
        state.messages = messages;
        return { unsubscribe };
      }
    }

    const loginInvited = async () => {
      const environment = import.meta.env.VITE_NODE_ENV || 'local';
      const currentUser = await store.getCurrentUser;
      const currentUserType = await store.getCurrentUserType;
      if (environment !== 'local' && (!currentUserType || !currentUser)) {
        await signOut(undefined, currentUserType);
        await store.resetSession();
        const user = await signInInvited();
        store.setCurrentUser(user);
        store.setCurrentUserType('invited');
      }
    }

    const logout = async () => {
      try {
        loading.value = true;
        const currentUser = await store.getCurrentUser;
        const currentUserType = await store.getCurrentUserType;
        await signOut(currentUser.email, currentUserType);
        await store.resetSession();
        let path = '/';
        if (currentUserType === 'business') {
          path = '/publico/negocio/login';
        } else if (currentUserType === 'collaborator') {
          path = '/publico/colaborador/login';
        } else if (currentUserType === 'master') {
          path = '/publico/master/login';
        }
        if (unsubscribeMessages) {
          unsubscribeMessages();
        }
        loading.value = false;
        router.push({ path, replace: true }).then(() => { router.go() });
      } catch (error) {
        loading.value = false;
      }
    }

    const buildMessageFirstPasswordChange = () => {
      if (state.currentUser && !state.currentUser.firstPasswordChanged) {
        const message = {
          id: "first-password-change",
          title: t("myUser.message.2.title"),
          content: t("myUser.message.2.content"),
          icon: t("myUser.message.2.icon"),
          active: state.currentUser.firstPasswordChanged,
          createdAt: new Date(),
          read: !state.currentUser.firstPasswordChanged,
          type: "SYSTEM"
        }
        const messageCodes = state.messages.map(message => message.id);
        if (state.messages && !messageCodes.includes(message.id)) {
          state.messages.push(message);
        }
      }
    }

    const changeData = computed(() => {
      const { messages } = state;
      return {
        messages
      }
    })

    watch(
      () => store,
      async (newStore, oldStore) => {
        await getUser(newStore);
        buildMessageFirstPasswordChange();
      }, { immediate: true, deep: true }
    )

    watch(
      changeData,
      async () => {
        buildMessageFirstPasswordChange();
      }
    )

    return {
      state,
      store,
      loading,
      messages,
      getDateAndHour,
      logout,
      loginInvited,
      getUser
    }
  }
}
</script>

<template>
  <div class="row">
    <div class="row masthead ett-nav py-2">
      <div class="container-fluid col-8">
        <div v-if="!loading">
          <div v-if="state.currentUser && state.currentUser.name !== 'invitado' && (state.currentUserType === 'collaborator' || state.currentUserType === 'business' || state.currentUserType === 'master') ">
            <div class="user-name">
              <a
                data-bs-toggle="modal"
                :data-bs-target="`#userModal`"
              >
                <span class="fw-bold"><i class="bi bi-person-circle"></i> {{ state.userName }}</span>
                <span v-if="state.messages.length > 0" class="message-indicator  parpadea badge bg-danger rounded-pill px-2 py-1 mx-1"> <i class="bi bi-envelope-fill"></i> {{ state.messages.length || 0 }} </span>
              </a>
            </div>
            <div class="">
              <a class="logout btn-light rounded-pill my-0 px-4" @click="logout()" > {{ $t("logout") }} <i class="bi bi-box-arrow-right"></i> </a>
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
        <path d="M-16.93,26.16 C140.52,10.37 254.51,0.51 511.85,27.14 L500.00,0.00 L0.00,0.00 Z"></path>
      </svg>
    </div>
    <!-- Modal User -->
    <div class="modal fade" id="userModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-md">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-person-circle"></i> {{ $t("myUser.title") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
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
  background-color: var(--color-text);
  margin-top: -.1rem;
  margin-bottom: -.1rem;
}
.user-name {
  color: var(--color-background);
  font-size: 1.1rem;
  line-height: 1rem;
  cursor: pointer;
}
.logout {
  color: var(--color-background);
  margin-top: .5rem;
  font-size: .8rem;
  cursor: pointer;
}
.user-title {
  font-size: 1.5rem;
  font-weight: 700;
}
.user-subtitle {
  font-size: .9rem;
  font-weight: 500;
}
.wave {
  height: 40px;
  overflow: hidden;
  top: -.2rem;
}
.wave > svg{
  height: 100%;
  width: 100%;
}
.wave > svg > path {
  stroke: none;
  fill: var(--color-text);
}
.message-indicator {
  font-size: .7rem;
}
</style>
