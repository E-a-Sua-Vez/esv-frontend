<script>
import { DateModel } from '../../../shared/utils/date.model';

export default {
  name: 'DateRangeFilters',
  props: {
    startDate: { type: String, default: undefined },
    endDate: { type: String, default: undefined },
    showQuickButtons: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    showSearchButton: { type: Boolean, default: true },
  },
  emits: ['update:startDate', 'update:endDate', 'quick-select', 'search'],
  methods: {
    handleStartDateChange(event) {
      this.$emit('update:startDate', event.target.value);
    },
    handleEndDateChange(event) {
      this.$emit('update:endDate', event.target.value);
    },
    handleQuickSelect(type) {
      const date = new Date().toISOString().slice(0, 10);
      let startDate, endDate;

      if (type === 'today') {
        startDate = date;
        endDate = date;
      } else if (type === 'currentMonth') {
        startDate = new DateModel(date).startOfMonth().toString();
        endDate = new DateModel(date).endOfMonth().toString();
      } else if (type === 'lastMonth') {
        startDate = new DateModel(date).substractMonths(1).startOfMonth().toString();
        endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      } else if (type === 'lastThreeMonths') {
        startDate = new DateModel(date).substractMonths(3).startOfMonth().toString();
        endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      }

      this.$emit('quick-select', { type, startDate, endDate });
    },
    handleSearch() {
      this.$emit('search');
    },
  },
};
</script>

<template>
  <div class="date-range-filters">
    <div v-if="showQuickButtons" class="row my-2">
      <div class="col-6 mb-2">
        <button
          class="btn btn-sm btn-dark rounded-pill w-100"
          @click="handleQuickSelect('today')"
          :disabled="disabled"
        >
          {{ $t('dashboard.today') || 'Hoy' }}
        </button>
      </div>
      <div class="col-6 mb-2">
        <button
          class="btn btn-sm btn-dark rounded-pill w-100"
          @click="handleQuickSelect('currentMonth')"
          :disabled="disabled"
        >
          {{ $t('dashboard.thisMonth') || 'Este Mes' }}
        </button>
      </div>
      <div class="col-6 mb-2">
        <button
          class="btn btn-sm btn-dark rounded-pill w-100"
          @click="handleQuickSelect('lastMonth')"
          :disabled="disabled"
        >
          {{ $t('dashboard.lastMonth') || 'Mes Pasado' }}
        </button>
      </div>
      <div class="col-6 mb-2">
        <button
          class="btn btn-sm btn-dark rounded-pill w-100"
          @click="handleQuickSelect('lastThreeMonths')"
          :disabled="disabled"
        >
          {{ $t('dashboard.lastThreeMonths') || 'Últimos 3 Meses' }}
        </button>
      </div>
    </div>
    <div class="mb-3">
      <label class="form-label fw-bold mb-2">{{
        $t('dashboard.startDate') || 'Fecha Inicio'
      }}</label>
      <input
        type="date"
        class="form-control metric-controls"
        :value="startDate"
        @input="handleStartDateChange"
        :disabled="disabled"
      />
    </div>
    <div class="mb-3">
      <label class="form-label fw-bold mb-2">{{ $t('dashboard.endDate') || 'Fecha Fin' }}</label>
      <input
        type="date"
        class="form-control metric-controls"
        :value="endDate"
        @input="handleEndDateChange"
        :disabled="disabled"
      />
    </div>
    <div v-if="showSearchButton" class="mb-3">
      <button
        class="btn btn-sm btn-dark rounded-pill w-100"
        @click="handleSearch"
        :disabled="disabled"
      >
        <i class="bi bi-search"></i> {{ $t('dashboard.refresh') || 'Buscar' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.date-range-filters {
  width: 100%;
}
</style>
