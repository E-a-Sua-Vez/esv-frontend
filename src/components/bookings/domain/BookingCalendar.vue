<script>
import { ref, watch, reactive, computed, toRefs, onUnmounted, onMounted, nextTick } from 'vue';
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
import AttentionCreationModal from '../../attentions/domain/AttentionCreationDrawer.vue';

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
    AttentionCreationModal,
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
    const firstCalendarRef = ref(null);
    const dateSelectorRef = ref(null);
    const dateSelectorPositioned = ref(false);
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
      showAttentionDrawer: false,
      selectedBlockForDrawer: null,
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
      collapsedQueues: new Set(),
      selectedBooking: null,
      drawerOpen: false,
      showQueueSelector: false,
      showDateSelector: false,
      tempSelectedDate: undefined,
      calendarWidth: 58.33, // Default col-7 (7/12 = 58.33%)
      isResizing: false,
    });

    const { show, commerce, queues, toggles } = toRefs(props);

    onMounted(() => {
      const handleClickOutside = event => {
        if (state.showQueueSelector && !event.target.closest('.queue-badge-clickable')) {
          state.showQueueSelector = false;
        }
        if (
          state.showDateSelector &&
          !event.target.closest('.date-badge-clickable') &&
          !event.target.closest('.date-selector-dropdown')
        ) {
          state.showDateSelector = false;
          dateSelectorPositioned.value = false;
        }
      };
      document.addEventListener('click', handleClickOutside);
      onUnmounted(() => {
        document.removeEventListener('click', handleClickOutside);
      });
    });

    onUnmounted(() => {
      if (unsubscribeBookings) {
        unsubscribeBookings();
      }
      if (unsubscribeWaitlists) {
        unsubscribeWaitlists();
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
      if (state.bookings && state.bookings.length > 0 && block) {
        state.bookings.forEach(booking => {
          if (!booking || !booking.block) return;
          if (booking.block.blocks && booking.block.blocks.length > 0) {
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

    const collapseAllExceptFirst = () => {
      if (!queues.value || queues.value.length === 0) return null;

      let visibleQueues = [];
      if (state.showQueues) {
        visibleQueues = queues.value.filter(queue => queue.type !== 'COLLABORATOR');
      } else if (state.showCollaboratorQueues) {
        visibleQueues = queues.value.filter(queue => queue.type === 'COLLABORATOR');
      } else if (state.showAllQueues) {
        visibleQueues = queues.value;
      }

      if (visibleQueues.length > 0) {
        // First, collapse ALL queues (including those not in visibleQueues)
        queues.value.forEach(queue => {
          state.collapsedQueues.add(queue.id);
        });
        // Then expand only the first one from visible queues
        if (visibleQueues[0]) {
          state.collapsedQueues.delete(visibleQueues[0].id);
          return visibleQueues[0].id;
        }
      }
      return null;
    };

    const scrollToFirstCalendar = async queueId => {
      if (!queueId) return;
      await scrollToQueueCalendar(queueId);
    };

    const scrollToQueueCalendar = async queueId => {
      if (!queueId) return;
      await nextTick();
      // Wait a bit more for the calendar to render and be visible
      setTimeout(() => {
        const calendarBox = document.querySelector(`[data-queue-id="${queueId}"]`);
        if (calendarBox) {
          // Find the calendar wrapper (the visible calendar)
          const calendarWrapper = calendarBox.querySelector('.calendar-wrapper');
          if (calendarWrapper && calendarWrapper.offsetParent !== null) {
            // Calendar is visible, scroll to it with center alignment
            calendarWrapper.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          } else {
            // Fallback: scroll to the control box
            calendarBox.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest',
            });
          }
        }
      }, 150);
    };

    const showQueue = async () => {
      const wasOpen = state.showQueues;
      state.showQueues = !state.showQueues;
      state.showCollaboratorQueues = false;
      state.showAllQueues = false;
      if (state.showQueues) {
        // Always collapse all and show only first when opening
        const firstQueueId = collapseAllExceptFirst();
        await scrollToFirstCalendar(firstQueueId);
      } else if (wasOpen) {
        // If closing, collapse all
        if (queues.value) {
          queues.value.forEach(queue => {
            state.collapsedQueues.add(queue.id);
          });
        }
      }
    };

    const showCollaboratorQueue = async () => {
      const wasOpen = state.showCollaboratorQueues;
      state.showQueues = false;
      state.showCollaboratorQueues = !state.showCollaboratorQueues;
      state.showAllQueues = false;
      if (state.showCollaboratorQueues) {
        // Always collapse all and show only first when opening
        const firstQueueId = collapseAllExceptFirst();
        await scrollToFirstCalendar(firstQueueId);
      } else if (wasOpen) {
        // If closing, collapse all
        if (queues.value) {
          queues.value.forEach(queue => {
            state.collapsedQueues.add(queue.id);
          });
        }
      }
    };

    const showAllQueue = async () => {
      const wasOpen = state.showAllQueues;
      state.showQueues = false;
      state.showCollaboratorQueues = false;
      state.showAllQueues = !state.showAllQueues;
      if (state.showAllQueues) {
        // Always collapse all and show only first when opening
        const firstQueueId = collapseAllExceptFirst();
        await scrollToFirstCalendar(firstQueueId);
      } else if (wasOpen) {
        // If closing, collapse all
        if (queues.value) {
          queues.value.forEach(queue => {
            state.collapsedQueues.add(queue.id);
          });
        }
      }
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

    const selectDay = async (date, queue) => {
      try {
        // VDatePicker @dayclick passes date as first param, queue is passed via closure
        // If first param is a queue object (from old code), handle it
        if (date && date.id && !queue) {
          // First param is actually the queue (backward compatibility)
          queue = date;
          date = null;
        }

        // If queue is provided, set it as selected
        if (queue && queue.id) {
          state.selectedQueue = queue;
        }

        // If date is provided, update selectedDate
        if (date) {
          let dateValue = date;
          if (date instanceof Date) {
            const year = date.getFullYear();
            const month = date.getMonth();
            const day = date.getDate();
            dateValue = new Date(year, month, day);
          } else if (typeof date === 'string') {
            const parsed = new Date(date);
            const year = parsed.getFullYear();
            const month = parsed.getMonth();
            const day = parsed.getDate();
            dateValue = new Date(year, month, day);
          }

          if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            state.selectedDate = dateString;

            // Update selectedDates for the queue
            if (state.selectedQueue && state.selectedQueue.id) {
              state.selectedDates[state.selectedQueue.id] = dateValue;
            }
          }
        }

        getBlocks();
        showBookings360();
        const today = getDate(new Date());
        if (getDate(state.selectedDate) !== today) {
          showBookings();
        } else {
          showAttentions();
        }
      } catch (error) {
        console.error('Error in selectDay:', error);
      }
    };

    const getBlocks = () => {
      if (state.selectedQueue && state.selectedQueue.id) {
        state.blocksByDay = state.blocksCommerceByDay[state.selectedQueue.id];
      }
      if (state.selectedDates[state.selectedQueue.id]) {
        const dateValue = state.selectedDates[state.selectedQueue.id];
        // Convert to string if it's a Date object
        if (dateValue instanceof Date) {
          state.selectedDate = dateYYYYMMDD(dateValue);
        } else if (typeof dateValue === 'string') {
          state.selectedDate = dateValue;
        } else {
          // Handle other formats
          try {
            state.selectedDate = dateYYYYMMDD(dateValue);
          } catch (e) {
            state.selectedDate = undefined;
          }
        }
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
          } else {
            // Client found - scroll to client details after rendering
            nextTick(() => {
              setTimeout(() => {
                // Find the client details wrapper within the client search section
                const clientSearchSection = document.querySelector('.client-search-section');
                if (clientSearchSection) {
                  const clientDetailsWrapper =
                    clientSearchSection.querySelector('.client-details-wrapper');
                  if (clientDetailsWrapper) {
                    // Scroll the wrapper into view with smooth behavior
                    clientDetailsWrapper.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                      inline: 'nearest',
                    });
                  }
                }
              }, 150); // Small delay to ensure DOM is fully rendered
            });
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
      clearClient();
    };

    const selectQueue = async queue => {
      state.selectedQueue = queue;
      state.selectedDate = undefined;
      if (state.selectedDates && state.selectedQueue.id) {
        state.selectedDates[state.selectedQueue.id] = undefined;
      }
      state.showQueueSelector = false;

      // Show the correct queue type view based on the selected queue
      if (queue.type === 'COLLABORATOR') {
        state.showCollaboratorQueues = true;
        state.showQueues = false;
        state.showAllQueues = false;
      } else {
        state.showQueues = true;
        state.showCollaboratorQueues = false;
        state.showAllQueues = false;
      }

      // Ensure the calendar for this queue is open
      if (state.collapsedQueues.has(queue.id)) {
        state.collapsedQueues.delete(queue.id);
      }

      // Scroll to the calendar
      await scrollToQueueCalendar(queue.id);

      showAttentions();
    };

    const toggleQueueCollapse = (queueId, event) => {
      event.stopPropagation();
      if (state.collapsedQueues.has(queueId)) {
        state.collapsedQueues.delete(queueId);
      } else {
        state.collapsedQueues.add(queueId);
      }
    };

    const selectDate = async date => {
      try {
        // VDatePicker @dayclick passes date as first param
        // Use provided date or fall back to tempSelectedDate
        let dateValue = date || state.tempSelectedDate;

        if (!state.selectedQueue || !state.selectedQueue.id || !dateValue) return;

        if (dateValue instanceof Date) {
          // Date is already a Date object - use local date to avoid timezone issues
          // Create a new date using local timezone to avoid UTC conversion issues
          const year = dateValue.getFullYear();
          const month = dateValue.getMonth();
          const day = dateValue.getDate();
          dateValue = new Date(year, month, day);
        } else if (typeof dateValue === 'string') {
          // Parse string date and create in local timezone
          const parsed = new Date(dateValue);
          const year = parsed.getFullYear();
          const month = parsed.getMonth();
          const day = parsed.getDate();
          dateValue = new Date(year, month, day);
        } else if (dateValue && typeof dateValue === 'object' && dateValue.getTime) {
          // Date-like object - convert to local date
          const temp = new Date(dateValue);
          const year = temp.getFullYear();
          const month = temp.getMonth();
          const day = temp.getDate();
          dateValue = new Date(year, month, day);
        }

        // Ensure we have a valid date
        if (!dateValue || !(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
          return;
        }

        // Convert to YYYY-MM-DD format using local timezone (not UTC)
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Update both selectedDate and selectedDates for the queue
        state.selectedDate = dateString;
        state.selectedDates[state.selectedQueue.id] = dateValue;

        // Close the date selector
        state.showDateSelector = false;
        dateSelectorPositioned.value = false;

        // Update blocks and agenda
        getBlocks();
        showBookings360();
        const today = getDate(new Date());
        if (getDate(state.selectedDate) !== today) {
          showBookings();
        } else {
          showAttentions();
        }

        // Scroll to the calendar
        await scrollToQueueCalendar(state.selectedQueue.id);
      } catch (error) {
        console.error('Error in selectDate:', error);
      }
    };

    const startResize = e => {
      e.preventDefault();
      state.isResizing = true;

      const container = document.querySelector('.resizable-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const initialMouseX = e.clientX;
      const initialCalendarWidth = state.calendarWidth;
      const containerWidth = containerRect.width;

      const handleMouseMove = e => {
        if (!state.isResizing) return;

        // Calculate the difference in mouse position
        const deltaX = e.clientX - initialMouseX;

        // Convert pixel delta to percentage
        const deltaPercentage = (deltaX / containerWidth) * 100;

        // Calculate new width based on initial width + delta
        const newWidth = initialCalendarWidth + deltaPercentage;

        // Constrain between min (58.33% = col-7) and max (75% = col-9)
        const minWidth = 58.33;
        const maxWidth = 75;
        state.calendarWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      };

      const handleMouseUp = () => {
        state.isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const openDateSelector = () => {
      if (!state.selectedQueue || !state.selectedQueue.id) return;
      dateSelectorPositioned.value = false;
      state.showDateSelector = true;
      // Initialize temp date with current selected date or today
      // Use local timezone to avoid date shifting
      if (state.selectedDate) {
        const [year, month, day] = state.selectedDate.split('-');
        state.tempSelectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (state.selectedDates[state.selectedQueue.id]) {
        const dateVal = state.selectedDates[state.selectedQueue.id];
        if (dateVal instanceof Date) {
          const year = dateVal.getFullYear();
          const month = dateVal.getMonth();
          const day = dateVal.getDate();
          state.tempSelectedDate = new Date(year, month, day);
        } else {
          state.tempSelectedDate = new Date(dateVal);
        }
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();
        state.tempSelectedDate = new Date(year, month, day);
      }

      // Position the dropdown after it's rendered - only once
      nextTick(() => {
        if (dateSelectorPositioned.value || !dateSelectorRef.value) return;

        const dropdown = dateSelectorRef.value;
        const badge = document.querySelector('.date-badge-clickable:not(.date-badge-disabled)');

        if (dropdown && badge) {
          // Wait a bit more for the dropdown to render and get its actual size
          setTimeout(() => {
            if (!dateSelectorRef.value) return;

            const badgeRect = badge.getBoundingClientRect();
            const dropdownRect = dropdown.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            // Get actual dropdown dimensions
            const dropdownWidth = dropdownRect.width || 320;
            const dropdownHeight = dropdownRect.height || 350;

            // Calculate position - center below badge initially
            let top = badgeRect.bottom + 4;
            let left = badgeRect.left + badgeRect.width / 2;

            // Check if dropdown would go off bottom of screen
            if (top + dropdownHeight > viewportHeight - 10) {
              top = Math.max(10, badgeRect.top - dropdownHeight - 4);
            }

            // Ensure dropdown doesn't go off right side
            const rightEdge = left + dropdownWidth / 2;
            if (rightEdge > viewportWidth - 10) {
              left = viewportWidth - dropdownWidth / 2 - 10;
            }

            // Position more to the left to ensure full visibility
            // Calculate optimal position - prefer left side if badge is on the right
            const badgeCenter = badgeRect.left + badgeRect.width / 2;
            const spaceOnLeft = badgeCenter;
            const spaceOnRight = viewportWidth - badgeCenter;

            // If there's more space on the left, position it more to the left
            if (spaceOnLeft > spaceOnRight) {
              // Position it more to the left of the badge
              left = Math.max(dropdownWidth / 2 + 20, badgeRect.left - 50);
            }

            // Ensure dropdown doesn't go off left side
            const leftEdge = left - dropdownWidth / 2;
            if (leftEdge < 20) {
              left = dropdownWidth / 2 + 20; // Ensure full visibility with padding
            }

            // Double-check both edges are within bounds
            const finalLeftEdge = left - dropdownWidth / 2;
            const finalRightEdge = left + dropdownWidth / 2;
            if (finalLeftEdge < 20) {
              left = dropdownWidth / 2 + 20;
            } else if (finalRightEdge > viewportWidth - 20) {
              left = viewportWidth - dropdownWidth / 2 - 20;
            }

            // Set position only once
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${Math.max(10, top)}px`;
            dropdown.style.left = `${left}px`;
            dropdown.style.transform = 'translateX(-50%)';
            dropdown.style.marginLeft = '0';
            dropdown.style.marginRight = '0';
            const maxHeightPx = Math.min(
              viewportHeight - Math.max(10, top) - 20,
              viewportHeight * 0.9
            );
            dropdown.style.maxHeight = `${maxHeightPx}px`;

            dateSelectorPositioned.value = true;
          }, 50);
        }
      });
    };

    const toggleAllCalendars = () => {
      if (!queues.value || queues.value.length === 0) return;

      let visibleQueues = [];
      if (state.showQueues) {
        visibleQueues = queues.value.filter(queue => queue.type !== 'COLLABORATOR');
      } else if (state.showCollaboratorQueues) {
        visibleQueues = queues.value.filter(queue => queue.type === 'COLLABORATOR');
      } else if (state.showAllQueues) {
        visibleQueues = queues.value;
      }

      // If all are expanded, collapse them; otherwise expand them
      const allExpanded = visibleQueues.every(queue => !state.collapsedQueues.has(queue.id));

      visibleQueues.forEach(queue => {
        if (allExpanded) {
          state.collapsedQueues.add(queue.id);
        } else {
          state.collapsedQueues.delete(queue.id);
        }
      });
    };

    const hasVisibleCalendars = computed(
      () => state.showQueues || state.showCollaboratorQueues || state.showAllQueues
    );

    const allCalendarsExpanded = computed(() => {
      if (!queues.value || queues.value.length === 0) return false;

      let visibleQueues = [];
      if (state.showQueues) {
        visibleQueues = queues.value.filter(queue => queue.type !== 'COLLABORATOR');
      } else if (state.showCollaboratorQueues) {
        visibleQueues = queues.value.filter(queue => queue.type === 'COLLABORATOR');
      } else if (state.showAllQueues) {
        visibleQueues = queues.value;
      }

      if (visibleQueues.length === 0) return false;
      return visibleQueues.every(queue => !state.collapsedQueues.has(queue.id));
    });

    const hasActiveState = computed(
      () =>
        !!(
          (state.client && state.client.id) ||
          state.selectedDate ||
          (state.selectedQueue && state.selectedQueue.id) ||
          (state.bookings && state.bookings.length > 0) ||
          (state.waitlists && Object.keys(state.waitlists).length > 0) ||
          state.drawerOpen ||
          state.searchText
        )
    );

    const availableQueues = computed(() => {
      if (!queues.value || queues.value.length === 0) return [];
      const validQueues = queues.value.filter(queue => queue && queue.type);
      if (state.showQueues) {
        return validQueues.filter(queue => queue.type !== 'COLLABORATOR');
      } else if (state.showCollaboratorQueues) {
        return validQueues.filter(queue => queue.type === 'COLLABORATOR');
      } else if (state.showAllQueues) {
        return validQueues;
      }
      return validQueues;
    });

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

    const openBookingDrawer = booking => {
      state.selectedBooking = booking;
      // Find the queue for this booking
      if (booking && booking.queueId && queues.value) {
        const queue = queues.value.find(q => q.id === booking.queueId);
        if (queue) {
          state.selectedQueue = queue;
        }
      }
      // Set selected date from booking (always convert to string)
      if (booking && booking.date) {
        let dateValue = booking.date;
        // Handle Firestore Timestamp
        if (
          dateValue &&
          typeof dateValue === 'object' &&
          dateValue.toDate &&
          typeof dateValue.toDate === 'function'
        ) {
          dateValue = dateValue.toDate();
        }
        // Convert Date to string
        if (dateValue instanceof Date) {
          state.selectedDate = dateYYYYMMDD(dateValue);
        } else if (typeof dateValue === 'string') {
          // If it's already a string, use it directly (ensure it's in YYYY-MM-DD format)
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            state.selectedDate = dateValue;
          } else {
            // Try to parse and convert
            try {
              const parsedDate = new Date(dateValue);
              state.selectedDate = dateYYYYMMDD(parsedDate);
            } catch (e) {
              state.selectedDate = undefined;
            }
          }
        } else {
          // Fallback: try to convert using dateYYYYMMDD
          try {
            state.selectedDate = dateYYYYMMDD(dateValue);
          } catch (e) {
            state.selectedDate = undefined;
          }
        }
      } else {
        state.selectedDate = undefined;
      }
      state.drawerOpen = true;
    };

    const closeBookingDrawer = () => {
      state.drawerOpen = false;
      state.selectedBooking = null;
    };

    const openAttentionDrawer = block => {
      console.log('openAttentionDrawer called with block:', block);
      console.log('selectedQueue:', state.selectedQueue);
      console.log('selectedDate:', state.selectedDate);

      if (!state.selectedQueue || !state.selectedQueue.id) {
        alertError.value = 'Please select a queue first';
        console.warn('Cannot open drawer: queue not selected');
        return;
      }
      if (!state.selectedDate) {
        alertError.value = 'Please select a date first';
        console.warn('Cannot open drawer: date not selected');
        return;
      }

      // Check if hour is already booked
      if (block && block.hourFrom && state.bookingsActiveBlocks.includes(block.hourFrom)) {
        console.log('Hour is already booked, cannot create attention');
        return;
      }

      console.log('Opening attention drawer');
      state.selectedBlockForDrawer = block;
      state.showAttentionDrawer = true;
    };

    const closeAttentionDrawer = () => {
      state.showAttentionDrawer = false;
      state.selectedBlockForDrawer = null;
    };

    const handleAttentionCreated = async attention => {
      // Refresh bookings/attentions after creation
      closeAttentionDrawer();
      // Trigger refresh - this will depend on your refresh logic
      if (state.selectedQueue && state.selectedQueue.id) {
        await getBookings();
      }
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
      // Guard against null values during unmount
      if (!newData || !oldData || !commerce.value || !state.selectedQueue) {
        return;
      }
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
        } else if (
          commerce.value &&
          commerce.value.serviceInfo &&
          commerce.value.serviceInfo.specificCalendar
        ) {
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
            if (commerce.value && commerce.value.serviceInfo) {
              state.specificCalendarDays = commerce.value.serviceInfo.specificCalendarDays;
            }
            state.specificCalendarDates =
              Object.keys(state.selectedQueue.serviceInfo.specificCalendarDays) || [];
          } else if (
            commerce.value &&
            commerce.value.serviceInfo &&
            commerce.value.serviceInfo.specificCalendarDays
          ) {
            state.specificCalendarDates =
              Object.keys(commerce.value.serviceInfo.specificCalendarDays) || [];
            state.specificCalendarDays = commerce.value.serviceInfo.specificCalendarDays;
            state.specificCalendarDates =
              Object.keys(commerce.value.serviceInfo.specificCalendarDays) || [];
          }
          if (
            newData.selectedQueue &&
            newData.selectedQueue.id &&
            oldData.selectedQueue &&
            newData.selectedQueue.id !== oldData.selectedQueue.id
          ) {
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
      // Guard against null values during unmount
      if (!newData || !oldData || !newData.bookings || !oldData.bookings) {
        return;
      }
      if (newData.bookings !== oldData.bookings) {
        const newIds = newData.bookings.map(booking => booking && booking.id).filter(Boolean);
        const oldIds = oldData.bookings.map(booking => booking && booking.id).filter(Boolean);
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
      if (!commerce.value || !commerce.value.id) {
        loading.value = false;
        return;
      }
      loading.value = true;
      initQueues();
      initCalendars();
      if (commerce.value.localeInfo && commerce.value.localeInfo.language) {
        state.locale = commerce.value.localeInfo.language;
      }
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
      toggleQueueCollapse,
      toggleAllCalendars,
      hasVisibleCalendars,
      allCalendarsExpanded,
      hasActiveState,
      availableQueues,
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
      openBookingDrawer,
      closeBookingDrawer,
      openAttentionDrawer,
      closeAttentionDrawer,
      handleAttentionCreated,
      getDate,
      selectDate,
      openDateSelector,
      startResize,
    };
  },
};
</script>

<template>
  <div v-if="show" class="modal-body modal-body-full-height">
    <div class="row h-100 resizable-container">
      <!-- CALENDAR AREA -->
      <div
        class="calendar-section"
        :style="{ width: state.calendarWidth + '%', minWidth: '58.33%', maxWidth: '75%' }"
      >
        <Spinner :show="loading"> </Spinner>
        <div v-if="queues && queues.length > 0" class="queue-selector-section">
          <div class="queue-selector-header">
            <i class="bi bi-person-lines-fill"></i>
            <h6 class="queue-selector-title">{{ $t('collaboratorBookingsView.selectQueue') }}</h6>
          </div>
          <div class="queue-selector-buttons">
            <button
              class="queue-selector-btn"
              :class="state.showQueues ? 'queue-selector-btn-active' : ''"
              @click="showQueue()"
            >
              <i class="bi bi-list-ul"></i>
              {{ $t('collaboratorBookingsView.queues') }}
              <i :class="state.showQueues === true ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
            </button>
            <button
              class="queue-selector-btn"
              :class="state.showCollaboratorQueues ? 'queue-selector-btn-active' : ''"
              @click="showCollaboratorQueue()"
            >
              <i class="bi bi-people"></i>
              {{ $t('collaboratorBookingsView.collaboratorQueues') }}
              <i
                :class="
                  state.showCollaboratorQueues === true ? 'bi bi-chevron-up' : 'bi bi-chevron-down'
                "
              ></i>
            </button>
            <button
              class="queue-selector-btn"
              :class="state.showAllQueues ? 'queue-selector-btn-active' : ''"
              @click="showAllQueue()"
            >
              <i class="bi bi-grid-3x3-gap"></i>
              {{ $t('collaboratorBookingsView.allQueues') }}
              <i
                :class="state.showAllQueues === true ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
              ></i>
            </button>
          </div>
          <div v-if="hasVisibleCalendars" class="calendar-controls">
            <button
              class="calendar-toggle-btn"
              @click="toggleAllCalendars"
              :title="allCalendarsExpanded ? 'Recolher todos' : 'Expandir todos'"
            >
              <i :class="allCalendarsExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
              <span>{{ allCalendarsExpanded ? 'Recolher todos' : 'Expandir todos' }}</span>
            </button>
          </div>
          <div class="row g-1 mx-0 my-0" v-if="state.showQueues && queues && queues.length > 0">
            <div
              v-for="(queue, index) in queues.filter(
                queue => queue && queue.type && queue.type !== 'COLLABORATOR'
              )"
              :key="queue.id"
              :data-queue-id="queue.id"
              :ref="index === 0 ? 'firstCalendarRef' : null"
              class="control-box col-12 col-md-6 col-lg-6"
            >
              <div class="">
                <div class="queue-select-header">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <button
                    type="button"
                    class="collapse-toggle-btn"
                    :class="{ collapsed: state.collapsedQueues.has(queue.id) }"
                    @click.stop="toggleQueueCollapse(queue.id, $event)"
                    :aria-expanded="!state.collapsedQueues.has(queue.id)"
                    aria-label="Toggle calendar"
                  >
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
                <div class="mt-1 calendar-wrapper" v-show="!state.collapsedQueues.has(queue.id)">
                  <VDatePicker
                    :locale="state.locale"
                    :view="'monthly'"
                    v-model="state.selectedDates[queue.id]"
                    :mask="dateMask"
                    :min-date="state.minDate"
                    :max-date="state.maxDate"
                    :disabled-dates="disabledDates[queue.id]"
                    :attributes="calendarAttributes[queue.id]"
                    @dayclick="date => selectDay(date, queue)"
                    @transition-start="selectQueue(queue)"
                    @did-move="getAvailableDatesByCalendarMonth"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="row g-1 mx-0 my-0"
            v-if="state.showCollaboratorQueues && queues && queues.length > 0"
          >
            <div
              v-for="(queue, index) in queues.filter(
                queue => queue && queue.type && queue.type === 'COLLABORATOR'
              )"
              :key="queue.id"
              :data-queue-id="queue.id"
              :ref="index === 0 ? 'firstCalendarRef' : null"
              class="control-box col-12 col-md-6 col-lg-6"
            >
              <div class="">
                <div class="queue-select-header">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <button
                    type="button"
                    class="collapse-toggle-btn"
                    :class="{ collapsed: state.collapsedQueues.has(queue.id) }"
                    @click.stop="toggleQueueCollapse(queue.id, $event)"
                    :aria-expanded="!state.collapsedQueues.has(queue.id)"
                    aria-label="Toggle calendar"
                  >
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
                <div class="mt-1 calendar-wrapper" v-show="!state.collapsedQueues.has(queue.id)">
                  <VDatePicker
                    :locale="state.locale"
                    :view="'monthly'"
                    v-model="state.selectedDates[queue.id]"
                    :mask="dateMask"
                    :min-date="state.minDate"
                    :max-date="state.maxDate"
                    :disabled-dates="disabledDates[queue.id]"
                    :attributes="calendarAttributes[queue.id]"
                    @dayclick="date => selectDay(date, queue)"
                    @transition-start="selectQueue(queue)"
                    @did-move="getAvailableDatesByCalendarMonth"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="row g-1 mx-0 my-0" v-if="state.showAllQueues && queues && queues.length > 0">
            <div
              v-for="(queue, index) in queues"
              :key="queue.id"
              :data-queue-id="queue.id"
              :ref="index === 0 ? 'firstCalendarRef' : null"
              class="control-box col-12 col-md-6 col-lg-6"
            >
              <div class="">
                <div class="queue-select-header">
                  <div class="queue-select">
                    <QueueName
                      :queue="queue"
                      @click="selectQueue(queue)"
                      :selected="state.selectedQueue.id === queue.id"
                    >
                    </QueueName>
                  </div>
                  <button
                    type="button"
                    class="collapse-toggle-btn"
                    :class="{ collapsed: state.collapsedQueues.has(queue.id) }"
                    @click.stop="toggleQueueCollapse(queue.id, $event)"
                    :aria-expanded="!state.collapsedQueues.has(queue.id)"
                    aria-label="Toggle calendar"
                  >
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
                <div class="mt-1 calendar-wrapper" v-show="!state.collapsedQueues.has(queue.id)">
                  <VDatePicker
                    :locale="state.locale"
                    :view="'monthly'"
                    v-model="state.selectedDates[queue.id]"
                    :mask="dateMask"
                    :min-date="state.minDate"
                    :max-date="state.maxDate"
                    :disabled-dates="disabledDates[queue.id]"
                    :attributes="calendarAttributes[queue.id]"
                    @dayclick="date => selectDay(date, queue)"
                    @transition-start="selectQueue(queue)"
                    @did-move="getAvailableDatesByCalendarMonth"
                  />
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
      <!-- RESIZER BAR -->
      <div class="resizer-bar" @mousedown="startResize" :class="{ resizing: state.isResizing }">
        <div class="resizer-handle"></div>
      </div>
      <!-- MANAGEMENT AREA -->
      <div
        class="management-area-column d-flex flex-column h-100"
        :style="{ width: 100 - state.calendarWidth + '%', minWidth: '25%', maxWidth: '41.67%' }"
      >
        <div class="blocks-section">
          <div class="management-header">
            <button
              class="management-tab-btn"
              :class="state.showBookings360 ? 'management-tab-btn-active' : ''"
              @click="showBookings360"
            >
              <i class="bi bi-calendar-fill"></i>
              {{ $t('collaboratorBookingsView.agenda') }}
            </button>
            <button
              class="management-tab-btn"
              :class="state.showClients360 ? 'management-tab-btn-active' : ''"
              @click="showClients360"
            >
              <i class="bi bi-person-fill"></i>
              {{ $t('collaboratorBookingsView.clientes') }}
            </button>
          </div>
          <!-- AGENDA 360 -->
          <div v-if="state.showBookings360" class="agenda-content-wrapper">
            <div class="hours-section">
              <div class="sticky-top-2">
                <div class="hours-header">
                  <i class="bi bi-hourglass-split"></i>
                  <h6 class="hours-title">{{ $t('collaboratorBookingsView.hours') }}</h6>
                </div>
                <div class="selected-info-grid">
                  <div class="selected-info-item">
                    <div class="selected-info-label">
                      {{ $t('commerceQueuesView.queueSelected') }}
                    </div>
                    <div
                      class="selected-info-badge selected-queue-badge queue-badge-clickable"
                      @click="state.showQueueSelector = !state.showQueueSelector"
                      style="cursor: pointer; position: relative"
                    >
                      {{ state.selectedQueue.name || 'N/I' }}
                      <i class="bi bi-chevron-down ms-1" style="font-size: 0.7rem"></i>
                      <div
                        v-if="state.showQueueSelector && availableQueues.length > 0"
                        class="queue-selector-dropdown"
                        @click.stop
                      >
                        <div
                          v-for="queue in availableQueues"
                          :key="queue.id"
                          class="queue-selector-item"
                          :class="{
                            'queue-selector-item-active': state.selectedQueue.id === queue.id,
                          }"
                          @click="selectQueue(queue)"
                        >
                          <i class="bi bi-person-lines-fill"></i>
                          {{ queue.name }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="selected-info-item">
                    <div class="selected-info-label">
                      {{ $t('commerceQueuesView.dataSelected') }}
                    </div>
                    <div
                      class="selected-info-badge selected-date-badge date-badge-clickable"
                      @click="openDateSelector"
                      :class="{
                        'date-badge-disabled': !state.selectedQueue || !state.selectedQueue.id,
                      }"
                      style="cursor: pointer; position: relative"
                    >
                      {{ formattedDate(state.selectedDate) || 'N/I' }}
                      <i
                        v-if="state.selectedQueue && state.selectedQueue.id"
                        class="bi bi-chevron-down ms-1"
                        style="font-size: 0.7rem"
                      ></i>
                      <div
                        v-if="
                          state.showDateSelector && state.selectedQueue && state.selectedQueue.id
                        "
                        ref="dateSelectorRef"
                        class="date-selector-dropdown"
                        @click.stop
                      >
                        <div class="date-selector-header">
                          <i class="bi bi-calendar-check"></i>
                          <span>{{ $t('commerceQueuesView.dataSelected') }}</span>
                        </div>
                        <div class="date-selector-calendar">
                          <VDatePicker
                            :locale="state.locale"
                            :view="'monthly'"
                            v-model="state.tempSelectedDate"
                            :mask="dateMask"
                            :min-date="state.minDate"
                            :max-date="state.maxDate"
                            :disabled-dates="disabledDates[state.selectedQueue.id]"
                            :attributes="calendarAttributes[state.selectedQueue.id]"
                            @dayclick="date => selectDate(date)"
                            @update:model-value="date => selectDate(date)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="hours-divider"></div>
              </div>
              <div id="subMenu" class="hours-tabs">
                <button
                  class="hours-tab-btn"
                  :class="state.showBooking ? 'hours-tab-btn-active' : ''"
                  @click="showBookings()"
                  :disabled="!state.selectedQueue || !state.selectedDate"
                >
                  <i class="bi bi-calendar-check-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.bookings') }}</span>
                </button>
                <button
                  class="hours-tab-btn"
                  :class="state.showWaitlist ? 'hours-tab-btn-active' : ''"
                  @click="showWaitlists()"
                  :disabled="!state.selectedQueue.id || !state.selectedDate"
                >
                  <i class="bi bi-calendar-heart-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.waitlists') }}</span>
                </button>
              </div>
              <!-- ATENCIONES -->
              <div v-if="state.showAttentions">
                <div class="hours-actions">
                  <button
                    class="hours-action-btn"
                    @click="updatedAttentions()"
                    :disabled="!state.selectedQueue.id"
                  >
                    <i class="bi bi-arrow-counterclockwise"></i>
                    <span>{{ $t('collaboratorBookingsView.update') }}</span>
                  </button>
                  <button
                    class="hours-action-btn hours-action-btn-primary"
                    @click="gotToAttendQueue()"
                    :disabled="!state.selectedQueue.id"
                  >
                    <i class="bi bi-arrow-up-right-circle"></i>
                    <span>{{ $t('collaboratorBookingsView.attendQueue') }}</span>
                  </button>
                </div>
                <div class="hours-count-badge">
                  <span class="hours-count-text">
                    {{ $t('collaboratorBookingsView.listResult') }} {{ state.attentions.length }}
                  </span>
                </div>
                <Spinner :show="loadingAttentions"> </Spinner>
                <div v-if="state.attentions && state.attentions.length > 0">
                  <div v-for="(attention, index) in state.attentions" :key="index" class="mt-2">
                    <div class="metric-card">
                      <div v-if="attention.block">
                        <span class="lefted badge bg-primary hour-title">
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
                        :disable-click="
                          attention.status === 'TERMINATED' ||
                          attention.status === 'CANCELLED' ||
                          attention.status === 'USER_CANCELLED' ||
                          attention.status === 'RATED'
                        "
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
                          class="lefted badge hour-title"
                          :class="
                            state.bookingsActiveBlocks.includes(block.hourFrom)
                              ? 'bg-primary'
                              : 'bg-success'
                          "
                          @click="openAttentionDrawer(block)"
                          :style="
                            !state.bookingsActiveBlocks.includes(block.hourFrom)
                              ? 'cursor: pointer;'
                              : 'cursor: default;'
                          "
                        >
                          {{ block.hourFrom }}
                        </span>
                        <div
                          v-for="booking in getBookingBlockNumber(block)"
                          :key="booking?.id || Math.random()"
                        >
                          <BookingDetailsCard
                            v-if="booking && booking.id"
                            :booking="booking"
                            :show="true"
                            :details-opened="false"
                            :toggles="toggles"
                            :commerce="commerce"
                            :queues="queues"
                            :disabled-dates="disabledDates"
                            :calendar-attributes="calendarAttributes"
                            :grouped-queues="state.groupedQueues"
                            :drawer-mode="true"
                            :disable-click="
                              booking.status === 'CANCELLED' || booking.processed === true
                            "
                            @getAvailableDatesByCalendarMonth="getAvailableDatesByCalendarMonth"
                            @open-drawer="openBookingDrawer"
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
                          class="lefted badge hour-title bg-success"
                          @click="openAttentionDrawer(block)"
                          style="cursor: pointer"
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
            <div class="client-search-section">
              <div class="client-search-header">
                <i class="bi bi-search"></i>
                <h6 class="client-search-title">
                  {{ $t('collaboratorBookingsView.searchClient') }}
                </h6>
              </div>
              <div class="client-search-input-group">
                <input
                  min="1"
                  max="50"
                  type="text"
                  class="client-search-input"
                  v-model="state.searchText"
                  v-bind:class="{ 'is-invalid': state.searchTextError }"
                  :placeholder="$t('dashboard.search2')"
                />
                <button class="client-search-btn" @click="searchClient()" title="Pesquisar">
                  <i class="bi bi-search"></i>
                </button>
                <button class="client-clear-btn" @click="clearClient()" title="Limpar">
                  <i class="bi bi-eraser-fill"></i>
                </button>
              </div>
              <Spinner :show="loadingSearch"> </Spinner>
              <div class="client-search-errors" v-if="state.errorsSearch.length > 0">
                <Warning>
                  <template v-slot:message>
                    <li v-for="(error, index) in state.errorsSearch" :key="index">
                      {{ $t(error) }}
                    </li>
                  </template>
                </Warning>
              </div>
              <div v-if="state.client && state.client.id" class="client-details-wrapper">
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
              <div v-if="!state.client" class="client-empty-state">
                <Message
                  :icon="'bi-search'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
            <div class="client-actions">
              <button
                class="client-action-btn client-action-btn-icon"
                @click="copyLink()"
                title="Copiar link"
              >
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
              <button class="client-action-btn" @click="goToCreateBooking()">
                <i class="bi bi-box-arrow-up-right"></i>
                {{ $t('collaboratorBookingsView.create') }}
              </button>
              <button
                class="client-action-btn"
                @click="showMyBookings()"
                :disabled="!state.searchText"
              >
                <i class="bi bi-calendar-check-fill"></i>
                {{ $t('collaboratorBookingsView.myBookings') }}
                <i
                  :class="`bi ${
                    state.extendedBookingsEntity ? 'bi-chevron-up' : 'bi-chevron-down'
                  }`"
                ></i>
              </button>
            </div>
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
                    :grouped-queues="state.groupedQueues"
                    :drawer-mode="true"
                    :disable-click="booking.status === 'CANCELLED' || booking.processed === true"
                    @getAvailableDatesByCalendarMonth="getAvailableDatesByCalendarMonth"
                    @open-drawer="openBookingDrawer"
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
    <div v-if="hasActiveState" class="modal-footer modal-footer-fixed">
      <div class="w-100 d-flex justify-content-center">
        <button
          class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
          data-bs-dismiss="modal"
          aria-label="Close"
          @click="close"
        >
          {{ $t('close') }}
          <i class="bi bi-check-lg"></i>
        </button>
      </div>
    </div>

    <!-- Booking Details Drawer - Outside modal for proper z-index -->
    <Teleport to="body">
      <div v-if="state.drawerOpen" class="booking-drawer-overlay" @click="closeBookingDrawer">
        <div class="booking-drawer" @click.stop>
          <div class="booking-drawer-header">
            <h5 class="booking-drawer-title">
              <i class="bi bi-calendar-check-fill"></i>
              Detalhes da Reserva
            </h5>
            <button class="booking-drawer-close" @click="closeBookingDrawer">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="booking-drawer-body">
            <BookingDetailsCard
              v-if="state.selectedBooking"
              :booking="state.selectedBooking"
              :show="true"
              :details-opened="true"
              :toggles="toggles"
              :commerce="commerce"
              :queues="queues"
              :disabled-dates="disabledDates"
              :calendar-attributes="calendarAttributes"
              :grouped-queues="state.groupedQueues"
              :selected-queue="state.selectedQueue"
              :selected-date="state.selectedDate"
              @getAvailableDatesByCalendarMonth="getAvailableDatesByCalendarMonth"
            >
            </BookingDetailsCard>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Attention Creation Modal -->
    <AttentionCreationModal
      :show="state.showAttentionDrawer"
      :commerce="commerce"
      :queues="queues"
      :grouped-queues="state.groupedQueues"
      :collaborators="[]"
      :preselected-queue="state.selectedQueue"
      :preselected-date="state.selectedDate"
      :preselected-block="state.selectedBlockForDrawer"
      :toggles="toggles"
      @close="closeAttentionDrawer"
      @attention-created="handleAttentionCreated"
    />
  </div>
</template>

<style scoped>
.metric-card {
  background-color: #ffffff;
  padding: 0.35rem 0.4rem;
  margin: 0.25rem 0;
  margin-bottom: 0.35rem;
  border-radius: 0.4rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  overflow: hidden;
}

.metric-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: rgba(0, 194, 203, 0.2);
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
.management-area-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.1s ease;
  flex-shrink: 0;
  flex-grow: 0;
}

.modal-body-full-height {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
  max-height: calc(100vh - 120px);
  height: calc(100vh - 120px);
  padding: 0;
  overflow: visible;
}

.modal-body-full-height .row {
  flex: 1;
  min-height: 0;
  margin: 0;
  overflow: hidden;
}

.modal-body-full-height .row.resizable-container {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  overflow: hidden;
}

.modal-footer-fixed {
  flex-shrink: 0;
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.95);
  margin-top: auto;
}

.calendar-section {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  transition: width 0.1s ease;
  flex-shrink: 0;
  flex-grow: 0;
  height: 100%;
  max-height: 100%;
  min-height: 0;
}

.resizer-bar {
  width: 1px;
  background: rgba(0, 0, 0, 0.1);
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  flex-grow: 0;
  transition: background 0.2s ease, width 0.2s ease;
  z-index: 10;
  user-select: none;
}

.resizer-bar:hover {
  background: rgba(0, 194, 203, 0.4);
  width: 2px;
}

.resizer-bar.resizing {
  background: var(--azul-turno);
  width: 2px;
}

.resizer-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1px;
  height: 30px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 1px;
  pointer-events: none;
}

.resizer-bar:hover .resizer-handle,
.resizer-bar.resizing .resizer-handle {
  background: var(--azul-turno);
  width: 2px;
}

.blocks-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 0;
  font-size: 0.875rem;
  margin-bottom: 0;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.agenda-content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}
.queue-select {
  cursor: pointer;
}
.subtitle-info {
  font-size: 0.9rem;
  line-height: 1rem;
}
.hour-title {
  font-size: 0.7rem;
  padding: 0.3rem 0.6rem;
}

/* Modernized Hour Badge */
.lefted.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 0.35rem;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  margin-bottom: 0.35rem;
}

.lefted.badge.bg-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%) !important;
  color: #ffffff;
}

.lefted.badge.bg-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: #ffffff;
}

.lefted.badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
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
  z-index: 1020;
  background-color: var(--color-background);
}

/* Modernized Hours Section - Compact */
.hours-section {
  padding: 0.35rem;
}

.hours-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.hours-header i {
  font-size: 0.95rem;
  color: var(--azul-turno);
}

.hours-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.selected-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.selected-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.selected-info-label {
  font-size: 0.65rem;
  font-weight: 500;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.selected-info-badge {
  padding: 0.3rem 0.5rem;
  border-radius: 0.4rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.selected-queue-badge {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
}

.queue-badge-clickable {
  transition: all 0.2s ease;
}

.queue-badge-clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.3);
}

.queue-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
}

.queue-selector-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #333;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.queue-selector-item:last-child {
  border-bottom: none;
}

.queue-selector-item:hover {
  background: rgba(0, 194, 203, 0.1);
  color: var(--azul-turno);
}

.queue-selector-item-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
}

.queue-selector-item-active:hover {
  background: linear-gradient(135deg, #00b8c4 0%, var(--azul-turno) 100%);
  color: #ffffff;
}

.queue-selector-item i {
  font-size: 0.8rem;
}

.selected-date-badge {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: #ffffff;
}

.date-badge-clickable {
  transition: all 0.2s ease;
}

.date-badge-clickable:hover:not(.date-badge-disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.date-badge-disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
}

.date-selector-dropdown {
  position: fixed;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  padding: 0.75rem;
  min-width: 300px;
  max-width: 90vw;
  overflow-y: auto;
}

.date-selector-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.date-selector-header i {
  color: #6366f1;
  font-size: 1rem;
}

.date-selector-calendar {
  display: flex;
  justify-content: center;
}

.hours-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
  margin: 0.5rem 0;
}

.hours-tabs {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.hours-tab-btn {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #495057;
  background: #f8f9fa;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hours-tab-btn:hover:not(:disabled) {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  color: var(--azul-turno);
  transform: translateY(-1px);
}

.hours-tab-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hours-tab-btn-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  border-color: var(--azul-turno);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.25);
}

.hours-tab-btn i {
  font-size: 0.85rem;
}

.hours-actions {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.hours-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #495057;
  background: #ffffff;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hours-action-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hours-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hours-action-btn-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  border-color: var(--azul-turno);
}

.hours-action-btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #00b8c4 0%, var(--azul-turno) 100%);
  box-shadow: 0 4px 8px rgba(0, 194, 203, 0.3);
}

.hours-action-btn i {
  font-size: 0.8rem;
}

.hours-count-badge {
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.hours-count-text {
  display: inline-block;
  padding: 0.3rem 0.7rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6c757d;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* Queue Selector Section */
.queue-selector-section {
  flex: 0 0 auto;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.queue-selector-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.queue-selector-header i {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.queue-selector-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.queue-selector-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.queue-selector-btn {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #333;
  background: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.queue-selector-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  transform: translateY(-1px);
}

.queue-selector-btn-active {
  background: rgba(0, 194, 203, 0.12);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.queue-selector-btn i:first-child {
  font-size: 0.9rem;
}

.queue-selector-btn i:last-child {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Calendar Controls - Toggle All */
.calendar-controls {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.calendar-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--azul-turno);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.calendar-toggle-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  color: var(--azul-turno);
}

.calendar-toggle-btn:active {
  transform: translateY(0);
}

.calendar-toggle-btn i {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.calendar-toggle-btn span {
  font-size: 0.7rem;
  font-weight: 600;
}

/* Control Box - Calendar Container */
.control-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  padding: 0.15rem;
  margin-bottom: 0.1rem;
  background: #fff;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: visible;
  height: fit-content;
}

/* Ensure 2 calendars per row */
.row.g-1 {
  --bs-gutter-x: 0.1rem;
  --bs-gutter-y: 0.1rem;
}

.row.g-1 > .control-box {
  margin-left: 0;
  margin-right: 0;
  margin-bottom: 0.1rem;
}

.control-box > div {
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.control-box .vc-container {
  width: 100% !important;
  max-width: 100% !important;
  min-width: auto !important;
}

.control-box .vc-pane-container {
  width: 100% !important;
  max-width: 100% !important;
  min-width: auto !important;
}

.control-box .vc-pane-layout {
  width: 100% !important;
  min-width: auto !important;
}

/* Ensure row containers don't constrain calendar */
.row.centered .control-box {
  flex: 0 0 auto;
  max-width: none;
}

/* Compact Calendar Styling */
.control-box .vc-container {
  font-size: 0.75rem !important;
}

.control-box .vc-header {
  padding: 0.5rem 0 !important;
  margin-bottom: 0.25rem !important;
}

.control-box .vc-title {
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  padding: 0.25rem 0.5rem !important;
}

.control-box .vc-arrow {
  width: 1.5rem !important;
  height: 1.5rem !important;
  padding: 0.25rem !important;
}

.control-box .vc-arrow svg {
  width: 1rem !important;
  height: 1rem !important;
}

.control-box .vc-weekdays {
  padding: 0.25rem 0 !important;
  margin-bottom: 0.25rem !important;
}

.control-box .vc-weekday {
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  padding: 0.25rem 0 !important;
}

.control-box .vc-week {
  margin: 0 !important;
  padding: 0.125rem 0 !important;
}

.control-box .vc-day {
  min-height: 2rem !important;
  padding: 0.125rem !important;
}

.control-box .vc-day-content {
  font-size: 0.75rem !important;
  width: 1.75rem !important;
  height: 1.75rem !important;
  line-height: 1.75rem !important;
}

.control-box .vc-highlight {
  border-radius: 4px !important;
}

.control-box .vc-pane {
  padding: 0.5rem !important;
}

.control-box .vc-pane-layout {
  gap: 0 !important;
}

/* Compact Queue Name Styling */
/* Queue Select Header with Collapse Toggle */
.queue-select-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  cursor: pointer;
  margin-bottom: 0;
}

.queue-select-header .queue-select {
  flex: 1;
  margin-bottom: 0;
}

.collapse-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.collapse-toggle-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: var(--azul-turno);
}

.collapse-toggle-btn i {
  font-size: 0.75rem;
  color: #666;
  transition: transform 0.2s ease;
}

.collapse-toggle-btn.collapsed i {
  transform: rotate(-90deg);
}

.calendar-wrapper {
  transition: opacity 0.2s ease, max-height 0.3s ease;
  overflow: hidden;
}

.control-box .mt-2 {
  margin-top: 0.5rem !important;
}

.control-box .queue-select .active,
.control-box .queue-select .selected,
.control-box .queue-select .desactived {
  margin: 0 !important;
  padding: 0.4rem 0.65rem !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  line-height: 1.2rem !important;
  border-radius: 0.5rem !important;
  border: none !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative;
  overflow: hidden;
}

.control-box .queue-select .active::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.control-box .queue-select .active:hover::before {
  left: 100%;
}

.control-box .queue-select .active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%) !important;
  color: #ffffff !important;
}

.control-box .queue-select .active:hover {
  box-shadow: 0 4px 12px rgba(0, 194, 203, 0.3), 0 2px 6px rgba(0, 194, 203, 0.2) !important;
  transform: translateY(-2px) scale(1.02);
}

.control-box .queue-select .selected {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
  color: #ffffff !important;
}

.control-box .queue-select .selected:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3), 0 2px 6px rgba(99, 102, 241, 0.2) !important;
  transform: translateY(-2px) scale(1.02);
}

.control-box .queue-select .desactived {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  color: #495057 !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.control-box .queue-select .desactived:hover {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px);
  border-color: rgba(0, 0, 0, 0.12) !important;
}

.control-box .queue-select .active span,
.control-box .queue-select .selected span,
.control-box .queue-select .desactived span {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.015em;
  position: relative;
  z-index: 1;
}

.control-box .queue-select .active i,
.control-box .queue-select .selected i {
  font-size: 0.8rem !important;
  opacity: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
}

.control-box .queue-select .desactived i {
  font-size: 0.75rem !important;
  opacity: 0.7;
  color: #6c757d;
}

/* Management Area Header - Tab Buttons */
.management-header {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.management-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #333;
  background: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.management-tab-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  transform: translateY(-1px);
}

.management-tab-btn-active {
  background: rgba(0, 194, 203, 0.12);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.management-tab-btn i {
  font-size: 0.875rem;
}

/* Client Search Section */
.client-search-section {
  margin-bottom: 1rem;
}

.client-search-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.client-search-header i {
  font-size: 1rem;
  color: var(--azul-turno);
}

.client-search-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #333;
}

.client-search-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.client-search-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.client-search-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
}

.client-search-btn,
.client-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
  background: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.client-search-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.client-clear-btn:hover {
  background: rgba(220, 53, 69, 0.08);
  border-color: #dc3545;
  color: #dc3545;
}

.client-search-errors {
  margin-bottom: 0.75rem;
}

.client-details-wrapper {
  margin: 0.75rem 0;
}

.client-empty-state {
  margin: 0.75rem 0;
}

/* Client Actions */
.client-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.client-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #333;
  background: #fff;
  border: 1.5px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.client-action-btn:hover:not(:disabled) {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  transform: translateY(-1px);
}

.client-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.client-action-btn-icon {
  width: 2.25rem;
  padding: 0.4rem;
}

.client-action-btn i {
  font-size: 0.875rem;
}

/* Booking Drawer - Standardized with Client Details Style */
.booking-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.booking-drawer {
  width: 100%;
  max-width: 650px;
  height: 100%;
  background: #f8f9fa;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.booking-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  background: rgba(255, 255, 255, 0.98);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.booking-drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

.booking-drawer-title i {
  color: #00c2cb;
  font-size: 1.125rem;
}

.booking-drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.5);
}

.booking-drawer-close:hover {
  background: rgba(169, 169, 169, 0.1);
  border-color: rgba(169, 169, 169, 0.3);
  color: rgba(0, 0, 0, 0.7);
}

.booking-drawer-close i {
  font-size: 1rem;
}

.booking-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  background: #f8f9fa;
}

.booking-drawer-body::-webkit-scrollbar {
  width: 8px;
}

.booking-drawer-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.booking-drawer-body::-webkit-scrollbar-thumb {
  background: rgba(169, 169, 169, 0.3);
  border-radius: 4px;
}

.booking-drawer-body::-webkit-scrollbar-thumb:hover {
  background: rgba(169, 169, 169, 0.5);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .booking-drawer {
    max-width: 100%;
  }

  .booking-drawer-body {
    padding: 0.75rem;
  }
}
</style>
