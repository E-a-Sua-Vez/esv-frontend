const CollaboratorAttentionValidate = () =>
  import('@/views/collaborator/CollaboratorAttentionValidate.vue');
const CollaboratorAttentionCheckIn = () =>
  import('@/views/collaborator/CollaboratorAttentionCheckIn.vue');
const CollaboratorAttentionCheckout = () =>
  import('@/views/collaborator/CollaboratorAttentionCheckout.vue');
const CollaboratorAttentionTerminated = () =>
  import('@/views/collaborator/CollaboratorAttentionTerminated.vue');
const CollaboratorQueuesView = () => import('@/views/collaborator/CollaboratorQueuesView.vue');
const CollaboratorQueueAttentions = () =>
  import('@/views/collaborator/CollaboratorQueueAttentions.vue');
const CollaboratorMenu = () => import('@/views/collaborator/CollaboratorMenu.vue');
const CollaboratorDashboard = () => import('@/views/collaborator/CollaboratorDashboard.vue');
const CollaboratorQueueBookings = () =>
  import('@/views/collaborator/CollaboratorQueueBookings.vue');
const CollaboratorTracing = () => import('@/views/collaborator/CollaboratorTracing.vue');
const CollaboratorProductStockAdmin = () =>
  import('@/views/collaborator/CollaboratorProductStockAdmin.vue');
const CommerceQueuesView = () => import('@/views/CommerceQueuesView.vue');
const UserQueueAttention = () => import('@/views/UserQueueAttention.vue');
const UserQueueBooking = () => import('@/views/UserQueueBooking.vue');
const UserQueueWaitlist = () => import('@/views/UserQueueWaitlist.vue');

const PrivateCollaboratorRoutes = [
  {
    path: '/interno/colaborador/menu',
    name: 'collaborator-menu',
    component: CollaboratorMenu,
  },
  {
    path: '/interno/colaborador/atencion/:id/validar',
    name: 'collaborator-attention-validate',
    component: CollaboratorAttentionValidate,
  },
  {
    path: '/interno/colaborador/atencion/:id/check-in',
    name: 'collaborator-attention-check-in',
    component: CollaboratorAttentionCheckIn,
  },
  {
    path: '/interno/colaborador/atencion/:id/atender',
    name: 'collaborator-attention-attend',
    component: CollaboratorAttentionValidate,
  },
  {
    path: '/interno/colaborador/atencion/:id/checkout',
    name: 'collaborator-attention-checkout',
    component: CollaboratorAttentionCheckout,
  },
  {
    path: '/interno/colaborador/atencion/:id/terminated',
    name: 'collaborator-attention-terminated',
    component: CollaboratorAttentionTerminated,
  },
  {
    path: '/interno/commerce/:id/colaborador/filas',
    name: 'collaborator-queues',
    component: CollaboratorQueuesView,
  },
  {
    path: '/interno/colaborador/fila/:id/atenciones',
    name: 'collaborator-queue-attentions',
    component: CollaboratorQueueAttentions,
  },
  {
    path: '/interno/colaborador/dashboard',
    name: 'collaborator-dashboard',
    component: CollaboratorDashboard,
  },
  {
    path: '/interno/colaborador/tracing',
    name: 'collaborator-tracing',
    component: CollaboratorTracing,
  },
  {
    path: '/interno/colaborador/product-stock',
    name: 'collaborator-product-stock',
    component: CollaboratorProductStockAdmin,
  },
  {
    path: '/interno/commerce/:id/colaborador/bookings',
    name: 'collaborator-bookings',
    component: CollaboratorQueueBookings,
  },
  {
    path: '/interno/commerce/:keyName/filas',
    name: 'commerce-collaborator-queues',
    component: CommerceQueuesView,
  },
  {
    path: '/interno/colaborador/fila/:queueId/atencion/:id/',
    name: 'collaborator-queue-attention',
    component: UserQueueAttention,
  },
  {
    path: '/interno/colaborador/booking/:id/',
    name: 'collaborator-queue-booking',
    component: UserQueueBooking,
  },
  {
    path: '/interno/colaborador/waitlist/:id/:block',
    name: 'collaborator-queue-waitlist',
    component: UserQueueWaitlist,
  },
];

export default PrivateCollaboratorRoutes;
