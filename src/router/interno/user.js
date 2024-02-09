import UserQueueAttention from '../../views/UserQueueAttention.vue';
import UserQueueBooking from '../../views/UserQueueBooking.vue';
import UserQueueWaitlist from '../../views/UserQueueWaitlist.vue';

const PrivateUserRoutes = [
  {
    path: '/interno/fila/:queueId/atencion/:id/',
    name: 'commerce-queue-attention',
    component: UserQueueAttention
  },
  {
    path: '/interno/booking/:id/',
    name: 'commerce-queue-booking',
    component: UserQueueBooking
  },
  {
    path: '/interno/waitlist/:id/:block',
    name: 'commerce-queue-waitlist',
    component: UserQueueWaitlist
  }
]

export default PrivateUserRoutes;