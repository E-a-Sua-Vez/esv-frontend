<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getQueuesByCommerceId } from '../../application/services/queue';
import { getQueueByCommerce, getGroupedQueueByCommerceId } from '../../application/services/queue';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import BookingCalendar from '../../components/bookings/domain/BookingCalendar.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessQueueBookings',
  components: { CommerceLogo, Message, PoweredBy, VueRecaptcha, Spinner, Alert, BookingCalendar, ComponentMenu },
  async setup() {
    const router = useRouter();

    let loading = ref(false);
    let alertError = ref('');

    const store = globalStore();

    const state = reactive({
      currentUser: {},
      commerces: ref([]),
      queue: {},
      queues: [],
      groupedQueues: [],
      commerce: {},
      module: {},
      activeCommerce: false,
      captcha: false,
      locale: 'es',
      date: (new Date()).setDate(new Date().getDate() + 1),
      bookings: ref([]),
      waitlists: ref([]),
      availableBlocks: [],
      blocksByDay: [],
      blocks: [],
      availableAttentionBlocks: [],
      minDate: (new Date()).setDate(new Date().getDate() + 1),
      maxDate: (new Date()).setDate(new Date().getDate() + 90),
      showBooking: true,
      showWaitlist: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        const queues = await getQueuesByCommerceId(state.commerce.id);
        state.queues = queues;
        await initQueues();
        store.setCurrentCommerce(state.commerce);
        store.setCurrentQueue(undefined);
        state.locale = state.commerce.localeInfo.language;
        state.toggles = await getPermissions('collaborator');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const initQueues = async () => {
      state.queues = queues;
    }

    const isActiveCommerce = () => {
      return state.commerce && state.commerce.active === true;
    };

    const goBack = () => {
      router.push({ path: `/interno/colaborador/menu` });
    }

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        const selectedCommerce = await getQueueByCommerce(state.commerce.id);
        state.queues = selectedCommerce.queues;
        await initQueues();
        state.queue = {};
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    return {
      state,
      loading,
      alertError,
      selectCommerce,
      isActiveCommerce,
      goBack
    }
  }
}
</script>
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`collaboratorBookingsView.welcome`)"
        :toggles="state.toggles"
        componentName="collaboratorBookingsView"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
        <div id="businessQueuesAdmin-controls" class="control-box">
          <div class="row">
            <div class="col" v-if="state.commerces.length > 0">
              <span>{{ $t("collaboratorBookingsView.commerce") }} </span>
              <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="commerces">
                <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
              </select>
            </div>
            <div v-else>
              <Message
                :title="$t('businessQueuesAdmin.message.4.title')"
                :content="$t('businessQueuesAdmin.message.4.content')" />
            </div>
          </div>
        </div>
        <div class="mb-1 mt-2">
          <div class="choose-attention"><span> {{ $t("collaboratorBookingsView.manageAll") }} </span></div>
          <button
            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-5 py-3"
            data-bs-toggle="modal"
            data-bs-target="#modalAgenda"
            :disabled="!state.toggles['collaborator.bookings.manage'] || state.queues.length === 0"
            >
            <i class="bi bi-calendar-check-fill"></i> {{ $t("collaboratorBookingsView.schedules") }}
          </button>
        </div>
      </div>
    </div>
    <PoweredBy :name="state.commerce.name" />
    <!-- Modal Agenda -->
    <div class="modal fade" id="modalAgenda" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl modal-fullscreen modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-calendar-check-fill"></i> Agenda {{ state.commerce.name }} - {{ state.commerce.tag}} </h5>
            <button id="close-modal" class="btn-close btn-light" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <BookingCalendar
              :show="true"
              :commerce="state.commerce"
              :queues="state.queues"
              :toggles="state.toggles"
            >
            </BookingCalendar>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.indicator {
  font-size: .7rem;
}
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .2rem;
  margin-bottom: .2rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
}
.blocks-section {
  overflow-y: scroll;
  max-height: 600px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
}
</style>