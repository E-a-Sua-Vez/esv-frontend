<script>
import { ref, reactive, onBeforeMount, computed, watch, onUnmounted, toRefs } from 'vue';
import { getActiveFeature } from '../../../shared/features';
import { bookingCollection } from '../../../application/firebase';
import { query, where, onSnapshot } from 'firebase/firestore';
import { DateModel } from '../../../shared/utils/date.model';
import Message from '../../common/Message.vue';
import Alert from '../../common/Alert.vue';
import Spinner from '../../common/Spinner.vue';
import { getPendingBookingsBetweenDates } from '../../../application/services/booking';
import {
  getQueueBlockDetailsByDay,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getCollaboratorDetailsById } from '../../../application/services/collaborator';
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
          // Load blocks by day for the queue
          state.blocksByDay = await getQueueBlockDetailsByDay(queue.value.id);

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
        } else if (booking.value?.queueId) {
          // If queue prop is not available but booking has queueId, try to load blocks
          // This is expected when the queue is being loaded asynchronously
          state.blocksByDay = await getQueueBlockDetailsByDay(booking.value.queueId);
        }
        loading.value = false;
      } catch (error) {
        console.error('Error in BookingDatePicker onBeforeMount:', error);
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

    const getBookings = queueId => {
      // Use provided queueId or fallback to queue.value.id or booking.value.queueId
      const queueIdToUse = queueId || queue.value?.id || booking.value?.queueId;
      if (!queueIdToUse) {
        console.warn('BookingDatePicker: No queueId available to load bookings');
        return;
      }
      if (!state.date) {
        console.warn('BookingDatePicker: No date selected, cannot load bookings');
        return;
      }
      const { unsubscribe } = updatedBookings(formattedDate(state.date), queueIdToUse);
      unsubscribeBookings = unsubscribe;
    };

    const updatedBookings = (date, queueId) => {
      const values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId !== undefined) {
        const bookingsQuery = query(
          bookingCollection,
          where('commerceId', '==', commerce.value.id),
          where('queueId', '==', queueId),
          where('status', 'in', ['PENDING', 'CONFIRMED']),
          where('date', '==', date)
        );
        unsubscribe = onSnapshot(bookingsQuery, snapshot => {
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
      if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
        console.warn('BookingDatePicker: blocksByDay is empty, cannot get blocks for day');
        return [];
      }

      if (!state.date) {
        const day = new Date().getDay();
        const dayKey = day === 0 ? 7 : day;
        return state.blocksByDay[dayKey] || [];
      } else {
        // Handle both Date objects and string dates
        let dateStr;
        if (state.date instanceof Date) {
          // Convert Date object to YYYY-MM-DD string
          dateStr = state.date.toISOString().slice(0, 10);
        } else if (typeof state.date === 'string') {
          dateStr = state.date.slice(0, 10);
        } else {
          // Fallback to current day if date format is unexpected
          const day = new Date().getDay();
          const dayKey = day === 0 ? 7 : day;
          return state.blocksByDay[dayKey] || [];
        }

        const [year, month, day] = dateStr.split('-');
        let dayNumber = new Date(+year, +month - 1, +day).getDay();
        if (dayNumber === 0) {
          dayNumber = 7;
        }
        return state.blocksByDay[dayNumber] || [];
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
      // Get attention days from queue
      const attentionDays = queue.value.serviceInfo?.attentionDays || [];
      for (let i = 1; i <= dateTo.getDate(); i++) {
        const key = new Date(dateFrom.setDate(i)).toISOString().slice(0, 10);
        if (new Date(key) > new Date()) {
          // Filter by attention days if configured
          if (attentionDays.length > 0) {
            const [year, month, day] = key.split('-');
            let dayNumber = new Date(+year, +month - 1, +day).getDay();
            if (dayNumber === 0) {
              dayNumber = 7;
            }
            // Only add date if it's an attention day
            if (attentionDays.includes(dayNumber)) {
              availableDates.push(key);
            }
          } else {
            // If no attention days configured, allow all days
            availableDates.push(key);
          }
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
          // Check block limit, not just total blocks
          const blockLimit = queue.value.serviceInfo?.blockLimit || 1;
          // Count bookings per block to check blockLimit
          const blockBookingsCount = {};
          bookings.forEach(booking => {
            if (booking.block) {
              const blockNum =
                booking.block.number ||
                (booking.block.blockNumbers && booking.block.blockNumbers[0]);
              if (blockNum) {
                blockBookingsCount[blockNum] = (blockBookingsCount[blockNum] || 0) + 1;
              }
            }
          });
          // Check if any block has reached its limit
          const hasBlockAtLimit = Object.values(blockBookingsCount).some(
            count => count >= blockLimit,
          );
          // Check if all blocks are at limit
          const allBlocksAtLimit =
            blocks.length > 0 &&
            blocks.every(block => (blockBookingsCount[block.number] || 0) >= blockLimit);
          if (allBlocksAtLimit || bookings.length >= blocks.length) {
            forDeletion.push(date);
          } else if (hasBlockAtLimit || bookings.length >= 1) {
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
              if (times > limit && !forDeletion.includes(date)) {
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
      console.log('🟢 [getAvailableBookingBlocks] Called with:', {
        queueType: queue.value?.type,
        blocksCount: state.blocks?.length,
        bookingsCount: bookings?.length,
      });

      let availableBlocks = [];
      let queueBlocks = [];

      // Ensure queue is available
      if (!queue.value || !queue.value.id) {
        console.warn('🟢 [getAvailableBookingBlocks] Queue not available');
        state.availableBookingBlocks = [];
        return;
      }

      // Ensure blocks are loaded
      if (!state.blocks || !Array.isArray(state.blocks) || state.blocks.length === 0) {
        console.warn(
          '🟢 [getAvailableBookingBlocks] No blocks available. State.blocks:',
          state.blocks,
        );
        state.availableBookingBlocks = [];
        return;
      }

      if (queue.value.type !== 'SELECT_SERVICE') {
        queueBlocks = state.blocks;
        console.log('🟢 [getAvailableBookingBlocks] Queue blocks:', queueBlocks.length);
        if (queueBlocks && queueBlocks.length > 0) {
          let bookingsReserved = [];
          if (bookings && Array.isArray(bookings) && bookings.length > 0) {
            bookingsReserved = bookings
              .map(booking => {
                if (
                  booking.block &&
                  booking.block.blockNumbers &&
                  Array.isArray(booking.block.blockNumbers) &&
                  booking.block.blockNumbers.length > 0
                ) {
                  return [...booking.block.blockNumbers];
                } else if (booking.block && booking.block.number) {
                  return booking.block.number;
                }
                return null;
              })
              .filter(reserved => reserved !== null);

            let limit = 0;
            if (
              queue.value.serviceInfo !== undefined &&
              queue.value.serviceInfo.blockLimit !== undefined &&
              queue.value.serviceInfo.blockLimit > 0
            ) {
              limit = queue.value.serviceInfo.blockLimit;
            }

            if (bookingsReserved.length > 0) {
              const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
              const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
              const blockedBlocks = [];
              uniqueBlocksReserved.forEach(block => {
                const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                // Use >= to match backend validation: alreadyBooked.length >= blockLimit
                if (limit > 0 && times >= limit) {
                  blockedBlocks.push(block);
                }
              });
              availableBlocks = queueBlocks.filter(
                block =>
                  !blockedBlocks.includes(block.number) &&
                  !totalBlocksReserved.includes(block.number)
              );
            } else {
              // No bookings reserved, all blocks are available
              availableBlocks = queueBlocks;
            }
          } else {
            // No bookings, all blocks are available
            availableBlocks = queueBlocks;
          }
        }
      } else {
        // SELECT_SERVICE queue type - use simpler logic similar to regular queues
        console.log('🟢 [getAvailableBookingBlocks] SELECT_SERVICE queue type');
        if (state.blocks && Array.isArray(state.blocks) && state.blocks.length > 0) {
          queueBlocks = state.blocks;
          console.log('🟢 [getAvailableBookingBlocks] SELECT_SERVICE blocks:', queueBlocks.length);

          if (queueBlocks && queueBlocks.length > 0) {
            let bookingsReserved = [];
            if (bookings && Array.isArray(bookings) && bookings.length > 0) {
              bookingsReserved = bookings
                .map(booking => {
                  if (
                    booking.block &&
                    booking.block.blockNumbers &&
                    Array.isArray(booking.block.blockNumbers) &&
                    booking.block.blockNumbers.length > 0
                  ) {
                    return [...booking.block.blockNumbers];
                  } else if (booking.block && booking.block.number) {
                    return booking.block.number;
                  }
                  return null;
                })
                .filter(reserved => reserved !== null);

              console.log(
                '🟢 [getAvailableBookingBlocks] SELECT_SERVICE bookings reserved:',
                bookingsReserved,
              );

              let limit = 0;
              if (
                queue.value.serviceInfo !== undefined &&
                queue.value.serviceInfo.blockLimit !== undefined &&
                queue.value.serviceInfo.blockLimit > 0
              ) {
                limit = queue.value.serviceInfo.blockLimit;
              }

              if (bookingsReserved.length > 0) {
                const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
                const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                const blockedBlocks = [];
                uniqueBlocksReserved.forEach(block => {
                  const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                  // Use >= to match backend validation: alreadyBooked.length >= blockLimit
                  if (limit > 0 && times >= limit) {
                    blockedBlocks.push(block);
                  }
                });
                availableBlocks = queueBlocks.filter(
                  block =>
                    !blockedBlocks.includes(block.number) &&
                    !totalBlocksReserved.includes(block.number)
                );
                console.log(
                  '🟢 [getAvailableBookingBlocks] SELECT_SERVICE filtered blocks:',
                  availableBlocks.length,
                );
              } else {
                // No bookings reserved, all blocks are available
                availableBlocks = queueBlocks;
                console.log(
                  '🟢 [getAvailableBookingBlocks] SELECT_SERVICE no bookings, all blocks available',
                );
              }
            } else {
              // No bookings, all blocks are available
              availableBlocks = queueBlocks;
              console.log(
                '🟢 [getAvailableBookingBlocks] SELECT_SERVICE no bookings array, all blocks available',
              );
            }
          } else {
            console.warn('🟢 [getAvailableBookingBlocks] SELECT_SERVICE queue blocks is empty');
          }
        } else {
          console.warn('🟢 [getAvailableBookingBlocks] SELECT_SERVICE state.blocks is empty');
        }
      }
      state.availableBookingBlocks = availableBlocks;
      console.log(
        '🟢 [getAvailableBookingBlocks] Final available blocks:',
        availableBlocks.length,
        availableBlocks,
      );
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
        console.log('🟡 [changeBooking] Bookings changed:', newData.allBookings.length);
        const newIds = newData.allBookings.map(booking => booking.id);
        const oldIds = oldData.allBookings.map(booking => booking.id);
        if (!newIds.every(id => oldIds.includes(id))) {
          if (state.allBookings && state.allBookings.length > 0) {
            state.bookings = state.allBookings;
          }
        }

        // Update available blocks when bookings change
        if (state.blocks && Array.isArray(state.blocks) && state.blocks.length > 0) {
          console.log(
            '🟡 [changeBooking] Recalculating available blocks with bookings:',
            state.bookings?.length,
          );
          getAvailableBookingBlocks(state.bookings || []);
          getAvailableBookingSuperBlocks();
          bookingsAvailables();
          console.log(
            '🟡 [changeBooking] Available blocks after update:',
            state.availableBookingBlocks?.length,
          );
          console.log(
            '🟡 [changeBooking] Available super blocks after update:',
            state.availableBookingSuperBlocks?.length,
          );
        } else {
          console.warn('🟡 [changeBooking] Cannot recalculate blocks, state.blocks is empty');
        }

        let currentDate;
        currentDate = new Date(new Date(state.date || new Date()).setDate(new Date().getDate() + 1))
          .toISOString()
          .slice(0, 10);
        if (newData.allBookings.length > 0) {
          if (
            queue.value?.id &&
            queue.value.serviceInfo &&
            queue.value.serviceInfo.specificCalendar === true
          ) {
            await getAvailableSpecificDatesByMonth(currentDate);
          } else {
            await getAvailableDatesByMonth(currentDate);
          }
        }
      }
    });

    watch(changeDate, async (newData, oldData) => {
      if (newData.date && newData.date !== oldData.date) {
        console.log('🔵 [BookingDatePicker] Date selected:', formattedDate(newData.date));
        loadingHours.value = true;

        // Ensure queue is loaded before processing date selection
        const queueIdToUse = queue.value?.id || booking.value?.queueId;
        if (!queueIdToUse) {
          console.warn(
            'BookingDatePicker: Queue not loaded, cannot load time blocks. Queue:',
            queue.value,
            'Booking:',
            booking.value,
          );
          loadingHours.value = false;
          return;
        }
        console.log('🔵 [BookingDatePicker] Queue ID:', queueIdToUse);

        // Ensure queue object has id (might need to load it from booking.queueId)
        if (!queue.value || !queue.value.id) {
          if (booking.value?.queueId) {
            // Create minimal queue object if not available
            queue.value = { id: booking.value.queueId };
          }
        }

        // Load blocks for the selected date
        if (
          queue.value?.id &&
          queue.value.serviceInfo &&
          queue.value.serviceInfo.specificCalendar === true
        ) {
          state.blocks = getBlocksBySpecificDay();
          state.block = {};
          console.log('🔵 [BookingDatePicker] Specific calendar blocks:', state.blocks?.length);
        } else {
          // Ensure blocksByDay is loaded before getting blocks
          if (!state.blocksByDay || Object.keys(state.blocksByDay).length === 0) {
            console.log('🔵 [BookingDatePicker] Loading blocksByDay...');
            if (queue.value?.id) {
              state.blocksByDay = await getQueueBlockDetailsByDay(queue.value.id);
            } else if (queueIdToUse) {
              // Try to load blocks using queueId from booking
              state.blocksByDay = await getQueueBlockDetailsByDay(queueIdToUse);
            }
            console.log(
              '🔵 [BookingDatePicker] blocksByDay loaded:',
              Object.keys(state.blocksByDay).length,
              'days',
            );
          }
          state.blocks = getBlocksByDay();
          state.block = {};
          console.log(
            '🔵 [BookingDatePicker] Blocks for selected date:',
            state.blocks?.length,
            state.blocks,
          );
        }

        // Unsubscribe from previous bookings listener
        if (unsubscribeBookings) {
          unsubscribeBookings();
        }

        // Get bookings for the selected date - this will trigger changeBooking watcher
        getBookings(queueIdToUse);

        // Calculate available blocks immediately if we have blocks
        if (state.blocks && Array.isArray(state.blocks) && state.blocks.length > 0) {
          // Use current bookings if available, otherwise empty array
          const currentBookings = state.bookings && state.bookings.length > 0 ? state.bookings : [];
          console.log(
            '🔵 [BookingDatePicker] Calculating available blocks. Blocks:',
            state.blocks.length,
            'Bookings:',
            currentBookings.length,
          );
          getAvailableBookingBlocks(currentBookings);
          getAvailableBookingSuperBlocks();
          bookingsAvailables();
          console.log(
            '🔵 [BookingDatePicker] Available blocks:',
            state.availableBookingBlocks?.length,
          );
          console.log(
            '🔵 [BookingDatePicker] Available super blocks:',
            state.availableBookingSuperBlocks?.length,
          );
        } else {
          console.warn('🔵 [BookingDatePicker] No blocks found for selected date');
        }

        loadingHours.value = false;

        // Notify parent component of date change
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
  <div v-if="show" class="booking-date-picker-container">
    <div class="booking-date-picker-content">
      <div class="booking-date-picker-header">
        <i class="bi bi-calendar-check"></i>
        <span>{{ $t('commerceQueuesView.selectDay') }}</span>
        <div v-if="state.date" class="booking-date-selected">
          <i class="bi bi-check-circle-fill"></i>
          <span>{{ formattedDate(state.date) }}</span>
        </div>
      </div>
      <Spinner :show="loadingCalendar"></Spinner>
      <div v-if="!loadingCalendar" class="booking-calendar-wrapper">
        <VDatePicker
          :locale="state.locale"
          :view="'monthly'"
          v-model="state.date"
          :mask="dateMask"
          :min-date="state.minDate"
          :max-date="state.maxDate"
          :disabled-dates="disabledDates"
          :attributes="calendarAttributes"
          @did-move="getAvailableDatesByCalendarMonth"
        />
      </div>
      <div
        v-if="getActiveFeature(commerce, 'booking-block-active', 'PRODUCT')"
        class="booking-block-selector"
      >
        <Spinner :show="loadingHours"></Spinner>
        <div v-if="!loadingHours">
          <div v-if="amountofBlocksNeeded > 1">
            <div
              v-if="
                state.availableBookingSuperBlocks &&
                state.availableBookingSuperBlocks.length > 0 &&
                state.date
              "
              class="booking-time-selector"
            >
              <div class="booking-time-label">
                <i class="bi bi-hourglass-split"></i>
                <span>{{ $t('commerceQueuesView.selectBlock') }}</span>
              </div>
              <div class="time-slots-grid">
                <button
                  v-for="block in state.availableBookingSuperBlocks"
                  :key="block.number"
                  type="button"
                  class="time-slot-button"
                  :class="{
                    'time-slot-selected': state.block && state.block.number === block.number,
                  }"
                  @click="state.block = block"
                >
                  <div class="time-start">{{ block.hourFrom }}</div>
                  <div class="time-end">{{ block.hourTo }}</div>
                </button>
              </div>
            </div>
            <div
              v-if="
                state.availableBookingSuperBlocks &&
                state.availableBookingSuperBlocks.length === 0 &&
                state.date
              "
              class="booking-block-message"
            >
              <Message
                :title="$t('commerceQueuesView.message3.title')"
                :content="$t('commerceQueuesView.message3.content')"
              >
              </Message>
            </div>
          </div>
          <div v-else>
            <div
              v-if="
                state.availableBookingBlocks &&
                state.availableBookingBlocks.length > 0 &&
                state.date
              "
              class="booking-time-selector"
            >
              <div class="booking-time-label">
                <i class="bi bi-hourglass-split"></i>
                <span>{{ $t('commerceQueuesView.selectBlock') }}</span>
              </div>
              <div class="time-slots-grid">
                <button
                  v-for="block in state.availableBookingBlocks"
                  :key="block.number"
                  type="button"
                  class="time-slot-button"
                  :class="{
                    'time-slot-selected': state.block && state.block.number === block.number,
                  }"
                  @click="state.block = block"
                >
                  <div class="time-start">{{ block.hourFrom }}</div>
                  <div class="time-end">{{ block.hourTo }}</div>
                </button>
              </div>
            </div>
            <div
              v-if="
                state.availableBookingBlocks &&
                state.availableBookingBlocks.length === 0 &&
                state.date
              "
              class="booking-block-message"
            >
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
</template>

<style scoped>
/* Booking Date Picker Container - Modern and Compact */
.booking-date-picker-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
}

.booking-date-picker-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.booking-date-picker-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: -0.01em;
  flex-wrap: wrap;
}

.booking-date-picker-header i:first-child {
  color: #00c2cb;
  font-size: 1rem;
}

.booking-date-selected {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 194, 203, 0.12);
  border: 1px solid rgba(0, 194, 203, 0.25);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #00c2cb;
}

.booking-date-selected i {
  font-size: 0.75rem;
}

.booking-calendar-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0;
}

.booking-calendar-wrapper > * {
  width: auto;
  max-width: 500px;
}

/* Block Selector - Compact */
.booking-block-selector {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
}

/* Modern Time Slot Selector - Matching Attention Flow Style */
.booking-time-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.booking-time-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 0.5rem;
}

.booking-time-label i {
  color: #00c2cb;
  font-size: 1rem;
}

.time-slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  max-width: 100%;
}

.time-slot-button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.1rem;
  padding: 0.5rem 0.6rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1.5px solid #dee2e6;
  border-radius: 0.5rem;
  color: #495057;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  min-height: 60px;
}

.time-slot-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 74, 173, 0.1), transparent);
  transition: left 0.5s ease;
}

.time-slot-button:hover::before {
  left: 100%;
}

.time-slot-button:hover {
  transform: translateY(-2px);
  border-color: var(--azul-turno, #004aad);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.2);
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
}

.time-start {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--azul-turno, #004aad);
  line-height: 1;
}

.time-end {
  font-size: 0.7rem;
  font-weight: 500;
  color: #6c757d;
  line-height: 1;
}

.time-slot-selected {
  background: linear-gradient(135deg, var(--azul-turno, #004aad) 0%, var(--verde-tu, #00c2cb) 100%);
  border-color: var(--azul-turno, #004aad);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
  transform: translateY(-1px);
}

.time-slot-selected .time-start {
  color: white;
}

.time-slot-selected .time-end {
  color: rgba(255, 255, 255, 0.8);
}

.time-slot-selected:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 74, 173, 0.4);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .time-slots-grid {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .time-slot-button {
    min-height: 50px;
    padding: 0.375rem 0.5rem;
  }
}

.booking-block-message {
  margin-top: 0.5rem;
}

/* Legacy styles for compatibility */
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
</style>
