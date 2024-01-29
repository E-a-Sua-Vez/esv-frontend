<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';

export default {
  name: 'BusinessbusinessSectionAtWorkView',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert },
  async setup() {
    const router = useRouter();

    let loading = ref(false);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      currentUserType: '',
      business: {},
    });
    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.currentUserType = await store.getCurrentUserType;
        state.business = await store.getActualBusiness();
        store.setCurrentBusiness(state.business);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })
    const isActiveBusiness = () => {
      return state.business && state.business.active === true &&
        state.business.queues.length > 0
    };
    const goBack = () => {
      router.back();
    }

    return {
      state,
      loading,
      alertError,
      isActiveBusiness,
      goBack
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo || undefined"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <div id="welcome">
            <span v-if="!state.currentUser" class="welcome">{{ $t("businessSectionAtWorkView.welcome") }}</span>
            <span v-else class="welcome-user">¡{{ $t("businessSectionAtWorkView.welcome-user") }}, {{ state.currentUser.name }}!</span>
          </div>
        </div>
        <Spinner :show="loading"></Spinner>
      </div>
      <div id="menu">
        <div>
          <Message
            :title="$t('businessSectionAtWorkView.message.1.title')"
            :content="$t('businessSectionAtWorkView.message.1.content')"
            :icon="'bi bi-tools'">
          </Message>
          <div class="col">
            <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()">{{ $t("businessSectionAtWorkView.return") }} <i class="bi bi-arrow-left"></i></a>
          </div>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
</style>