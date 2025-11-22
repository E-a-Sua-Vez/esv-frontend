<script>
import { ref, watch, reactive, computed, toRefs, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  getPendingBookingsBetweenDates,
  getPendingCommerceBookingsBetweenDates,
  getPendingBookingsByClient,
} from '../../../application/services/booking';
import { dateYYYYMMDD, getDate } from '../../../shared/utils/date';
import { bookingCollection, waitlistCollection } from '../../../application/firebase';
import { query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { getAvailableAttentiosnByQueue } from '../../../application/services/attention';
import {
  getQueueBlockDetailsByDayByCommerceId,
  getQueueBlockDetailsBySpecificDayByCommerceId,
} from '../../../application/services/block';
import { getClientsDetails } from '../../../application/services/query-stack';
import { DateModel } from '../../../shared/utils/date.model';
import Popper from 'vue3-popper';
import DashboardAttentionsManagement from '../../attentions/DashboardAttentionsManagement.vue';
import Message from '../../common/Message.vue';
import QueueName from '../../common/QueueName.vue';
import QueueSimpleName from '../../common/QueueSimpleName.vue';
import Spinner from '../../common/Spinner.vue';
import BookingDetailsCard from '../common/BookingDetailsCard.vue';
import WaitlistDetailsCard from '../../waitlist/WaitlistDetailsCard.vue';
import AttentionNumber from '../../common/AttentionNumber.vue';
import Warning from '../../common/Warning.vue';
import ClientDetailsCard from '../../clients/common/ClientDetailsCard.vue';
import AttentionDetailsCard from '../../attentions/common/AttentionDetailsCard.vue';

export default {
  name: 'BookingCalendar',
  components: {
    Popper,
    Spinner,
    DashboardAttentionsManagement,
    Message,
    QueueSimpleName,
    QueueName,
    BookingDetailsCard,
    WaitlistDetailsCard,
    AttentionNumber,
    Warning,
    ClientDetailsCard,
    AttentionDetailsCard,
  },
  props: {
    show: { type: Boolean, default: false },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: [] },
    toggles: { type: Object, default: {} },
  },
  async setup(props) {
    const router = useRouter();

    const loading = ref(false);
    const loadingSearch = ref(false);
    const loadingBookings = ref(false);
    const loadingAttentions = ref(false);
    const alertError = ref('');
    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    const disabledDates = ref([]);
    const calendarAttributes = ref([]);
    let unsubscribeBookings = () => {};
    let unsubscribeWaitlists = () => {};

    const state = reactive({
      groupedQueues: [],
      showQueues: false,
      showCollaboratorQueues: false,
      locale: 'es',
      queues: [],
      selectedQueue: {},
      selectedDates: {},
      selectedDate: undefined,
      blocksByDay: {},
      blocksCommerceByDay: {},
      blocks: {},
      bookingsFromService: ref([]),
      bookingsByCommerce: ref({}),
      attentions: ref([]),
      bookings: ref([]),
      waitlists: ref({}),
      date: new Date().setDate(new Date().getDate() + 1),
      minDate: new Date().setDate(new Date().getDate()),
      maxDate: new Date().setDate(new Date().getDate() + 90),
      searchText: '',
      client: {},
      errorsSearch: [],
      searchTextError: false,
      showAttentions: true,
      showBooking: false,
      showWaitlist: false,
      showAllQueues: false,
      extendedBookingsEntity: false,
      clientBookings: [],
      showBookings360: true,
      showClients360: false,
      specificCalendar: false,
      specificCalendarDays: {},
      specificCalendarDates: [],
      specificCalendarDate: undefined,
      blocksBySpecificCalendarDate: {},
      bookingsActiveBlocks: [],
    });

    const { show, commerce, queues, toggles } = toRefs(props);

    onUnmounted(() => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      if (unsubscribeWaitlists) {
        unsubscribeWaitlists;
      }
    });

    const getBookings = () => {
      loading.value = true;
      if (state.selectedQueue && state.selectedQueue.id) {
        const { unsubscribe } = updatedBookings(
          state.selectedQueue.id,
          dateYYYYMMDD(state.selectedDates[state.selectedQueue.id])
        );
        unsubscribeBookings = unsubscribe;
      }
      loading.value = false;
    };

    const updatedBookings = (queueId, date) => {
      const values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId) {
        const bookingsQuery = query(
          bookingCollection,
          where('queueId', '==', queueId),
          where('status', 'in', ['PENDING', 'CONFIRMED']),
          where('date', '==', date),
          orderBy('number', 'asc')
        );
        unsubscribe = onSnapshot(bookingsQuery, snapshot => {
          values.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
      }
      state.bookings = values;
      return { unsubscribe };
    };

    const getBooking = number => {
      if (state.bookings && state.bookings.length > 0) {
        const result = state.bookings.filter(bk => bk.number === number)[0];
        if (result) {
          return result;
        }
      }
    };

    const getBookingsActiveBlocks = () => {
      let result = [];
      if (state.bookings && state.bookings.length > 0) {
        state.bookings.forEach(booking => {
          if (booking.block && booking.block.blocks && booking.block.blocks.length > 0) {
            const hourMap = booking.block.blocks.map(block => block.hourFrom);
            result = [...result, ...hourMap];
          } else {
            result.push(booking.block.hourFrom);
          }
        });
      }
      state.bookingsActiveBlocks = result;
      return result;
    };

    const getBookingBlockNumber = block => {
      const result = [];
      if (state.bookings && state.bookings.length > 0) {
        state.bookings.forEach(booking => {
          if (booking.block && booking.block.blocks && booking.block.blocks.length > 0) {
            const hourMap = booking.block.blocks.map(block => block.hourFrom);
            if (hourMap.flat().sort((a, b) => a - b)[0] === block.hourFrom) {
              result.push(booking);
            }
          } else {
            if (booking.block.hourFrom === block.hourFrom) {
              result.push(booking);
            }
          }
        });
      }
      return result;
    };

    const getWaitlists = () => {
      loading.value = true;
      if (state.selectedQueue && state.selectedQueue.id) {
        const { unsubscribe } = updatedWaitlists(
          state.selectedQueue.id,
          dateYYYYMMDD(state.selectedDates[state.selectedQueue.id])
        );
        unsubscribeWaitlists = unsubscribe;
      }
      loading.value = false;
    };

    const updatedWaitlists = (queueId, date) => {
      const values = ref([]);
      let unsubscribe;
      if (date !== undefined && queueId) {
        const waitlistQuery = query(
          waitlistCollection,
          where('queueId', '==', queueId),
          where('status', '==', 'PENDING'),
          where('date', '==', date),
          orderBy('createdAt', 'asc')
        );
        unsubscribe = onSnapshot(waitlistQuery, snapshot => {
          values.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
      }
      state.waitlists = values;
      return { unsubscribe };
    };

    const initCalendars = () => {
      if (queues.value && queues.value && queues.value.length > 0) {
        queues.value.map(queue => {
          disabledDates.value[queue.id] = getDisabledDates(queue);
          calendarAttributes.value[queue.id] = [
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
          ];
        });
      }
    };

    const initQueues = () => {
      if (queues.value && queues.value && queues.value.length > 0) {
        state.groupedQueues = queues.value.reduce((acc, conf) => {
          const type = conf.type;
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(conf);
          return acc;
        }, {});
        state.queues = queues;
        queues.value.map(queue => {
          state.selectedDates[queue.id] = new Date();
        });
      }
    };

    const copyLink = queue => {
      const textToCopy = getQueueLink(queue);
      navigator.clipboard.writeText(textToCopy);
    };

    const goToCreateBooking = () => {
      const commerceKeyName = commerce.value.keyName;
      const url = `/interno/commerce/${commerceKeyName}/filas`;
      let resolvedRoute;
      const query = {};
      if (state.client && state.client.id) {
        query['client'] = state.client.id;
      }
      if (state.selectedQueue && state.selectedQueue.id) {
        query['queue'] = state.selectedQueue.id;
      }
      if (Object.keys(query).length === 0) {
        resolvedRoute = router.resolve({ path: url });
      } else {
        resolvedRoute = router.resolve({ path: url, query });
      }
      window.open(resolvedRoute.href, '_blank');
    };

    const getDisabledDates = queue => {
      let disabled = [1, 2, 3, 4, 5, 6, 7];
      if (queue.serviceInfo && queue.serviceInfo.attentionDays) {
        const availableDays = queue.serviceInfo.attentionDays;
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
          return [{ repeat: { weekdays: disabled } }];
        }
      }
    };

    const showQueue = () => {
      state.showQueues = !state.showQueues;
      state.showCollaboratorQueues = false;
      state.showAllQueues = false;
    };

    const showCollaboratorQueue = () => {
      state.showQueues = false;
      state.showCollaboratorQueues = !state.showCollaboratorQueues;
      state.showAllQueues = false;
    };

    const showAllQueue = () => {
      state.showQueues = false;
      state.showCollaboratorQueues = false;
      state.showAllQueues = !state.showAllQueues;
    };

    const getAvailableDatesByCalendarMonth = async pages => {
      if (pages && pages.length > 0) {
        const pagesIn = pages[0].id.split('-');
        const page = `${pagesIn[0]}-${pagesIn[1]}`;
        if (
          state.selectedQueue &&
          state.selectedQueue.serviceInfo &&
          state.selectedQueue.serviceInfo.specificCalendar === true
        ) {
          await getAvailableSpecificDatesByMonth(state.selectedQueue, `${page}-01`);
        } else if (
          commerce.value.serviceInfo &&
          commerce.value.serviceInfo.specificCalendar === true
        ) {
          await getAvailableSpecificDatesByMonth(state.selectedQueue, `${page}-01`);
        } else {
          await getAvailableDatesByMonth(state.selectedQueue, `${page}-01`);
        }
      }
    };

    const getBlocksByDay = queue => {
      if (queue && state.selectedDate && state.selectedDates[queue.id]) {
        const [year, month, day] = new Date(dateYYYYMMDD(state.selectedDates[queue.id]))
          .toISOString()
          .slice(0, 10)
          .split('-');
        let dayNumber = new Date(+year, +month - 1, +day).getDay();
        if (dayNumber === 0) {
          dayNumber = 7;
        }
        return state.blocksByDay[dayNumber];
      }
      return [];
    };

    const updateAvailableDays = async date => {
      if (queues.value && date) {
        if (queues.value && queues.value && queues.value.length > 0) {
          queues.value.map(queue => {
            getBlocksByDay(queue);
          });
        }
      }
    };

    const getAvailableCommerceDatesByMonth = async date => {
      if (date) {
        const [year, month] = date.split('-');
        const thisMonth = +month - 1;
        const nextMonth = +month;
        const dateFrom = new Date(+year, thisMonth, 1);
        const dateTo = new Date(+year, nextMonth, 0);
        const bookings = await getPendingCommerceBookingsBetweenDates(
          commerce.value.id,
          dateFrom,
          dateTo
        );
        if (bookings && bookings.length >= 0) {
          const groupedBookings = bookings.reduce((acc, book) => {
            const type = book.queueId;
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(book);
            return acc;
          }, {});
          for (let i = 0; i < queues.value.length; i++) {
            const queue = queues.value[i];
            if (state.blocksCommerceByDay) {
              state.blocksByDay = state.blocksCommerceByDay[queue.id];
              const monthBookings = groupedBookings[queue.id] || [];
              if (queue.serviceInfo && queue.serviceInfo.specificCalendar === true) {
                getAvailableSepecificDatesByQueueMonth(monthBookings, queue, date);
              } else if (
                commerce.value.serviceInfo &&
                commerce.value.serviceInfo.specificCalendar === true
              ) {
                getAvailableSepecificDatesByQueueMonth(monthBookings, queue, date);
              } else {
                getAvailableDatesByQueueMonth(monthBookings, queue, date);
              }
            }
          }
        }
      }
      return {};
    };

    const getAvailableDatesByQueueMonth = async (monthBookings, queue, date) => {
      let availableDates = [];
      calendarAttributes.value[queue.id][0].dates = [];
      calendarAttributes.value[queue.id][1].dates = [];
      calendarAttributes.value[queue.id][2].dates = [];
      const [year, month] = date.split('-');
      const thisMonth = +month - 1;
      const nextMonth = +month;
      const dateFrom = new Date(+year, thisMonth, 1);
      const dateTo = new Date(+year, nextMonth, 0);
      if (monthBookings && monthBookings.length >= 0 && date) {
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
          availableDates = availableDates.filter(item => !forDeletion.includes(item));
        }
        const avaliableToCalendar = availableDates.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][0].dates.push(...avaliableToCalendar);
        const forDeletionToCalendar = forDeletion.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][1].dates.push(...forDeletionToCalendar);
        const avaliableToReserve = forReserves.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][2].dates.push(...avaliableToReserve);
      }
    };

    const getAvailableSepecificDatesByQueueMonth = async (monthBookings, queue, date) => {
      let availableDates = [];
      calendarAttributes.value[queue.id][0].dates = [];
      calendarAttributes.value[queue.id][1].dates = [];
      calendarAttributes.value[queue.id][2].dates = [];
      if (monthBookings && monthBookings.length >= 0 && date) {
        const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
          const date = booking.date;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(booking);
          return acc;
        }, {});
        let specificCalendarDays;
        if (queue.serviceInfo && queue.serviceInfo.specificCalendarDays) {
          specificCalendarDays = Object.keys(queue.serviceInfo.specificCalendarDays);
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
            queue.serviceInfo !== undefined &&
            queue.serviceInfo.blockLimit !== undefined &&
            queue.serviceInfo.blockLimit > 0
          ) {
            limit = queue.serviceInfo.blockLimit;
          }
          const blocksBySpecificCalendarDate = await getQueueBlockDetailsBySpecificDayByCommerceId(
            commerce.value.id,
            queue.id
          );
          availableDates.forEach(date => {
            const bookings = bookingsGroupedByDate[date] || [];
            const blocks = blocksBySpecificCalendarDate[date] || [];
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
        calendarAttributes.value[queue.id][0].dates.push(...avaliableToCalendar);
        const forDeletionToCalendar = forDeletion.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][1].dates.push(...forDeletionToCalendar);
        const avaliableToReserve = forReserves.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][2].dates.push(...avaliableToReserve);
      }
    };

    const getAvailableDatesByMonth = async (queue, date) => {
      if (queue && date) {
        let availableDates = [];
        calendarAttributes.value[queue.id][0].dates = [];
        calendarAttributes.value[queue.id][1].dates = [];
        calendarAttributes.value[queue.id][2].dates = [];
        const [year, month] = dateYYYYMMDD(date).split('-');
        const thisMonth = +month - 1;
        const nextMonth = +month;
        const dateFrom = new Date(+year, thisMonth, 1);
        const dateTo = new Date(+year, nextMonth, 0);
        const monthBookings = await getPendingBookingsBetweenDates(queue.id, dateFrom, dateTo);
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
          availableDates = availableDates.filter(item => !forDeletion.includes(item));
        }
        const avaliableToCalendar = availableDates.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][0].dates.push(...avaliableToCalendar);
        const forDeletionToCalendar = forDeletion.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][1].dates.push(...forDeletionToCalendar);
        const avaliableToReserve = forReserves.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][2].dates.push(...avaliableToReserve);
      }
    };

    const getAvailableSpecificDatesByMonth = async (queue, date) => {
      if (queue && date) {
        let availableDates = [];
        calendarAttributes.value[queue.id][0].dates = [];
        calendarAttributes.value[queue.id][1].dates = [];
        calendarAttributes.value[queue.id][2].dates = [];
        const [year, month] = dateYYYYMMDD(date).split('-');
        const thisMonth = +month - 1;
        const nextMonth = +month;
        const dateFrom = new Date(+year, thisMonth, 1);
        const dateTo = new Date(+year, nextMonth, 0);
        const monthBookings = await getPendingBookingsBetweenDates(queue.id, dateFrom, dateTo);
        const bookingsGroupedByDate = monthBookings.reduce((acc, booking) => {
          const date = booking.date;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(booking);
          return acc;
        }, {});
        let specificCalendarDays;
        if (queue.serviceInfo && queue.serviceInfo.specificCalendarDays) {
          specificCalendarDays = Object.keys(queue.serviceInfo.specificCalendarDays);
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
            queue.serviceInfo !== undefined &&
            queue.serviceInfo.blockLimit !== undefined &&
            queue.serviceInfo.blockLimit > 0
          ) {
            limit = queue.serviceInfo.blockLimit;
          }
          const blocksBySpecificCalendarDate = state.blocksBySpecificCalendarDate;
          availableDates.forEach(date => {
            const bookings = bookingsGroupedByDate[date] || [];
            const blocks = blocksBySpecificCalendarDate[date] || [];
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
        calendarAttributes.value[queue.id][0].dates.push(...avaliableToCalendar);
        const forDeletionToCalendar = forDeletion.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][1].dates.push(...forDeletionToCalendar);
        const avaliableToReserve = forReserves.map(date => {
          const [year, month, day] = date.split('-');
          return new Date(+year, +month - 1, +day);
        });
        calendarAttributes.value[queue.id][2].dates.push(...avaliableToReserve);
      }
    };

    const selectDay = async queue => {
      if (queue && queue.id) {
        state.selectedQueue = queue;
      }
      getBlocks();
      showBookings360();
      const today = getDate(new Date());
      if (getDate(state.selectedDate) !== today) {
        showBookings();
      } else {
        showAttentions();
      }
    };

    const getBlocks = () => {
      if (state.selectedQueue && state.selectedQueue.id) {
        state.blocksByDay = state.blocksCommerceByDay[state.selectedQueue.id];
      }
      if (state.selectedDates[state.selectedQueue.id]) {
        state.selectedDate = state.selectedDates[state.selectedQueue.id];
      } else {
        state.selectedDate = undefined;
      }
      getDisabledDates(state.selectedQueue);
      const blocks = getBlocksByDay(state.selectedQueue) || [];
      const blocksReserved = [];
      const bookingsReserved = state.bookings.map(booking => {
        if (booking.block && booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
          return [...booking.block.blockNumbers];
        } else {
          return booking.block.number;
        }
      });
      const uniqueBlocksReserved = [...new Set(bookingsReserved.flat(Infinity))];
      uniqueBlocksReserved.map(number => {
        const block = blocks.filter(block => block.number === number);
        blocksReserved.push(block);
      });
      const blockAvailables = blocks.filter(
        block => !bookingsReserved.flat(Infinity).includes(block.number)
      );
      state.blocks = [...blocksReserved.flat(), ...blockAvailables].sort(
        (a, b) => a.number - b.number
      );
      loadingBookings.value = false;
    };

    const searchClient = async () => {
      try {
        loadingSearch.value = true;
        state.errorsSearch = [];
        const commerceIds = [commerce.value.id];
        if (!state.searchText || state.searchText.length < 3) {
          state.errorsSearch.push('dashboard.validate.search');
          state.searchTextError = true;
        } else {
          const result = await getClientsDetails(
            commerce.value.businessId,
            commerce.value.id,
            undefined,
            undefined,
            commerceIds,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            state.searchText,
            undefined,
            undefined,
            undefined,
            undefined
          );
          if (result && result.length > 0) {
            state.client = result[0];
          } else {
            state.client = undefined;
          }
          if (!state.client || !state.client.id) {
            state.client = undefined;
          }
          state.errorsSearch = [];
          state.searchTextError = false;
        }
        loadingSearch.value = false;
      } catch (error) {
        loadingSearch.value = false;
      }
    };

    const clearClient = () => {
      state.searchTextError = false;
      state.errorsSearch = [];
      state.searchText = '';
      state.client = {};
      state.clientBookings = [];
      state.extendedBookingsEntity = false;
    };

    const showAttentions = () => {
      state.showAttentions = true;
      state.showBooking = false;
      state.showWaitlist = false;
    };

    const showBookings = () => {
      state.showAttentions = false;
      state.showBooking = true;
      state.showWaitlist = false;
    };

    const showWaitlists = () => {
      state.showAttentions = false;
      state.showBooking = false;
      state.showWaitlist = true;
    };

    const close = () => {
      state.bookings = [];
      state.waitlists = [];
      state.selectedDate = undefined;
      state.selectedQueue = {};
    };

    const selectQueue = queue => {
      state.selectedQueue = queue;
      showAttentions();
    };

    const formattedDate = date => {
      if (date && date !== 'TODAY') {
        return getDate(date);
      }
    };

    const updatedAttentions = async queueId => {
      try {
        loadingAttentions.value = true;
        if (queueId) {
          state.attentions = await getAvailableAttentiosnByQueue(queueId);
        } else {
          state.attentions = await getAvailableAttentiosnByQueue(state.selectedQueue.id);
        }
        loadingAttentions.value = false;
      } catch (error) {
        loadingAttentions.value = false;
      }
    };

    const gotToAttendQueue = async () => {
      try {
        loadingAttentions.value = true;
        const url = `/interno/colaborador/fila/${state.selectedQueue.id}/atenciones`;
        const resolvedRoute = router.resolve({ path: url });
        window.open(resolvedRoute.href, '_blank');
        loadingAttentions.value = false;
      } catch (error) {
        loadingAttentions.value = false;
      }
    };

    const showMyBookings = async () => {
      loadingSearch.value = true;
      state.extendedBookingsEntity = !state.extendedBookingsEntity;
      if (state.extendedBookingsEntity === true) {
        state.clientBookings = await getPendingBookingsByClient(
          commerce.value.id,
          state.client.id,
          state.searchText
        );
      }
      loadingSearch.value = false;
    };

    const showBookings360 = () => {
      state.showBookings360 = true;
      state.showClients360 = false;
    };

    const showClients360 = () => {
      state.showBookings360 = false;
      state.showClients360 = true;
    };

    const changeDate = computed(() => {
      const { selectedDate, selectedQueue, selectedDates } = state;
      return {
        selectedDates,
        selectedDate,
        selectedQueue,
      };
    });

    const changeData = computed(() => {
      const { bookings } = state;
      return {
        bookings,
      };
    });

    watch(changeDate, async (newData, oldData) => {
      loadingBookings.value = true;
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      getBookings();
      if (unsubscribeWaitlists) {
        unsubscribeWaitlists();
      }
      getWaitlists();
      if (state.selectedQueue && state.selectedQueue.id) {
        if (state.selectedQueue.serviceInfo && state.selectedQueue.serviceInfo.specificCalendar) {
          state.specificCalendar = true;
        } else if (commerce.value.serviceInfo && commerce.value.serviceInfo.specificCalendar) {
          state.specificCalendar = true;
        } else {
          state.specificCalendar = false;
        }
        if (state.specificCalendar === true) {
          state.blocks = [];
          if (
            state.selectedQueue.serviceInfo &&
            state.selectedQueue.serviceInfo.specificCalendarDays
          ) {
            state.specificCalendarDates =
              Object.keys(state.selectedQueue.serviceInfo.specificCalendarDays) || [];
            state.specificCalendarDays = commerce.value.serviceInfo.specificCalendarDays;
            state.specificCalendarDates =
              Object.keys(state.selectedQueue.serviceInfo.specificCalendarDays) || [];
          } else if (
            commerce.value.serviceInfo &&
            commerce.value.serviceInfo.specificCalendarDays
          ) {
            state.specificCalendarDates =
              Object.keys(commerce.value.serviceInfo.specificCalendarDays) || [];
            state.specificCalendarDays = commerce.value.serviceInfo.specificCalendarDays;
            state.specificCalendarDates =
              Object.keys(commerce.value.serviceInfo.specificCalendarDays) || [];
          }
          if (newData.selectedQueue.id !== oldData.selectedQueue.id) {
            state.blocksBySpecificCalendarDate =
              await getQueueBlockDetailsBySpecificDayByCommerceId(
                commerce.value.id,
                state.selectedQueue.id
              );
          }
          state.blocks = state.blocksBySpecificCalendarDate[dateYYYYMMDD(state.selectedDate)];
        }
      }
      if (state.specificCalendar === true) {
        if (state.specificCalendarDates.includes(dateYYYYMMDD(state.selectedDate))) {
          await Promise.all([
            updatedAttentions(),
            getAvailableSpecificDatesByMonth(state.selectedQueue, state.selectedDate),
          ]);
        }
      } else {
        await Promise.all([
          updatedAttentions(),
          getAvailableDatesByMonth(state.selectedQueue, state.selectedDate),
        ]);
        getBlocks();
      }
      loadingBookings.value = false;
    });

    watch(changeData, async (newData, oldData) => {
      if (newData.bookings !== oldData.bookings) {
        const newIds = newData.bookings.map(booking => booking.id);
        const oldIds = oldData.bookings.map(booking => booking.id);
        if (!newIds.every(id => oldIds.includes(id))) {
          const currentDate = new Date(
            new Date(state.date || new Date()).setDate(new Date().getDate() + 1)
          )
            .toISOString()
            .slice(0, 10);
          await updateAvailableDays(currentDate);
          if (state.specificCalendar === false) {
            getBlocks();
          }
        }
        getBookingsActiveBlocks();
      }
    });

    watch(queues, async () => {
      loading.value = true;
      initQueues();
      initCalendars();
      state.locale = commerce.value.localeInfo.language;
      const currentDate = new Date(
        new Date(state.date || new Date()).setDate(new Date().getDate() + 1)
      )
        .toISOString()
        .slice(0, 10);
      const [blocksCommerceByDay, ,] = await Promise.all([
        getQueueBlockDetailsByDayByCommerceId(commerce.value.id),
        updateAvailableDays(currentDate),
      ]);
      state.blocksCommerceByDay = blocksCommerceByDay;
      await getAvailableCommerceDatesByMonth(currentDate);
      loading.value = false;
    });

    return {
      state,
      dateMask,
      loading,
      loadingSearch,
      loadingBookings,
      loadingAttentions,
      alertError,
      disabledDates,
      calendarAttributes,
      updatedAttentions,
      getAvailableDatesByCalendarMonth,
      selectDay,
      getBooking,
      formattedDate,
      showAttentions,
      showBookings,
      showWaitlists,
      close,
      showQueue,
      selectQueue,
      copyLink,
      goToCreateBooking,
      searchClient,
      clearClient,
      getBookingBlockNumber,
      showCollaboratorQueue,
      showAllQueue,
      showMyBookings,
      showBookings360,
      showClients360,
      gotToAttendQueue,
      getBookingsActiveBlocks,
    };
  },
};
</script>

<template>
  <div v-if="show" class="modal-body">
    <div class="row">
      <!-- CALENDAR AREA -->
      <div class="col-12 col-lg-7">
        <Spinner :show="loading"> </Spinner>
        <div v-if="queues && queues.length > 0" class="row centered blocks-section">
          <span class="fw-bold mb-2 h6">
            <i class="bi bi-person-lines-fill"></i> {{ $t('collaboratorBookingsView.selectQueue') }}
          </span>
          <div class="row">
            <div class="col-12 col-md-4">
              <button
                class="btn-size btn btn-md btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-1 subtitle-info"
                :class="state.showQueues ? 'btn-selected' : ''"
                @click="showQueue()"
              >
                {{ $t('collaboratorBookingsView.queues') }}
                <i
                  :class="state.showQueues === true ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
                ></i>
              </button>
            </div>
            <div class="col-12 col-md-4">
              <button
                class="btn-size btn btn-md btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-1 subtitle-info"
                :class="state.showCollaboratorQueues ? 'btn-selected' : ''"
                @click="showCollaboratorQueue()"
              >
                {{ $t('collaboratorBookingsView.collaboratorQueues') }}
                <i
                  :class="
                    state.showCollaboratorQueues === true
                      ? 'bi bi-chevron-up'
                      : 'bi bi-chevron-down'
                  "
                ></i>
              </button>
            </div>
            <div class="col-12 col-md-4">
              <button
                class="btn-size btn btn-md btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-1 subtitle-info"
                :class="state.showAllQueues ? 'btn-selected' : ''"
                @click="showAllQueue()"
              >
                {{ $t('collaboratorBookingsView.allQueues') }}
                <i
                  :class="state.showAllQueues === true ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
                ></i>
              </button>
            </div>
            <div
              class="row mx-2 my-2 centered"
              v-if="state.showQueues && queues && queues.length > 0"
            >
              <div
                v-for="queue in queues.filter(queue => queue.type !== 'COLLABORATOR')"
                :key="queue.id"
                class="control-box col-12 col-lg-5"
              >
                <div class="">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <div class="mt-2">
                    <VDatePicker
                      :locale="state.locale"
                      v-model.string="state.selectedDates[queue.id]"
                      :mask="dateMask"
                      :min-date="state.minDate"
                      :max-date="state.maxDate"
                      :disabled-dates="disabledDates[queue.id]"
                      :attributes="calendarAttributes[queue.id]"
                      @dayclick="selectDay(queue)"
                      @transition-start="selectQueue(queue)"
                      @did-move="getAvailableDatesByCalendarMonth"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              class="row mx-2 my-2 centered"
              v-if="state.showCollaboratorQueues && queues && queues.length > 0"
            >
              <div
                v-for="queue in queues.filter(queue => queue.type === 'COLLABORATOR')"
                :key="queue.id"
                class="control-box col-12 col-lg-5"
              >
                <div class="">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <div class="mt-2">
                    <VDatePicker
                      :locale="state.locale"
                      v-model.string="state.selectedDates[queue.id]"
                      :mask="dateMask"
                      :min-date="state.minDate"
                      :max-date="state.maxDate"
                      :disabled-dates="disabledDates[queue.id]"
                      :attributes="calendarAttributes[queue.id]"
                      @dayclick="selectDay(queue)"
                      @transition-start="selectQueue(queue)"
                      @did-move="getAvailableDatesByCalendarMonth"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              class="row mx-2 my-2 centered"
              v-if="state.showAllQueues && queues && queues.length > 0"
            >
              <div v-for="queue in queues" :key="queue.id" class="control-box col-12 col-lg-5">
                <div class="">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <div class="mt-2">
                    <VDatePicker
                      :locale="state.locale"
                      v-model.string="state.selectedDates[queue.id]"
                      :mask="dateMask"
                      :min-date="state.minDate"
                      :max-date="state.maxDate"
                      :disabled-dates="disabledDates[queue.id]"
                      :attributes="calendarAttributes[queue.id]"
                      @dayclick="selectDay(queue)"
                      @transition-start="selectQueue(queue)"
                      @did-move="getAvailableDatesByCalendarMonth"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message
            :title="$t('collaboratorBookingsView.message.1.title')"
            :content="$t('collaboratorBookingsView.message.1.content')"
          />
        </div>
      </div>
      <!-- MANAGEMENT AREA -->
      <div class="col-12 col-lg-5">
        <div class="blocks-section">
          <div class="row sticky-top">
            <div class="col-6 mt-1">
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="state.showBookings360 ? 'btn-selected' : ''"
                @click="showBookings360"
              >
                {{ $t('collaboratorBookingsView.agenda') }} <i class="bi bi-calendar-fill"></i>
              </button>
            </div>
            <div class="col-6 mt-1">
              <button
                class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                :class="state.showClients360 ? 'btn-selected' : ''"
                @click="showClients360"
              >
                {{ $t('collaboratorBookingsView.clientes') }} <i class="bi bi-person-fill"></i>
              </button>
            </div>
          </div>
          <!-- AGENDA 360 -->
          <div v-if="state.showBookings360">
            <div class="row mx-2 mt-2">
              <div class="sticky-top-2">
                <span class="fw-bold h6 mt-1">
                  <i class="bi bi-hourglass-split"></i>
                  {{ $t('collaboratorBookingsView.hours') }}</span
                >
                <div class="row mt-1">
                  <div class="col-7">
                    <div class="subtitle-info mb-1">
                      {{ $t('commerceQueuesView.queueSelected') }}
                    </div>
                    <h6>
                      <div class="badge rounded-pill bg-primary py-2 px-4 mx-1">
                        {{ state.selectedQueue.name || 'N/I' }}
                      </div>
                    </h6>
                  </div>
                  <div class="col-5">
                    <div class="subtitle-info mb-1">
                      {{ $t('commerceQueuesView.dataSelected') }}
                    </div>
                    <h6>
                      <div class="badge rounded-pill bg-secondary py-2 px-4 mx-1">
                        <span> {{ formattedDate(state.selectedDate) || 'N/I' }} </span>
                      </div>
                    </h6>
                  </div>
                </div>
                <hr />
              </div>
              <div id="subMenu" class="">
                <h6 class="mb-0">
                  <button
                    class="btn btn-sm btn-block btn-size fw-bold btn-dark rounded-pill my-1 mx-1 subtitle-info"
                    :class="state.showBooking ? 'btn-selected' : ''"
                    @click="showBookings()"
                    :disabled="!state.selectedQueue || !state.selectedDate"
                  >
                    {{ $t('collaboratorBookingsView.bookings') }} <br />
                    <i class="bi bi-calendar-check-fill"></i>
                  </button>
                  <button
                    class="btn btn-sm btn-block btn-size fw-bold btn-dark rounded-pill my-1 subtitle-info"
                    :class="state.showWaitlist ? 'btn-selected' : ''"
                    @click="showWaitlists()"
                    :disabled="!state.selectedQueue.id || !state.selectedDate"
                  >
                    {{ $t('collaboratorBookingsView.waitlists') }} <br />
                    <i class="bi bi-calendar-heart-fill"></i>
                  </button>
                </h6>
              </div>
              <!-- ATENCIONES -->
              <div v-if="state.showAttentions">
                <div class="mt-2 mb-1">
                  <div class="row">
                    <div class="col">
                      <button
                        class="btn-size btn btn-sm btn-block col-9 fw-bold btn-light rounded-pill mt-1 mb-1"
                        @click="updatedAttentions()"
                        :disabled="!state.selectedQueue.id"
                      >
                        {{ $t('collaboratorBookingsView.update') }}
                        <i class="bi bi-arrow-counterclockwise"></i>
                      </button>
                    </div>
                    <div class="col">
                      <button
                        class="btn-size btn btn-sm col-12 fw-bold btn-light rounded-pill"
                        @click="gotToAttendQueue()"
                        :disabled="!state.selectedQueue.id"
                      >
                        {{ $t('collaboratorBookingsView.attendQueue') }}
                        <i class="bi bi-arrow-up-right-circle"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="centered">
                  <span class="badge bg-secondary px-3 py-2 m-1 hour-title"
                    >{{ $t('collaboratorBookingsView.listResult') }} {{ state.attentions.length }}
                  </span>
                </div>
                <Spinner :show="loadingAttentions"> </Spinner>
                <div v-if="state.attentions && state.attentions.length > 0">
                  <div v-for="(attention, index) in state.attentions" :key="index" class="mt-2">
                    <div class="metric-card">
                      <div v-if="attention.block">
                        <span class="lefted badge rounded-pill bg-primary">
                          {{ attention.block.hourFrom }}</span
                        >
                      </div>
                      <AttentionDetailsCard
                        :attention="attention"
                        :show="true"
                        :details-opened="false"
                        :toggles="toggles"
                        :commerce="commerce"
                        :queues="queues"
                        @updatedAttentions="updatedAttentions"
                      >
                      </AttentionDetailsCard>
                    </div>
                  </div>
                </div>
                <div
                  v-if="state.selectedQueue && (!state.attentions || state.attentions.length === 0)"
                >
                  <Message
                    :title="$t('collaboratorBookingsView.message.4.title')"
                    :content="$t('collaboratorBookingsView.message.4.content')"
                  />
                </div>
              </div>
              <!-- RESERVAS -->
              <div v-if="state.showBooking">
                <div class="my-2">
                  <span class="badge bg-secondary px-3 py-2 m-1 hour-title"
                    >{{ $t('collaboratorBookingsView.listResult') }} {{ state.bookings.length }}
                  </span>
                </div>
                <Spinner :show="loadingBookings"> </Spinner>
                <div v-if="!loadingBookings">
                  <div v-if="state.bookings && state.bookings.length > 0">
                    <div v-for="block in state.blocks" :key="block.number">
                      <div class="metric-card">
                        <span
                          class="lefted badge rounded-pill bg-primary m-0 hour-title"
                          :class="
                            state.bookingsActiveBlocks.includes(block.hourFrom)
                              ? 'bg-primary'
                              : 'bg-success'
                          "
                        >
                          {{ block.hourFrom }}
                        </span>
                        <div v-for="booking in getBookingBlockNumber(block)" :key="booking.id">
                          <BookingDetailsCard
                            :booking="booking"
                            :show="true"
                            :details-opened="false"
                            :toggles="toggles"
                            :commerce="commerce"
                            :queues="queues"
                            :disabled-dates="disabledDates"
                            :calendar-attributes="calendarAttributes"
                            :grouped-queues="state.groupedQueues"
                            @getAvailableDatesByCalendarMonth="getAvailableDatesByCalendarMonth"
                          >
                          </BookingDetailsCard>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="
                      (state.selectedQueue || state.selectedDate) &&
                      (!state.bookings || state.bookings.length === 0)
                    "
                  >
                    <div v-for="block in state.blocks" :key="block.number">
                      <div class="metric-card">
                        <span
                          class="lefted badge rounded-pill bg-primary m-0 hour-title"
                          :class="'bg-success'"
                        >
                          {{ block.hourFrom }}</span
                        >
                      </div>
                    </div>
                  </div>
                  <div v-if="state.selectedDate && (!state.blocks || state.blocks.length === 0)">
                    <Message
                      :title="$t('collaboratorBookingsView.message.10.title')"
                      :content="$t('collaboratorBookingsView.message.10.content')"
                    />
                  </div>
                  <div v-if="!state.selectedQueue || !state.selectedDate">
                    <Message
                      :title="$t('collaboratorBookingsView.message.5.title')"
                      :content="$t('collaboratorBookingsView.message.5.content')"
                    />
                  </div>
                </div>
              </div>
              <!-- LISTA DE ESPERA -->
              <div v-if="state.showWaitlist">
                <div class="my-2">
                  <span class="badge bg-secondary px-3 py-2 m-1 hour-title"
                    >{{ $t('collaboratorBookingsView.listResult') }} {{ state.waitlists.length }}
                  </span>
                </div>
                <div v-if="state.waitlists && state.waitlists.length > 0">
                  <div v-for="waitlist in state.waitlists" :key="waitlist.id">
                    <div>
                      <WaitlistDetailsCard
                        :waitlist="waitlist"
                        :show="true"
                        :details-opened="false"
                        :available-blocks="state.blocks"
                        :toggles="toggles"
                      >
                      </WaitlistDetailsCard>
                    </div>
                  </div>
                </div>
                <div
                  v-if="
                    state.selectedQueue &&
                    state.selectedDate &&
                    (!state.waitlists || state.waitlists.length === 0)
                  "
                >
                  <Message
                    :title="$t('collaboratorBookingsView.message.3.title')"
                    :content="$t('collaboratorBookingsView.message.3.content')"
                  />
                </div>
                <div v-if="!state.selectedQueue || !state.selectedDate">
                  <Message
                    :title="$t('collaboratorBookingsView.message.5.title')"
                    :content="$t('collaboratorBookingsView.message.5.content')"
                  />
                </div>
              </div>
            </div>
          </div>
          <!-- CLIENTS 360 -->
          <div v-if="state.showClients360">
            <div class="row mx-2 mt-2">
              <div class="mb-1">
                <i class="bi bi-search"></i>
                <span class="fw-bold h6"> {{ $t('collaboratorBookingsView.searchClient') }} </span>
              </div>
              <div class="col-8 col-md-8 centered">
                <input
                  min="1"
                  max="50"
                  type="text"
                  class="form-control"
                  v-model="state.searchText"
                  v-bind:class="{ 'is-invalid': state.searchTextError }"
                  :placeholder="$t('dashboard.search2')"
                />
              </div>
              <div class="col-2 col-md-2 centered">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 py-2"
                  @click="searchClient()"
                >
                  <span><i class="bi bi-search"></i></span>
                </button>
              </div>
              <div class="col-2 col-md-2 centered">
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                  @click="clearClient()"
                >
                  <span><i class="bi bi-eraser-fill"></i></span>
                </button>
              </div>
              <Spinner :show="loadingSearch"> </Spinner>
              <div class="row g-1 errors" id="feedback" v-if="state.errorsSearch.length > 0">
                <Warning>
                  <template v-slot:message>
                    <li v-for="(error, index) in state.errorsSearch" :key="index">
                      {{ $t(error) }}
                    </li>
                  </template>
                </Warning>
              </div>
              <div v-if="state.client && state.client.id">
                <ClientDetailsCard
                  :show="true"
                  :client="state.client"
                  :commerce="commerce"
                  :toggles="toggles"
                  :start-date="undefined"
                  :end-date="undefined"
                  :queues="queues"
                  :commerces="[commerce]"
                  :management="false"
                >
                </ClientDetailsCard>
              </div>
              <div v-if="!state.client">
                <Message
                  :icon="'bi-search'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
            <div id="queue-link-form" class="row g-1">
              <div class="col">
                <button class="btn copy-icon" @click="copyLink()">
                  <i class="bi bi-file-earmark-spreadsheet"></i>
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                  @click="goToCreateBooking()"
                >
                  <i class="bi bi-box-arrow-up-right"></i>
                  {{ $t('collaboratorBookingsView.create') }}
                </button>
                <button
                  class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                  @click="showMyBookings()"
                  :disabled="!state.searchText"
                >
                  <i class="bi bi-calendar-check-fill"></i>
                  {{ $t('collaboratorBookingsView.myBookings') }}
                  <i
                    class="dark"
                    :class="`bi ${
                      state.extendedBookingsEntity ? 'bi-chevron-up' : 'bi-chevron-down'
                    }`"
                  ></i>
                </button>
              </div>
            </div>
            <hr />
            <div v-if="state.extendedBookingsEntity">
              <div v-if="state.clientBookings && state.clientBookings.length > 0">
                <span class="fw-bold h6">
                  <i class="bi bi-calendar"></i>
                  {{ $t('collaboratorBookingsView.myBookings') }}</span
                >
                <div class="my-2">
                  <span class="badge bg-secondary px-3 py-2 m-1 hour-title"
                    >{{ $t('collaboratorBookingsView.listResult') }}
                    {{ state.clientBookings.length }}
                  </span>
                </div>
                <div v-for="booking in state.clientBookings" :key="booking.id">
                  <BookingDetailsCard
                    :booking="booking"
                    :show="true"
                    :details-opened="false"
                    :toggles="toggles"
                    :commerce="commerce"
                    :queues="queues"
                    :disabled-dates="disabledDates"
                    :calendar-attributes="calendarAttributes"
                    @getAvailableDatesByCalendarMonth="getAvailableDatesByCalendarMonth"
                  >
                  </BookingDetailsCard>
                </div>
                <hr />
              </div>
              <div v-else>
                <Message
                  :title="$t('collaboratorBookingsView.message.2.title')"
                  :content="$t('collaboratorBookingsView.message.2.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button
        class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
        data-bs-dismiss="modal"
        aria-label="Close"
        @click="close"
      >
        {{ $t('close') }}
        <i class="bi bi-check-lg"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.2rem 0.3rem;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-default);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: 0;
  border-right: 0;
  border-top: 0;
  line-height: 1.6rem;
}
.show {
  padding: 10px;
  max-height: 400px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: 0.7rem;
  color: var(--color-text);
}
.metric-card-title {
  margin: 0.1rem;
  font-size: 0.8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 0.7rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: 0.7rem;
  font-weight: 400;
}
.control-box {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.blocks-section {
  overflow-y: scroll;
  max-height: 600px;
  font-size: small;
  margin-bottom: 2rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  background-color: var(--color-background);
}
.queue-select {
  cursor: pointer;
}
.subtitle-info {
  font-size: 0.9rem;
  line-height: 1rem;
}
.hour-title {
  font-size: 0.75rem;
  padding: 0.35rem;
}
.sticky-top {
  position: -webkit-sticky;
  position: sticky;
  top: -1rem;
  z-index: 1020;
  background-color: var(--color-background);
}
.sticky-top-2 {
  position: -webkit-sticky;
  position: sticky;
  top: 1.8rem;
  z-index: 1020;
  background-color: var(--color-background);
}
</style>
