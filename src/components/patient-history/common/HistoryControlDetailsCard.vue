<script>
import { getDate } from '../../../shared/utils/date';
import { getControlStatusTypes } from '../../../shared/utils/data';
import { globalStore } from '../../../stores';

export default {
  name: 'HistoryControlDetailsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: undefined },
    date: { type: String, default: undefined },
    status: { type: String, default: undefined },
    reason: { type: String, default: undefined },
    index: { type: Number, default: undefined },
    commerce: { type: Object, default: {} },
    clientId: { type: String, default: undefined },
    toggles: { type: Object, default: {} }
  },
  data() {
    const store = globalStore();
    return {
      showAdd: false,
      extendedControlEntity: false,
      newResult: '',
      newStatus: 'CONFIRMED',
      statuses: [],
      store,
      userType: undefined,
    }
  },
  beforeMount() {
    this.statuses = getControlStatusTypes();
  },
  methods: {
    getDate(date) {
      return getDate(date);
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    getStatusIcon(status) {
      if (status === 'PENDING') {
        return 'bi-clock-fill yellow-icon';
      } else if (status === 'PROCCESSED') {
        return 'bi-check-circle-fill green-icon';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill red-icon';
      } else {
        'bi-clock-fill blue-icon';
      }
    },
    update() {
      this.$emit('onSave', this.index, this.reason, this.newStatus, this.newResult);
    },
    getAttention() {
      const commerceKeyName = this.commerce.keyName;
      let url = `/interno/negocio/commerce/${commerceKeyName}/filas`;
      if (this.userType === 'collaborator') {
        url = `/interno/commerce/${commerceKeyName}/filas`;
      }
      let resolvedRoute;
      let query = {};
      if (this.clientId) {
        query['client'] = this.clientId;
      }
      if (Object.keys(query).length === 0) {
        resolvedRoute = this.$router.resolve({ path: url });
      } else {
        resolvedRoute = this.$router.resolve({ path: url, query });
      }
      window.open(resolvedRoute.href, '_blank');
    },
    showUpdate(){
      this.extendedControlEntity = !this.extendedControlEntity;
    }
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
      }
    },
  }
}
</script>

<template>
  <div v-if="show" class="metric-card">
    <div v-if="date">
      <span class="lefted badge rounded-pill bg-primary"> {{ getDate(date) }}</span>
    </div>
    <div class="fw-bold">
      <div class="col">
      <i :class="`bi ${getStatusIcon(status)} mx-1`"></i> {{ $t(`controlReasonTypes.${reason}`) }}
      </div>
      <div class="row">
        <div class="col">
          <a class="confirm-payment details-title"
            href="#"
            v-if="toggles['patient.history.control-update'] && status === 'PENDING'"
            @click.prevent="showUpdate()">
            <i class="bi bi-pencil-fill"></i> <span class="step-title fw-bold">{{ $t("patientHistoryView.attendControl") }}</span>
            <i class="dark" :class="`bi ${extendedControlEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </a>
        </div>
        <div class="col">
          <a class="confirm-payment details-title"
            v-if="toggles['patient.history.control-update'] && status === 'PENDING'"
            @click.prevent="getAttention()">
            <i class="bi bi-box-arrow-up-right"></i> {{ $t("collaboratorBookingsView.create") }}
          </a>
        </div>
      </div>
    </div>
    <div class="centered paragraph">
      <span class="m-1">
        {{ content }}
      </span>
    </div>
    <div
      :class="{ show: extendedControlEntity }"
      class="detailed-data transition-slow">
      <div class="row">
        <div class="col-12 my-1">
          <label class="metric-card-subtitle mx-2 habit-title" for="select-status"> {{ $t("patientHistoryView.controlStatus") }} </label>
          <select class="btn btn-sm btn-light fw-bold text-dark select" v-model="newStatus">
            <option v-for="status in statuses" :key="status.name" :value="status.id" id="select-queue">{{ $t(`controlStatusTypes.${status.id}`) }}</option>
          </select>
        </div>
        <div class="col-12 my-1">
          <label class="form-check-label metric-card-subtitle mt-2">{{  $t("businessPatientHistoryItemAdmin.comment") }}</label>
          <textarea
            :disabled="!toggles['patient.history.control-edit']"
            class="form-control form-control-sm"
            id="commennt"
            rows="5"
            :max="500"
            :placeholder="$t('businessPatientHistoryItemAdmin.write')"
            :value="newResult">
          </textarea>
        </div>
        <div class="col-12">
          <button class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 mt-2"
            @click="update()"
            :disabled="!toggles['patient.history.control-update']">
            <i class="bi bi-check-fill"> </i> {{ $t("patientHistoryView.update") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .5rem;
  border-radius: .5rem;
  border: 1px solid var(--gris-default);
}
.paragraph {
  font-size: .8rem;
  line-height: .9rem;
}
.show {
  padding: 5px;
  max-height: 400px !important;
  overflow-y: auto;
}
.confirm-payment {
  cursor: pointer;
  line-height: .8rem;
}
.details-title {
  text-decoration: underline;
  font-size: .8rem;
  color: var(--color-text);
  cursor: pointer;
}
</style>