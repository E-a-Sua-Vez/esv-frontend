<script>
import { reactive, toRefs, ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import QueueButton from '../common/QueueButton.vue';
import { dateYYYYMMDD } from '../../shared/utils/date';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'NonWorkingDatesManager',
  components: { Warning, Message, QueueButton },
  props: {
    show: { type: Boolean, default: false },
    locale: { type: String, default: 'es' },
    serviceInfo: { type: Object, default: () => ({}) },
    level: { type: String, default: 'commerce' }, // 'business', 'commerce', 'queue'
    readonly: { type: Boolean, default: false },
  },
  emits: ['update:serviceInfo'],
  async setup(props, { emit }) {
    const { t } = useI18n();
    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });

    const calendarAttributes = ref([
      {
        key: 'NonWorking',
        highlight: {
          color: 'red',
          fillMode: 'solid',
        },
        dates: [],
      },
    ]);

    const { show, locale, serviceInfo, level, readonly } = toRefs(props);

    const state = reactive({
      selectedDate: null,
      selectedMonth: new DateModel().toString().slice(0, 7),
      minDate: new Date(),
      nonWorkingDates: [],
      errorsDateAdd: [],
      filteredDates: [],
      page: 1,
      totalPages: 0,
      limit: 10,
    });

    const updateCalendarAttributes = () => {
      if (state.nonWorkingDates && state.nonWorkingDates.length > 0) {
        const dates = state.nonWorkingDates.map(dateStr => {
          const [year, month, day] = dateStr.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[0].dates = dates;
      } else {
        calendarAttributes.value[0].dates = [];
      }
    };

    const updateFilteredDates = () => {
      if (!state.nonWorkingDates || state.nonWorkingDates.length === 0) {
        state.filteredDates = [];
        state.totalPages = 0;
        return;
      }

      const [year, month] = state.selectedMonth.split('-');
      const prefix = `${year}-${month}`;

      const monthDates = state.nonWorkingDates
        .filter(date => date.startsWith(prefix))
        .sort()
        .reverse();

      state.totalPages = Math.ceil(monthDates.length / state.limit);
      const start = (state.page - 1) * state.limit;
      const end = start + state.limit;
      state.filteredDates = monthDates.slice(start, end);
    };

    // Initialize non-working dates
    watch(() => serviceInfo.value, (newValue) => {
      if (newValue && newValue.nonWorkingDates) {
        state.nonWorkingDates = [...newValue.nonWorkingDates];
        updateCalendarAttributes();
        updateFilteredDates();
      } else {
        state.nonWorkingDates = [];
        updateCalendarAttributes();
      }
    }, { immediate: true, deep: true });

    const addNonWorkingDate = () => {
      if (readonly.value) return;

      state.errorsDateAdd = [];

      if (!state.selectedDate) {
        state.errorsDateAdd.push('businessCommercesAdmin.pleaseSelectDate');
        return;
      }

      const dateStr = dateYYYYMMDD(state.selectedDate);

      // Check if already exists
      if (state.nonWorkingDates.includes(dateStr)) {
        state.errorsDateAdd.push('businessCommercesAdmin.dateAlreadyMarked');
        return;
      }

      // Add the date
      state.nonWorkingDates.push(dateStr);
      state.nonWorkingDates.sort();

      // Update serviceInfo
      const updatedServiceInfo = {
        ...serviceInfo.value,
        nonWorkingDates: [...state.nonWorkingDates],
      };

      emit('update:serviceInfo', updatedServiceInfo);

      updateCalendarAttributes();
      updateFilteredDates();

      // Reset selection
      state.selectedDate = null;
    };

    const deleteNonWorkingDate = (dateStr) => {
      if (readonly.value) return;

      state.nonWorkingDates = state.nonWorkingDates.filter(d => d !== dateStr);

      // Update serviceInfo
      const updatedServiceInfo = {
        ...serviceInfo.value,
        nonWorkingDates: [...state.nonWorkingDates],
      };

      emit('update:serviceInfo', updatedServiceInfo);

      updateCalendarAttributes();
      updateFilteredDates();
    };

    const handleCalendarMove = (pages) => {
      if (pages && pages.length > 0) {
        const pagesIn = pages[0].id.split('-');
        const page = `${pagesIn[0]}-${pagesIn[1]}`;
        state.selectedMonth = page;
        state.page = 1;
        updateFilteredDates();
      }
    };

    const nextPage = () => {
      if (state.page < state.totalPages) {
        state.page++;
        updateFilteredDates();
      }
    };

    const previousPage = () => {
      if (state.page > 1) {
        state.page--;
        updateFilteredDates();
      }
    };

    const levelLabel = computed(() => {
      const labels = {
        business: t('businessCommercesAdmin.levelBusiness'),
        commerce: t('businessCommercesAdmin.levelCommerce'),
        queue: t('businessCommercesAdmin.levelQueue')
      };
      return labels[level.value] || level.value;
    });

    const totalDatesCount = computed(() => state.nonWorkingDates.length);

    return {
      state,
      dateMask,
      calendarAttributes,
      addNonWorkingDate,
      deleteNonWorkingDate,
      handleCalendarMove,
      nextPage,
      previousPage,
      levelLabel,
      totalDatesCount,
      dateYYYYMMDD,
    };
  },
};
</script>

<template>
  <div v-if="show" class="non-working-dates-manager">
    <div class="manager-content">
      <!-- Calendar for selection -->
      <div class="calendar-section">
        <div class="section-label">{{ $t('businessCommercesAdmin.selectNonWorkingDate') }}</div>
        <VDatePicker
          :locale="locale"
          v-model="state.selectedDate"
          :mask="dateMask"
          :min-date="state.minDate"
          :attributes="calendarAttributes"
          @did-move="handleCalendarMove"
          :disabled="readonly"
        />

        <div v-if="!readonly" class="add-button-container">
          <button
            class="btn btn-sm btn-danger"
            @click="addNonWorkingDate"
            :disabled="!state.selectedDate"
          >
            <i class="bi bi-plus-circle"></i>
            {{ $t('businessCommercesAdmin.markAsNonWorking') }}
          </button>
        </div>

        <div v-if="state.errorsDateAdd.length > 0" class="errors-container">
          <Warning
            v-for="(error, index) in state.errorsDateAdd"
            :key="index"
            :show="true"
            :message="$t(error)"
          />
        </div>
      </div>

      <!-- List of non-working dates -->
      <div class="dates-list-section">
        <div class="section-label">
          {{ $t('businessCommercesAdmin.markedDates') }} ({{ state.selectedMonth }})
          <span v-if="state.filteredDates.length > 0" class="text-muted">
            - {{ state.filteredDates.length }} {{ $t('businessCommercesAdmin.inThisMonth') }}
          </span>
        </div>

        <div v-if="state.filteredDates.length === 0" class="empty-state">
          <i class="bi bi-calendar-check"></i>
          <p>{{ $t('businessCommercesAdmin.noNonWorkingDatesThisMonth') }}</p>
        </div>

        <div v-else class="dates-list">
          <div
            v-for="date in state.filteredDates"
            :key="date"
            class="date-item"
          >
            <div class="date-info">
              <i class="bi bi-calendar-x text-danger"></i>
              <span class="date-text">{{ date }}</span>
            </div>
            <button
              v-if="!readonly"
              class="btn btn-sm btn-outline-danger delete-btn"
              @click="deleteNonWorkingDate(date)"
              :title="$t('delete')"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="state.totalPages > 1" class="pagination-controls">
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="previousPage"
            :disabled="state.page === 1"
          >
            <i class="bi bi-chevron-left"></i>
          </button>
          <span class="page-info">{{ state.page }} / {{ state.totalPages }}</span>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="nextPage"
            :disabled="state.page === state.totalPages"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="manager-footer">
      <Message
        :icon="'info-circle'"
        :content="$t('businessCommercesAdmin.nonWorkingDatesInfo')"
      />
    </div>
  </div>
</template>

<style scoped>
.non-working-dates-manager {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0.75rem;
}

.manager-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .manager-content {
    grid-template-columns: 1fr;
  }
}

.calendar-section,
.dates-list-section {
  background: white;
  border-radius: 6px;
  padding: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-label {
  font-weight: 600;
  font-size: 0.8125rem;
  color: #6c757d;
  margin-bottom: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-button-container {
  margin-top: 0.75rem;
  display: flex;
  justify-content: center;
}

.errors-container {
  margin-top: 0.75rem;
}

.dates-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 400px;
  overflow-y: auto;
}

.date-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  transition: all 0.2s;
}

.date-item:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.date-info i {
  font-size: 0.875rem;
}

.date-text {
  font-weight: 500;
  font-size: 0.875rem;
  color: #212529;
}

.delete-btn {
  padding: 0.125rem 0.375rem;
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0.75rem;
  color: #6c757d;
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.3;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #dee2e6;
}

.page-info {
  font-size: 0.8125rem;
  color: #6c757d;
  min-width: 60px;
  text-align: center;
}

.manager-footer {
  margin-top: 0.75rem;
}
</style>
