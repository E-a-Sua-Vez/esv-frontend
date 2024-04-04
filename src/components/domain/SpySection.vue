<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getSpyMetrics } from '../../application/services/query-stack';
import { getPermissions } from '../../application/services/permissions';
import DetailsCard from '../../components/dashboard/common/DetailsCard.vue';
import AttentionDaysSinceDetails from '../../components/dashboard/domain/AttentionDaysSinceDetails.vue';
import DefaultSkeleton from '../../components/skeletons/DefaultSkeleton.vue';
import CollectionDetails from '../dashboard/domain/CollectionDetails.vue';

export default {
  name: 'SpySection',
  components: { DetailsCard, AttentionDaysSinceDetails, DefaultSkeleton, CollectionDetails },
  props: {
    show: { type: Boolean, default: true },
    commerces: { type: Array, default: [] }
  },
  async setup(props) {
    const router = useRouter();

    let loading = ref(false);
    let loadingSpy = ref(false);
    let alertError = ref('');

    const {
      show,
      commerces
    } = toRefs(props);

    const state = reactive({
      commerces: [],
      startDate: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().slice(0,10),
      endDate: new Date().toISOString().slice(0,10),
      togglesSpy: {},
      timeUpdate: 60,
      incomeTicker: 60,
      calculatedMetrics: {
        'attention.created': {},
        'survey.created': {},
        'notification.created': {},
        'booking.created': {},
        'clients': {}
      }
    });

    onBeforeMount(async () => {
      try {
        if (show.value === true) {
          await getSpyMetric();
          state.togglesSpy = await getPermissions('dashboard');
          /*setInterval(async () => {
            if (state.incomeTicker > 0) {
              state.incomeTicker--;
            } else {
              state.incomeTicker = state.timeUpdate;
              await getSpyMetric();
            }
          }, 1000);*/
        }
      } catch (error) {
        alertError.value = error ? error.response ? error.respose.status : 500 : 500;
        loading.value = false;
      }
    })

    const getSpyMetric = async () => {
      try {
        loadingSpy.value = true;
        const date = new Date().toISOString().slice(0,10);
        const [ year, month, day ] = date.split('-');
        state.startDate = `${year}-${month}-01`;
        state.endDate = `${year}-${month}-${day}`;
        state.calculatedMetrics = await getCalculatedMetrics();
        alertError.value = '';
        loadingSpy.value = false;
      } catch (error) {
        alertError.value = error ? error.response ? error.respose.status : 500 : 500;
        loadingSpy.value = false;
      }
    }

    const getCalculatedMetrics = async () => {
      if (commerces.value && commerces.value.length > 0) {
        const commercesId = commerces.value.map(commerce => commerce.id);
        const { calculatedMetrics } = await getSpyMetrics(commercesId, state.startDate, state.endDate);
        return calculatedMetrics;
      }
      return {};
    }

    const goToOption = async (option) => {
      try {
        loading.value = true;
        alertError.value = '';
        if (option) {
          router.push({ path: `/interno/negocio/${option}` });
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
        alertError.value = error.message;
      }
    };

    watch(
      commerces,
      async () => {
        state.commerces = commerces.value;
        if (show.value === true) {
          await getSpyMetric();
        }
      }
    )

    return {
      state,
      show,
      loading,
      loadingSpy,
      alertError,
      getSpyMetric,
      goToOption
    }
  }
}
</script>
<template>
  <div>
    <div v-if="show">
      <div v-if="loadingSpy === true">
        <DefaultSkeleton> </DefaultSkeleton>
      </div>
      <div v-if="loading === false && loadingSpy === false">
        <div class="spy-title mt-2">
          <i class="bi bi-eye-fill mx-1"></i>
          <span> {{ $t('dashboard.spy') }}</span>
          <button
            class="btn btn-sm btn-dark rounded-pill mx-2 px-3 metric-filters"
            @click="getSpyMetric()"
            >
            <i class="bi bi-arrow-counterclockwise"></i>
          </button>
          <div hidden>
            <span class="spy-update">{{ $t('dashboard.spyUpdate') }} </span> <span class="fw-bold spy-update">{{ state.incomeTicker }} </span> <span class="spy-update"> {{  $t('dashboard.second') }} <i class="bi bi-clock"></i></span>
          </div>
        </div>
        <hr>
        <div class="spy-subdetails">
          <span class="spy-subdetails">{{ $t('dashboard.spySubDetails') }}</span><br>
          <span class="spy-details" @click="goToOption('dashboard')"> {{ $t('dashboard.spyDetails') }}<i class="bi bi-arrow-up-right-circle mx-1"></i></span>
        </div>
        <div id="attention-number">
          <DetailsCard
            :show="!!state.togglesSpy['dashboard.attention-number.view']"
            :data="state.calculatedMetrics['attention.created'].attentionNumber"
            :subdatapastperiod="state.calculatedMetrics['attention.created'].pastPeriodAttentionNumber"
            :subdatapastmonth="state.calculatedMetrics['attention.created'].pastMonthAttentionNumber"
            :subdatacurrentperiod="state.calculatedMetrics['attention.created'].currentMonthAttentionNumber"
            :title="$t('dashboard.items.attentions.1')"
            :showTooltip="false"
            :icon="'bi-qr-code'"
            :iconStyleClass="'blue-icon'"
            :detailsOpened="false"
            :showDetailsSection="false"
            >
          </DetailsCard>
        </div>
        <div id="booking-number">
          <DetailsCard
            :show="!!state.togglesSpy['dashboard.booking-number.view']"
            :data="state.calculatedMetrics['booking.created'].bookingNumber || 0"
            :subdata="state.calculatedMetrics['booking.created'].stillPendingBookings"
            :title="$t('dashboard.items.attentions.27')"
            :showTooltip="true"
            :description="$t('dashboard.booking')"
            :icon="'bi-calendar2-check-fill'"
            :iconStyleClass="'orange-icon'"
            :detailsOpened="false"
            :showDetailsSection="false"
            >
          </DetailsCard>
        </div>
        <div id="attention-daysSince-clients">
          <AttentionDaysSinceDetails
            :show="!!state.togglesSpy['dashboard.attention-days-since-clients.view']"
            :distribution="state.calculatedMetrics['clients']['resultDaysSinceDistribution']"
            :count="state.calculatedMetrics['clients'].daysSinceClientsTotal || 0"
          >
          </AttentionDaysSinceDetails>
        </div>
        <div id="attention-collection-clients">
          <CollectionDetails
            :show="!!state.togglesSpy['dashboard.collection-details.view']"
            :calculatedMetrics="state.calculatedMetrics"
            :detailsOpened="false"
            :showDetailsSection="false"
          >
          </CollectionDetails>
        </div>
        <div class="row">
          <div id="attention-rating-avg" class="col-6">
            <DetailsCard
              :show="!!state.togglesSpy['dashboard.attention-rating-avg.view']"
              :data="state.calculatedMetrics['survey.created'].avgRating || 0"
              :subdata="state.calculatedMetrics['survey.created'].count_rating || 0"
              :title="$t('dashboard.items.attentions.3')"
              :showTooltip="true"
              :description="$t('dashboard.rating')"
              :icon="'bi-star-fill'"
              :iconStyleClass="'yellow-icon'"
              :detailsOpened="false"
              :showDetailsSection="false"
              >
            </DetailsCard>
          </div>
          <div id="attention-nps-avg" class="col-6">
            <DetailsCard
              :show="!!state.togglesSpy['dashboard.attention-nps-avg.view']"
              :data="state.calculatedMetrics['survey.created'].nps || 0"
              :subdata="state.calculatedMetrics['survey.created'].count_nps || 0"
              :title="$t('dashboard.items.attentions.24')"
              :showTooltip="true"
              :description="$t('dashboard.nps')"
              :icon="'bi-megaphone-fill'"
              :detailsOpened="false"
              :showDetailsSection="false"
              >
            </DetailsCard>
          </div>
        </div>
        <div id="attention-origin-avg">
          <DetailsCard
            :show="!!state.togglesSpy['dashboard.attention-origin-avg.view']"
            :data="state.calculatedMetrics['clients']['maxOrigin']?.name ? $t(`origin.${state.calculatedMetrics['clients']['maxOrigin']?.name}`) : 'No Data'"
            :subdata="state.calculatedMetrics['clients']['maxOrigin'] ? state.calculatedMetrics['clients']['maxOrigin']?.count : 0"
            :title="$t('dashboard.items.attentions.31')"
            :showTooltip="true"
            :description="$t('dashboard.origin')"
            :icon="'bi-emoji-heart-eyes-fill'"
            :iconStyleClass="'orange-icon'"
            :detailsOpened="false"
            :showDetailsSection="false"
            >
          </DetailsCard>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1rem;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.btn-light {
  --bs-btn-bg: #dcddde !important;
}
.spy-details {
  font-size: .8rem;
  font-weight: 700;
  line-height: .75rem;
  cursor: pointer;
}
.spy-subdetails {
  font-size: .8rem;
  font-weight: 400;
  line-height: 1rem;
}
.spy-update {
  font-size: .7rem;
  font-weight: 500;
  line-height: .75rem;
}
.spy-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1rem;
}
.metric-filters {
  font-size: .6rem !important;
  line-height: .8rem !important;
  font-weight: 700;
}
</style>