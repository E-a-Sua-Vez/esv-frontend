<script>
import { reactive, toRefs, ref, watch, computed } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import QueueButton from '../common/QueueButton.vue';
import { getDate, dateYYYYMMDD } from '../../shared/utils/date';
import { DateModel } from '../../shared/utils/date.model';

export default {
  name: 'SpecificCalendarForm',
  components: { Warning, Message, VueRecaptcha, QueueButton },
  props: {
    show: { type: Boolean, default: false },
    locale: { type: String, default: 'es' },
    structure: { type: Object, default: {} }
  },
  async setup(props) {

    let dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    let disabledDates = ref([
      {
        repeat: {
          weekdays: [],
        }
      }
    ]);
    let calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: []
      }
    ])

    const {
      show,
      locale,
      structure
    } = toRefs(props);


    const state = reactive({
      selectedDate: (new Date()).setDate(new Date().getDate()),
      selectedHourFrom: undefined,
      selectedHourTo: undefined,
      selectedMonth: new DateModel().toString().slice(0,7),
      selectedDates: {},
      errorsDateAdd: [],
      filteredDates: [],
      counter: 0,
      page: 1,
      totalPages: 0,
      limit: 5
    })

    const timeConvert = (num) => {
      if (num) {
        const [hours, min = 0] = num.toString().split('.');
        let minutes = (num - hours) * 60;
        if (minutes === 0) {
          minutes = '00';
        }
        return `${hours}:${minutes}`;
      }
    };

    const addSpecificDate = () => {
      state.errorsDateAdd = [];
      let selectedDates = structure.value.serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours')
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + (+minuteFrom / 60);
            const hourNumberTo = +hourTo + (+minuteTo / 60);
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo
            }
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate');
        }
      }
      structure.value.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    }

    const updateAddSpecificDate = () => {
      state.errorsDateAdd = [];
      let selectedDates = structure.value.serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours')
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + (+minuteFrom / 60);
            const hourNumberTo = +hourTo + (+minuteTo / 60);
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo
            }
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate')
        }
      }
      structure.value.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    }

    const deleteSpecificDate = (index, date) => {
      let selectedDates = structure.value.serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      structure.value.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    }

    const updateDeleteSpecificDate = (date) => {
      let selectedDates = structure.value.serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      structure.value.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    }

    const setPage = (pageIn) => {
      state.page = pageIn;
      const selectedDates = structure.value.serviceInfo.specificCalendarDays;
      const days = Object.keys(selectedDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      if (days && days.length > 0) {
        refresh(days);
        calendarAttributes.value[0].dates = [];
        calendarAttributes.value[0].dates.push(...days);
      }
    }

    const refresh = (dates) => {
      if (dates && dates.length > 0) {
        const counter = dates.length;
        state.counter = counter;
        const total = counter / state.limit;
        const totalB = Math.trunc(total);
        state.totalPages = totalB <= 0 ? 1 : counter % state.limit === 0 ? totalB : totalB + 1;
        const filtered = dates.slice(((state.page - 1) * state.limit), (state.page * state.limit));
        state.filteredDates = filtered;
      } else {
        state.counter = 0;
        state.totalPages = 0;
      }
    }

    const getSelectedDatesByCalendarMonth = async (pages) => {
      if (pages && pages.length > 0) {
        const pagesIn = pages[0].id.split('-');
        const page = `${pagesIn[0]}-${pagesIn[1]}`;
        state.selectedMonth = page;
      }
    }

    const getSelectedSpecificDatesByMonth = async (date) => {
      if (date) {
        calendarAttributes.value[0].dates = [];
        const [year, month] = dateYYYYMMDD(date).split('-');
        const thisMonth = +month - 1;
        const nextMonth = +month;
        const dateFrom = new DateModel(new Date(+year, thisMonth, 1)).toString();
        const dateTo = new DateModel(new Date(+year, nextMonth, 0)).toString();
        const selectedDates = structure.value.serviceInfo.specificCalendarDays;
        const days = Object.keys(selectedDates).filter(date => date >= dateFrom && date <= dateTo).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        if (days && days.length > 0) {
          refresh(days);
          calendarAttributes.value[0].dates = [];
          calendarAttributes.value[0].dates.push(...days);
        } else {
          state.filteredDates = [];
        }
      }
    }

    const changeSelectedMonth = computed(() => {
      let { selectedMonth } = state;
      if (selectedMonth) {
        getSelectedSpecificDatesByMonth(state.selectedMonth);
      }
      return {
        selectedMonth
      }
    })

    watch(
      changeSelectedMonth,
      async () => { }
    )

    return {
      state,
      show,
      dateMask,
      disabledDates,
      calendarAttributes,
      locale,
      setPage,
      timeConvert,
      getDate,
      addSpecificDate,
      updateAddSpecificDate,
      deleteSpecificDate,
      updateDeleteSpecificDate,
      getSelectedDatesByCalendarMonth
    }
  }
}
</script>
<template>
  <div :id="`dates-${structure.id}`" v-if="show">
    <div class="mb-2">
      <div class="row">
        <div class="my-2 selected-days-title">
          <span class="selected-days-title"> {{ $t("businessCommercesAdmin.selectSpecificDate") }} </span>
        </div>
        <div class="col-12 col-md-6">
          <VDatePicker
            :locale="state.locale"
            v-model.string="state.selectedDate"
            :mask="dateMask"
            :disabled-dates="disabledDates"
            :attributes='calendarAttributes'
            @did-move="getSelectedDatesByCalendarMonth"
          />
        </div>
        <div class="col-12 col-md-6 mt-2">
          <div class="my-1 selected-days-title">
            <span class="selected-days-title text-label"> {{ $t("businessCommercesAdmin.selectedDate") }} </span>
          </div>
          <div class="col-12">
            <span class="badge bg-primary my-1 p-2">{{ getDate(new Date(state.selectedDate)) }} </span>
          </div>
          <div class="my-1 selected-days-title">
            <span class="selected-days-title text-label"> {{ $t("businessCommercesAdmin.hours") }} </span>
          </div>
          <div class="row">
            <div class="col-5">
              <input
                type="time"
                class="form-control form-control-sm"
                v-model="state.selectedHourFrom"
              />
            </div>
            <div class="col-2">
              -
            </div>
            <div class="col-5">
              <input
                type="time"
                class="form-control form-control-sm"
                v-model="state.selectedHourTo"
              />
            </div>
          </div>
          <div class="row my-2">
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
              @click="addSpecificDate(index)"
              :disabled="!state.selectedDate"
              >
              {{ $t("businessCommercesAdmin.addDate") }} <i class="bi bi-calendar-date-fill"></i>
            </button>
            <div class="row g-1 errors" id="feedback" v-if="(state.errorsDateAdd.length > 0)">
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in state.errorsDateAdd" :key="index">
                    {{ $t(error) }}
                  </li>
                </template>
              </Warning>
            </div>
          </div>
        </div>
        <div v-if="structure.serviceInfo.specificCalendarDays">
          <hr>
          <div class="centered">
            <nav>
              <ul class="pagination pagination-ul">
                <li class="page-item">
                  <button
                    class="btn btn-sm fw-bold btn-dark rounded-pill px-3"
                    aria-label="Previous"
                    @click="setPage(state.page - 1)"
                    :disabled="state.page === 1 || state.totalPages === 0">
                    <span aria-hidden="true">&laquo;</span>
                  </button>
                </li>
                <li>
                  <select class="btn btn-sm btn-light fw-bold text-dark select mx-1 py-1" v-model="state.page" :disabled="state.totalPages === 0">
                    <option v-for="pag in state.totalPages" :key="pag" :value="pag" id="select-queue">{{ pag }}</option>
                  </select>
                </li>
                <li class="page-item">
                  <button class="btn btn-sm fw-bold btn-dark rounded-pill px-3"
                    aria-label="Next"
                    @click="setPage(state.page + 1)"
                    :disabled="state.page === state.totalPages || state.totalPages === 0">
                    <span aria-hidden="true">&raquo;</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
          <div v-if="state.filteredDates && state.filteredDates.length > 0">
            <div class="row centered my-1 mx-1" v-for="date in state.filteredDates" :key="date">
              <div class="col-4">
                <span class="badge bg-secondary p-2"> {{ getDate(new Date(date)) }} </span>
              </div>
              <div class="col-5 selected-days-title">
                {{ timeConvert(structure.serviceInfo.specificCalendarDays[date].attentionHourFrom) }} - {{ timeConvert(structure.serviceInfo.specificCalendarDays[date].attentionHourTo) }}
              </div>
              <div class="col-3">
                <button
                  class="btn btn-sm btn-size btn-danger rounded-pill px-3"
                  @click="deleteSpecificDate(index, date)"
                  >
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('businessCommercesAdmin.message.4.title')"
              :content="$t('businessCommercesAdmin.message.4.content')" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.commerce-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
.selected-days-title {
  line-height: 1rem;
  font-size: .9rem;
}
</style>