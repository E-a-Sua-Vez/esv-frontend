const UserQueueAttention = () => import('../../views/UserQueueAttention.vue');
const UserQueueBooking = () => import('../../views/UserQueueBooking.vue');
const UserQueueWaitlist = () => import('../../views/UserQueueWaitlist.vue');
const UserFormAttention = () => import('../../views/UserFormAttention.vue');

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
  },
  {
    path: '/interno/form/:formId/client/:clientId/booking/:bookingId',
    name: 'commerce-form-attention',
    component: UserFormAttention
  },
  {
    path: '/interno/form/:formId/client/:clientId/attention/:attentionId',
    name: 'commerce-form-attention',
    component: UserFormAttention
  },
]

export default PrivateUserRoutes;