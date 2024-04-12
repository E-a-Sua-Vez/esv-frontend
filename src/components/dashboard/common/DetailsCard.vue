<script>
import Popper from "vue3-popper";
import { createEvent } from '../../../application/services/event';

export default {
  name: 'DetailsCard',
  components: { Popper },
  props: {
    show: { type: Boolean, default: true },
    data: { type: [String, Number], default: 'No Data' },
    subdata: { type: [String, Number], default: undefined },
    subdatapastperiod: { type: Object, default: undefined },
    subdatapastmonth: { type: Object, default: undefined },
    subdatacurrentperiod: { type: Object, default: undefined },
    title: { type: String, default: 'No Title' },
    showTooltip: { type: Boolean, default: false },
    description: { type: String, default: 'No Data' },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    showDetailsSection: { type: Boolean, default: true }
  },
  data() {
    return {
      reportedError: false,
      extendedEntity: false,
    }
  },
  methods: {
    reportError() {
      const body = { error: this.stack };
      const errorReported = new ErrorReported(new Date(), body);
      createEvent(errorReported);
      this.reportedError = true;
    },
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    showTrend(period) {
      if (period && period.number >= 0) {
        if (this.data > period.number) {
          return 'bi-arrow-up-circle-fill green-icon';
        } else if (period.number === this.data) {
          return 'bi-asterisk blue-icon';
        } else if (this.data < period.number) {
          return 'bi-arrow-down-circle-fill red-icon';
        } else {
          return 'bi-exclamation-circle-fill blue-icon';
        }
      }
      return '';
    },
    npsColorTrend(data) {
      if (!data) {
        return 'blue-icon';
      } else if (data < 0) {
        return 'red-icon';
      } else if (data <= 39) {
        return 'yellow-icon';
      } else if (data <= 74) {
        return 'blue-icon';
      } else {
        return 'green-icon';
      }
    },
    getPastPeriodPercentage(period) {
      if (period && period.number >= 0) {
        const percentage = this.data * 100 / (period.number === 0 ? 1 : period.number);
        return parseFloat(percentage.toFixed(2));
      }
      return 0;
    },
    getPastMonthPercentage(pastPeriod, currentPeriod) {
      if (pastPeriod && currentPeriod && pastPeriod.number && currentPeriod.number) {
        const percentage = currentPeriod.number * 100 / pastPeriod.number;
        return percentage === Infinity ? pastPeriod.number * 100 : parseFloat(percentage.toFixed(2)) || pastPeriod.number * 100;
      }
      return 0;
    },
    getData() {
      if (this.data !== undefined && this.data !== '') {
        if (Number.isNaN()) {
          return this.data;
        } else {
          try {
            return parseFloat(this.data.toFixed(2)) || 0;
          } catch (error) {
            return this.data;
          }
        }
      }
      return 'No Data';
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
  <div v-if="show">
    <div class="metric-card h4">
      <div class="metric-card-title centered">
        <span> {{ title }} </span>
      </div>
      <div class="centered">
        <i :class="`bi ${icon} ${iconStyleClass ? iconStyleClass : npsColorTrend(data)}`"></i>
        <span class="fw-bold px-2"> {{ getData() }}
          <span v-if="subdata" class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ subdata }} </span>
          <span class="metric-card-subtitle">
            <i :class="`bi ${showTrend(subdatapastperiod)}`"></i>
          </span>
        </span>
        <Popper
          v-if="showTooltip"
          :class="'dark'"
          arrow
          disableClickAway
          :content="description">
          <i class='bi bi-info-circle-fill h7'></i>
        </Popper>
      </div>
      <div v-if="subdatapastperiod || subdatapastmonth" class="row m-1">
        <div v-if="subdatapastperiod" class="col">
          <span class="metric-card-subtitle">
            <i :class="`bi ${showTrend(subdatapastperiod)} mx-1`"></i>
            <span class="fw-bold metric-card-detail-title m-1">
              {{ getPastPeriodPercentage(subdatapastperiod) }} % <br>
              <span v-if="subdatapastperiod.number >= 0" class="badge rounded-pill bg-secondary">
                {{ data + '/' + subdatapastperiod.number }}
              </span>
            </span>
            <p v-if="subdatapastperiod.from && subdatapastperiod.to" class="metric-card-detail-subtitle mt-1">
              {{ $t('dashboard.items.attentions.22')}} ({{ subdatapastperiod.from.substring(2,10) }} | {{ subdatapastperiod.to.substring(2,10) }})
            </p>
          </span>
        </div>
        <div v-if="subdatapastmonth" class="col">
          <span class="metric-card-subtitle">
            <i :class="`blue-icon bi bi-speedometer mx-1`"></i>
            <span class="fw-bold metric-card-detail-title m-1">
              {{ getPastMonthPercentage(subdatapastmonth, subdatacurrentperiod) }} % <br>
              <span v-if="subdatapastmonth.number" class="badge rounded-pill bg-secondary">
                {{ subdatacurrentperiod.number + '/' + subdatapastmonth.number }}
              </span>
            </span>
            <p v-if="subdatapastperiod.from && subdatapastperiod.to" class="metric-card-detail-subtitle mt-1">
              {{ $t('dashboard.items.attentions.23')}} ({{ subdatacurrentperiod.from.substring(2,7) }} | {{ subdatapastmonth.to.substring(2,7) }})
            </p>
            <p class="metric-card-detail-subtitle mt-1"> </p>
          </span>
        </div>
      </div>
    </div>
    <div class="details-arrow" v-if="showDetailsSection">
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
        <slot name="details"> </slot>
      </div>
    </div>
    <div v-else class="no-details-arrow">
      <span> - </span>
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
.show {
  padding: 10px;
  max-height: 800px !important;
  overflow-y: auto;
}
.details-title {
  cursor: pointer;
  text-decoration: underline;
  font-size: .7rem;
  color: var(--color-text);
}
.metric-card-title {
  margin: .2rem;
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: .7rem;
}
.no-details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: .3rem;
  border: 1.5px solid var(--gris-default);
  border-top: 0;
  color: var(--color-background);
}
</style>