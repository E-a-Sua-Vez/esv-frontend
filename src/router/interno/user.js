import UserQueueAttention from '../../views/UserQueueAttention.vue';
import UserQueueBooking from '../../views/UserQueueBooking.vue';

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
  }
]

export default PrivateUserRoutes;