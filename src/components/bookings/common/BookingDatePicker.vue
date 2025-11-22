<script>
import { ref, reactive, onBeforeMount, computed, watch, onUnmounted, toRefs } from 'vue';
import { getActiveFeature } from '../../../shared/features';
import { bookingCollection } from '../../../application/firebase';
import { DateModel } from '../../../shared/utils/date.model';
import Message from '../../common/Message.vue';
import Alert from '../../common/Alert.vue';
import Spinner from '../../common/Spinner.vue';
import { getPendingBookingsBetweenDates } from '../../../application/services/booking';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getServicesById } from '../../../application/services/service';

export default {
  name: 'BookingDatePicker',
  components: { Message, Alert, Spinner },
  props: {
    show: { type: Boolean, default: true },
    booking: { type: Object, default: {} },
    commerce: { type: Object, default: {} },
    queue: { type: Object, default: {} },
    view: { type: String, default: 'monthly' },
    groupedQueues: { type: Object, default: {} },
    amountofBlocksNeeded: { type: Number, default: 0 },
    receiveBookingEdit: { type: Function, default: () => {} },
  },
  async setup(props) {
    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    const disabledDates = ref([
      {
        repeat: {
          weekdays: [],
        },
      },
    ]);
    const calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Unavailable',
        highlight: {
          color: 'red',
          fillMode: 'light',
        },
        dates: [],
      },
      {
        key: 'Reserves',
        highlight: {
          color: 'blue',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);

    const loading = ref(false);
    const loadingHours = ref(false);
    const loadingCalendar = ref(false);
    let unsubscribeBookings = () => {};

    const { show, commerce, queue, booking, amountofBlocksNeeded, view, groupedQueues } =
      toRefs(props);

    const { receiveBookingEdit } = props;

    const state = reactive({
      collaborators: [],
      queue: {},
      services: [],
      selectedServices: [],
      currentChannel: 'QR',
      newUser: {},
      errorsAdd: [],
      date: undefined,
      blocksByDay: {},
      blocks: [],
      block: {},
      attentionBlock: {},
      availableBookingBlocks: [],
      availableAttentionBlocks: [],
      availableBookingSuperBlocks: [],
      availableAttentionSuperBlocks: [],
      locale: 'es',
      minDate: new Date().setDate(new Date().getDate() + 1),
      maxDate: new Date().setDate(new Date().getDate() + 90),
      hourBlocks: [],
      bookings: ref([]),
      attentions: ref([]),
      bookingAvailable: true,
      attentionAvailable: true,
      allBookings: ref([]),
      allAttentions: ref([]),
      groupedBookingsByQueue: {},
      groupedAttentionsByQueue: {},
      showToday: false,
      showReserve: false,
      waitlistCreated: false,
      canBook: false,
      totalServicesResquested: 0,
      totalDurationRequested: 0,
      amountofBlocksNeeded: 0,
      blocksBySpecificCalendarDate: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        getQueue(queue.value);
        if (queue.value && queue.value.id !== undefined) {
          const queueType = queue.value.type;
          if (queueType === 'COLLABORATOR') {
            const collaborator = await getCollaboratorDetailsById(queue.value.collaboratorId);
            if (collaborator && collaborator.id) {
              queue.value.collaborator = collaborator;
              queue.value.services = collaborator.services;
              queue.value.servicesName = queue.value.services.map(serv => serv.name);
              queues = [queue];
              groupedQueues.value[queueType] = [queue];
              queueId = queue.value.id;
            }
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    onUnmounted(() => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
    });

    const formattedDate = date => {
      if (date) {
        return new Date(date).toISOString().slice(0, 10);
      }
    };

    const getBookings = () => {
      const { unsubscribe } = updatedBookings(formattedDate(state.date), queue.value.id);
      unsubscribeBookings = unsubscribe;
    };

    const updatedBookings = (date, queueId) => {
      const values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId !== undefined) {
        const bookingsQuery = bookingCollection
          .where('commerceId', '==', commerce.value.id)
          .where('queueId', '==', queueId)
          .where('status', 'in', ['PENDING', 'CONFIRMED'])
          .where('date', '==', date);
        unsubscribe = bookingsQuery.onSnapshot(snapshot => {
          values.value = snapshot.docs.map(doc => {
            const booking = { id: doc.id, ...doc.data() };
            return booking;
          });
        });
      }
      state.allBookings = values;
      return { unsubscribe };
    };

    const getDisabledDates = () => {
      let disabled = [1, 2, 3, 4, 5, 6, 7];
      if (queue.value.serviceInfo && queue.value.serviceInfo.attentionDays) {
        const availableDays = queue.value.serviceInfo.attentionDays;
        if (availableDays.length < 7) {
          const forDeletion = [];
          availableDays.forEach(day => {
            if (day === 7) {
              forDeletion.push(1);
            } else {
              forDeletion.push(day + 1);
            }
          });
          disabled = disabled.filter(item => !forDeletion.includes(item));
          disabledDates.value[0].repeat.weekdays = [];
          disabledDates.value[0].repeat.weekdays.push(...disabled);
        }
      }
    };

    const getBlocksByDay = () => {
      if (!state.date) {
        const day = new Date().getDay();
        return state.blocksByDay[day];
      } else {
        const [year, month, day] = state.date.slice(0, 10).split('-');
        let dayNumber = new Date(+year, +month - 1, +day).getDay();
        if (dayNumber === 0) {
          dayNumber = 7;
        }
        return state.blocksByDay[dayNumber];
      }
    };

    const getQueue = async () => {
      if (queue.value && queue.value.id) {
        if (getActiveFeature(state.commerce, 'booking-block-active', 'PRODUCT')) {
          getDisabledDates();
          state.date = undefined;
          state.block = {};
          state.attentionBlock = {};
        }
      }
    };

    const getAvailableDatesByMonth = async date => {
      loadingHours.value = true;
      const availableDates = [];
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[1].dates = [];
      calendarAttributes.value[2].dates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      const monthBookings =
        (await getPendingBookingsBetweenDates(queue.value.id, dateFrom, dateTo)) || [];
      const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
        const date = booking.date;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
      }, {});
      const dates = Object.keys(bookingsGroupedByDate);
      for (let i = 1; i <= dateTo.getDate(); i++) {
        const key = new Date(dateFrom.setDate(i)).toISOString().slice(0, 10);
        if (new Date(key) > new Date()) {
          availableDates.push(key);
        }
      }
      const forDeletion = [];
      const forReserves = [];
      if (dates && dates.length > 0) {
        dates.forEach(date => {
          const bookings = bookingsGroupedByDate[date];
          const [year, month, day] = date.split('-');
          let dayNumber = new Date(+year, +month - 1, +day).getDay();
          if (dayNumber === 0) {
            dayNumber = 7;
          }
          const blocks = state.blocksByDay[dayNumber] || [];
          if (bookings.length >= blocks.length) {
            forDeletion.push(date);
          } else if (bookings.length >= 1) {
            forReserves.push(date);
          }
        });
      }
      const availability = await availableDates.filter(item => !forDeletion.includes(item));
      const avaliableToCalendar = await availability.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[0].dates.push(...avaliableToCalendar);
      const forDeletionToCalendar = forDeletion.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[1].dates.push(...forDeletionToCalendar);
      loadingHours.value = false;
      const avaliableToReserve = forReserves.map(date => {
        const [year, month, day] = date.split('-');
        return new Date(+year, +month - 1, +day);
      });
      calendarAttributes.value[2].dates.push(...avaliableToReserve);
    };

    const getAvailableSpecificDatesByMonth = async date => {
      loadingHours.value = true;
      if (queue.value.id && date) {
        let availableDates = [];
        calendarAttributes.value[0].dates = [];
        calendarAttributes.value[1].dates = [];
        calendarAttributes.value[2].dates = [];
        const [year, month] = date.split('-');
        const thisMonth = +month - 1;
        const nextMonth = +month;
        const dateFrom = new Date(+year, thisMonth, 1);
        const dateTo = new Date(+year, nextMonth, 0);
        const monthBookings = await getPendingBookingsBetweenDates(
          queue.value.id,
          dateFrom,
          dateTo
        );
        const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
          const date = booking.date;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(booking);
          return acc;
        }, {});
        let specificCalendarDays;
        if (queue.value.serviceInfo && queue.value.serviceInfo.specificCalendarDays) {
          specificCalendarDays = Object.keys(queue.value.serviceInfo.specificCalendarDays);
        } else if (commerce.value.serviceInfo && commerce.value.serviceInfo.specificCalendarDays) {
          specificCalendarDays = Object.keys(commerce.value.serviceInfo.specificCalendarDays) || [];
        }
        availableDates = specificCalendarDays.map(dat => {
          const [year, month, day] = dat.split('-');
          const date = new Date(year, +month - 1, day);
          return new DateModel(date).toString();
        });
        const forDeletion = [];
        const forReserves = [];
        if (availableDates && availableDates.length > 0) {
          let limit = 1;
          if (
            queue.value.serviceInfo !== undefined &&
            queue.value.serviceInfo.blockLimit !== undefined &&
            queue.value.serviceInfo.blockLimit > 0
          ) {
            limit = queue.value.serviceInfo.blockLimit;
          }
          state.blocksBySpecificCalendarDate = await getQueueBlockDetailsBySpecificDayByCommerceId(
            commerce.value.id,
            queue.value.id
          );
          availableDates.forEach(date => {
            const bookings = bookingsGroupedByDate[date] || [];
            const blocks = state.blocksBySpecificCalendarDate[date] || [];
            const blocksNumbers = blocks.map(block => block.number);
            const bookingsReserved = bookings.map(
              booking => booking.block.blockNumbers || booking.block.number
            );
            const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
            const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
            uniqueBlocksReserved.forEach(block => {
              const times = totalBlocksReserved.filter(reserved => reserved === block).length;
              if (times >= limit && !forDeletion.includes(date)) {
                if (
                  uniqueBlocksReserved.length === blocks.length &&
                  blocksNumbers.every(block => totalBlocksReserved.includes(block))
                ) {
                  forDeletion.push(date);
                } else if (bookings.length >= 1) {
                  forReserves.push(date);
                }
              }
            });
            if (
              !forDeletion.includes(date) &&
              date === formattedDate(state.specificCalendarDate) &&
              state.availableBookingBlocks.length === 0 &&
              state.availableBookingSuperBlocks.length === 0
            ) {
              forDeletion.push(date);
            }
          });
          availableDates = availableDates.filter(item => !forDeletion.includes(item));
        }
        const avaliableToCalendar = availableDates.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[0].dates.push(...avaliableToCalendar);
        const forDeletionToCalendar = forDeletion.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[1].dates.push(...forDeletionToCalendar);
        const avaliableToReserve = forReserves.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[2].dates.push(...avaliableToReserve);
      }
      loadingHours.value = false;
    };

    const getAvailableBookingBlocks = bookings => {
      let availableBlocks = [];
      let queueBlocks = [];
      if (queue.value.type !== 'SELECT_SERVICE') {
        if (state.blocks) {
          queueBlocks = state.blocks;
          if (queueBlocks && queueBlocks.length > 0) {
            let bookingsReserved = [];
            if (bookings && bookings.length > 0) {
              bookingsReserved = bookings.map(booking => {
                if (
                  booking.block &&
                  booking.block.blockNumbers &&
                  booking.block.blockNumbers.length > 0
                ) {
                  return [...booking.block.blockNumbers];
                } else {
                  return booking.block.number;
                }
              });
              let limit = 0;
              if (
                queue.value.serviceInfo !== undefined &&
                queue.value.serviceInfo.blockLimit !== undefined &&
                queue.value.serviceInfo.blockLimit > 0
              ) {
                limit = queue.value.serviceInfo.blockLimit;
              }
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = [];
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                if (times >= limit) {
                  blockedBlocks.push(block);
                }
              });
              availableBlocks = queueBlocks.filter(
                block => !bookingsReserved.flat(Infinity).includes(block.number)
              );
            } else {
              availableBlocks = queueBlocks;
            }
          }
        }
      } else {
        if (state.selectedServices && state.selectedServices.length > 0) {
          if (
            groupedQueues.value &&
            groupedQueues.value['COLLABORATOR'] &&
            groupedQueues.value['COLLABORATOR'].length > 0
          ) {
            const candidateQueues = [];
            const services = state.selectedServices.map(serv => serv.id);
            groupedQueues.value['COLLABORATOR'].forEach(queue => {
              if (queue.services && queue.services.length > 0) {
                const availableServices = queue.services.map(serv => serv.id);
                if (services.every(serv => availableServices.includes(serv))) {
                  candidateQueues.push(queue);
                }
              } else {
                candidateQueues.push(queue);
              }
            });
            if (state.blocks) {
              queueBlocks = state.blocks;
              if (queueBlocks && queueBlocks.length > 0) {
                const bookingsReserved = [];
                candidateQueues.push(queue);
                if (candidateQueues && candidateQueues.length > 0) {
                  const bookings = state.allBookings;
                  if (bookings && bookings.length > 0) {
                    const reserved = bookings.map(booking => {
                      if (
                        booking.block &&
                        booking.block.blockNumbers &&
                        booking.block.blockNumbers.length > 0
                      ) {
                        return [...booking.block.blockNumbers];
                      } else {
                        return booking.block.number;
                      }
                    });
                    bookingsReserved.push(reserved);
                  }
                  let limit = candidateQueues.length - 1;
                  if (
                    queue.value.serviceInfo !== undefined &&
                    queue.value.serviceInfo.blockLimit !== undefined &&
                    queue.value.serviceInfo.blockLimit > 0
                  ) {
                    limit = queue.value.serviceInfo.blockLimit;
                  }
                  if (limit > 0) {
                    const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
                    const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                    const blockedBlocks = [];
                    uniqueBlocksReserved.forEach(block => {
                      const times = totalBlocksReserved.filter(
                        reserved => reserved === block
                      ).length;
                      if (times >= limit) {
                        blockedBlocks.push(block);
                      }
                    });
                    availableBlocks = queueBlocks.filter(
                      block => !blockedBlocks.includes(block.number)
                    );
                  }
                } else {
                  return [];
                }
              }
            }
          }
        }
      }
      state.availableBookingBlocks = availableBlocks;
    };

    const getAvailableBookingSuperBlocks = () => {
      if (state.selectedServices && state.selectedServices.length > 0) {
        const superBlocks = [];
        if (amountofBlocksNeeded.value > 1) {
          const toBuild = [];
          const availables = state.availableBookingBlocks.map(block => block.number);
          for (let i = 0; i < state.availableBookingBlocks.length; i++) {
            const block = state.availableBookingBlocks[i];
            const number = block.number;
            if (number) {
              const toCheck = [];
              for (let j = 0; j < amountofBlocksNeeded.value; j++) {
                toCheck.push(block.number + j);
              }
              if (availables.join(',').includes(toCheck.join(','))) {
                toBuild.push(toCheck);
              }
            }
          }
          if (toBuild.length > 0) {
            toBuild.forEach(build => {
              const blocks = [];
              build.forEach(pos => {
                blocks.push(state.availableBookingBlocks.filter(block => block.number === pos)[0]);
              });
              if (
                blocks &&
                blocks.length > 0 &&
                blocks[amountofBlocksNeeded.value - 1] &&
                blocks[amountofBlocksNeeded.value - 1] !== undefined
              ) {
                const number = blocks[0].number;
                const hourFrom = blocks[0].hourFrom;
                const hourTo = blocks[amountofBlocksNeeded.value - 1].hourTo;
                superBlocks.push({
                  number,
                  hourFrom,
                  hourTo,
                  blocks,
                  blockNumbers: build,
                });
              }
            });
            state.availableBookingSuperBlocks = superBlocks;
          } else {
            state.availableBookingSuperBlocks = [];
          }
        } else {
          state.availableBookingSuperBlocks = [];
        }
      }
    };

    const bookingsAvailables = () => {
      const blockAvailable = state.availableBookingBlocks.filter(
        block => block.number === state.block.number
      );
      if (!blockAvailable || blockAvailable.length === 0) {
        state.bookingAvailable = false;
      } else {
        state.bookingAvailable = true;
      }
    };

    const getAvailableDatesByCalendarMonth = async pages => {
      if (pages && pages.length > 0) {
        const page = pages[0].id;
        if (
          queue.value &&
          queue.value.serviceInfo &&
          queue.value.serviceInfo.specificCalendar === true
        ) {
          await getAvailableSpecificDatesByMonth(`${page}-01`);
        } else {
          await getAvailableDatesByMonth(`${page}-01`);
        }
      }
    };

    const getBlocksBySpecificDay = () => {
      if (!state.date || state.date === 'TODAY') {
        const date = formattedDate(new Date());
        return state.blocksBySpecificCalendarDate[date];
      } else {
        const date = formattedDate(state.date);
        return state.blocksBySpecificCalendarDate[date];
      }
    };

    const changeDate = computed(() => {
      const { date } = state;
      return {
        date,
      };
    });

    const changeBooking = computed(() => {
      const { allBookings } = state;
      return {
        allBookings,
      };
    });

    const changeBlock = computed(() => {
      const { block } = state;
      return {
        block,
      };
    });

    watch(queue, async () => {
      if (queue.value && queue.value.id) {
        state.blocksByDay = await getQueueBlockDetailsByDay(queue.value.id);
      }
      state.blocks = getBlocksByDay();
      state.block = {};
      let currentDate;
      if (state.date === undefined) {
        currentDate = new Date(new Date().setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
      } else {
        currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
      }
      if (
        queue.value.id &&
        queue.value.serviceInfo &&
        queue.value.serviceInfo.specificCalendar === true
      ) {
        await getAvailableSpecificDatesByMonth(currentDate);
      } else {
        await getAvailableDatesByMonth(currentDate);
      }
    });

    watch(show, async () => {
      if (show.value === true) {
        if (booking.value && booking.value.servicesId && booking.value.servicesId.length > 0) {
          state.selectedServices = await getServicesById(booking.value.servicesId);
        }
      }
    });

    watch(changeBlock, async () => {
      if (state.block) {
        receiveBookingEdit({ block: state.block });
      }
    });

    watch(changeBooking, async (newData, oldData) => {
      if (newData.allBookings !== oldData.allBookings) {
        const newIds = newData.allBookings.map(booking => booking.id);
        const oldIds = oldData.allBookings.map(booking => booking.id);
        if (!newIds.every(id => oldIds.includes(id))) {
          if (state.allBookings && state.allBookings.length > 0) {
            state.bookings = state.allBookings;
          }
        }
        let currentDate;
        currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
        if (newData.allBookings.length > 0) {
          if (
            queue.value.id &&
            queue.value.serviceInfo &&
            queue.value.serviceInfo.specificCalendar === true
          ) {
            await getAvailableSpecificDatesByMonth(currentDate);
          } else {
            await getAvailableDatesByMonth(currentDate);
          }
        }
        getAvailableBookingBlocks(state.bookings);
        getAvailableBookingSuperBlocks();
        bookingsAvailables();
      }
    });

    watch(changeDate, async (newData, oldData) => {
      if (newData.date && newData.date !== oldData.date) {
        if (
          queue.value.id &&
          queue.value.serviceInfo &&
          queue.value.serviceInfo.specificCalendar === true
        ) {
          state.blocks = getBlocksBySpecificDay();
          state.block = {};
        } else {
          state.blocks = getBlocksByDay();
          state.block = {};
        }
        if (unsubscribeBookings) {
          unsubscribeBookings();
        }
        getBookings(booking.value.queueId);
        receiveBookingEdit({ date: formattedDate(state.date) });
      }
    });

    return {
      state,
      dateMask,
      calendarAttributes,
      disabledDates,
      loading,
      loadingHours,
      loadingCalendar,
      formattedDate,
      getActiveFeature,
      getAvailableDatesByCalendarMonth,
    };
  },
};
</script>

<template>
  <div v-if="show">
    <div class="centered">
      <div class="col col-md-9">
        <div class="choose-attention py-1 pt-2">
          <i class="bi bi-calendar-check"></i>
          <span> {{ $t('commerceQueuesView.selectDay') }} </span>
        </div>
        <Spinner :show="loadingCalendar"></Spinner>
        <div v-if="!loadingCalendar">
          <VDatePicker
            :locale="state.locale"
            :view="view"
            v-model.string="state.date"
            :mask="dateMask"
            :min-date="state.minDate"
            :max-date="state.maxDate"
            :disabled-dates="disabledDates"
            :attributes="calendarAttributes"
            @did-move="getAvailableDatesByCalendarMonth"
          />
          <div v-if="state.date">
            <div class="badge rounded-pill bg-secondary py-2 px-5 m-1">
              <span> {{ formattedDate(state.date) }} </span>
            </div>
          </div>
        </div>
        <div v-if="getActiveFeature(commerce, 'booking-block-active', 'PRODUCT')">
          <Spinner :show="loadingHours"></Spinner>
          <div v-if="!loadingHours">
            <div v-if="amountofBlocksNeeded > 1">
              <div
                v-if="
                  state.availableBookingSuperBlocks &&
                  state.availableBookingSuperBlocks.length > 0 &&
                  state.date
                "
                class="mb-2"
              >
                <div class="choose-attention pt-1">
                  <i class="bi bi-hourglass-split"></i>
                  <span> {{ $t('commerceQueuesView.selectBlock') }} </span>
                </div>
                <select
                  class="btn btn-md btn-light fw-bold text-dark select"
                  aria-label=".form-select-sm"
                  v-model="state.block"
                >
                  <option
                    v-for="block in state.availableBookingSuperBlocks"
                    :key="block.number"
                    :value="block"
                    id="select-block"
                  >
                    {{ block.hourFrom }} - {{ block.hourTo }}
                  </option>
                </select>
              </div>
              <div
                v-if="
                  state.availableBookingSuperBlocks &&
                  state.availableBookingSuperBlocks.length === 0 &&
                  state.date
                "
                class="mb-2"
              >
                <div>
                  <Message
                    :title="$t('commerceQueuesView.message3.title')"
                    :content="$t('commerceQueuesView.message3.content')"
                  >
                  </Message>
                </div>
              </div>
            </div>
            <div v-else>
              <hr />
              <div
                v-if="
                  state.availableBookingBlocks &&
                  state.availableBookingBlocks.length > 0 &&
                  state.date
                "
                class="mb-2"
              >
                <div class="choose-attention py-1 pt-1">
                  <i class="bi bi-hourglass-split"></i>
                  <span> {{ $t('commerceQueuesView.selectBlock') }} </span>
                </div>
                <select
                  class="btn btn-sm btn-light fw-bold text-dark select"
                  aria-label="form-select-sm"
                  v-model="state.block"
                >
                  <option
                    v-for="block in state.availableBookingBlocks"
                    :key="block.number"
                    :value="block"
                    id="select-block"
                  >
                    {{ block.hourFrom }} - {{ block.hourTo }}
                  </option>
                </select>
              </div>
              <div
                v-if="
                  state.availableBookingBlocks &&
                  state.availableBookingBlocks.length === 0 &&
                  state.date
                "
                class="mb-1"
              >
                <div>
                  <Message
                    :title="$t('commerceQueuesView.message3.title')"
                    :content="$t('commerceQueuesView.message3.content')"
                  >
                  </Message>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
