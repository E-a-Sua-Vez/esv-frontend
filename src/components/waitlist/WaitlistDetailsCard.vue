<script>
import Popper from "vue3-popper";
import jsonToCsv from '../../shared/utils/jsonToCsv';
import { createBookingFromWaitlist } from '../../application/services/booking';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';

export default {
  name: 'WaitlistDetailsCard',
  components: { Popper, Spinner, Alert },
  props: {
    show: { type: Boolean, default: true },
    waitlist: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    availableBlocks: { type: Array, default: undefined },
  },
  data() {
    return {
      loading: false,
      extendedEntity: false,
      checked: false,
      block: undefined,
      alertError: undefined
    }
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    getDate(date, timeZoneIn) {
      const dateCorrected = new Date(
      new Date(date).toLocaleString('en-US', {
        timeZone: timeZoneIn,
      }));
      return dateCorrected.toISOString().slice(0,10);
    },
    copyWaitlist() {
      const textToCopy = jsonToCsv([this.waitlist]);
      navigator.clipboard.writeText(textToCopy);
    },
    async process() {
      try {
        this.loading = true;
        if (this.waitlist && this.waitlist.id) {
          if (this.block && this.block.number) {
            const waitlist = await createBookingFromWaitlist(this.waitlist.id, this.block.number);
            this.cancelled = waitlist.cancelled;
          }
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
  },
  watch: {
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      }
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      }
    }
  },
}
</script>

<template>
  <div v-if="show && waitlist">
    <div class="row metric-card fw-bold">
      <div class="col-12 centered" v-if="waitlist.user && waitlist.user.name">
        <i class="bi bi-person-circle mx-1"></i> {{ waitlist.user.name || 'N/I' }}
      </div>
    </div>
    <div class="details-arrow">
      <div class="centered">
        <span
          href="#"
          @click.prevent="showDetails()">
          <span class="details-title">{{ $t("dashboard.details") }}</span>
          <i class="dark" :class="`bi ${extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
        </span>
      </div>
      <div
        :class="{ show: extendedEntity }"
        class="detailed-data transition-slow">
        <div class="row m-0">
          <div class="d-block col-12 col-md-5">
            <div class="col-12 centered">
              <i class="bi bi-person-circle mx-1"></i> {{ waitlist.user.name || 'N/I' }} {{ waitlist.user.lastName || '' }}
              <a class="btn copy-icon"
                @click="copyWaitlist()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </a>
            </div>
          </div>
          <div class="d-block d-md-none col-12 col-md-6">
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+waitlist.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ waitlist.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+waitlist.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ waitlist.user.email || 'N/I' }}
              </a>
            </div>
            <div class="centered">
              <i class="bi bi-person-vcard mx-1"></i> {{ waitlist.user.idNumber || 'N/I' }}
            </div>
          </div>
          <div class="d-none d-md-block col-12 col-md-6">
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'https://wa.me/'+waitlist.user.phone"
                target="_blank">
                <i class="bi bi-whatsapp mx-1 "></i> {{ waitlist.user.phone || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <a
                class="btn-block whatsapp-link"
                :href="'mailto'+waitlist.user.email"
                target="_blank">
                <i class="bi bi-envelope mx-1"></i> {{ waitlist.user.email || 'N/I' }}
              </a>
            </div>
            <div class="lefted">
              <i class="bi bi-person-vcard mx-1"></i> {{ waitlist.user.idNumber || 'N/I' }}
            </div>
          </div>
        </div>
        <div class="row m-0 mt-3 centered">
          <Spinner :show="loading"></Spinner>
          <div v-if="availableBlocks && availableBlocks.length > 0">
            <div class="col-12 centered" v-if="!loading">
              <select class="btn btn-md btn-light fw-bold text-dark select" aria-label=".form-select-sm" v-model="block">
                <option v-for="block in availableBlocks" :key="block.number" :value="block" id="select-block">{{ block.hourFrom }} - {{ block.hourTo }}</option>
              </select>
              <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3"
                @click="process()"
                :disabled="waitlist.status === 'PROCESSED' || waitlist.cancelled || !block"
                >
                <i class="bi bi-person-check-fill"> </i>
              </button>
            </div>
          </div>
          <Alert :show="alertError === undefined" :stack="302"></Alert>
        </div>
        <div class="row m-0 mt-3 centered">
          <div class="col">
            <span class="metric-card-details mx-1"><strong>Id:</strong> {{ waitlist.id }}</span>
            <span class="metric-card-details"><strong>Date:</strong> {{ waitlist.createdDate }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .2rem;
  margin: .5rem;
  margin-bottom: 0;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
}
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  font-size: .8rem;
}
.details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: 1.1rem;
  border: 1.5px solid var(--gris-default);
  border-top: 0;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: .7rem;
  color: var(--color-text);
}
.metric-card-title {
  margin: .2rem;
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.metric-card-detail-subtitle {
  font-size: .72rem;
  font-weight: 400;
  line-height: .7rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .5rem;
}
.act-icon {
  color: var(--azul-es);
  cursor: pointer;
  margin: .5rem;
}
.whatsapp-link {
  color: var(--color-text);
  cursor: pointer;
  text-decoration: underline;
}
.whatsapp-link:hover {
  color: var(--gris-default);
  cursor: pointer;
  text-decoration: underline;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: .7rem;
  font-weight: 400;
}
</style>