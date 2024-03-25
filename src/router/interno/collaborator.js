const CollaboratorAttentionValidate = () => import('../../views/collaborator/CollaboratorAttentionValidate.vue');
const CollaboratorQueuesView = () => import('../../views/collaborator/CollaboratorQueuesView.vue');
const CollaboratorQueueAttentions = () => import('../../views/collaborator/CollaboratorQueueAttentions.vue');
const CollaboratorMenu = () => import('../../views/collaborator/CollaboratorMenu.vue');
const CollaboratorDashboard = () => import('../../views/collaborator/CollaboratorDashboard.vue');
const CollaboratorQueueBookings = () => import('../../views/collaborator/CollaboratorQueueBookings.vue');
const CollaboratorTracing = () => import('../../views/collaborator/CollaboratorTracing.vue');
const CommerceQueuesView = () => import('../../views/CommerceQueuesView.vue');

const PrivateCollaboratorRoutes = [
  {
    path: '/interno/colaborador/menu',
    name: 'collaborator-menu',
    component: CollaboratorMenu
  },
  {
    path: '/interno/colaborador/atencion/:id/validar',
    name: 'collaborator-attention-validate',
    component: CollaboratorAttentionValidate
  },
  {
    path: '/interno/commerce/:id/colaborador/filas',
    name: 'collaborator-queues',
    component: CollaboratorQueuesView
  },
  {
    path: '/interno/colaborador/fila/:id/atenciones',
    name: 'collaborator-queue-attentions',
    component: CollaboratorQueueAttentions
  },
  {
    path: '/interno/colaborador/dashboard',
    name: 'collaborator-dashboard',
    component: CollaboratorDashboard
  },
  {
    path: '/interno/colaborador/tracing',
    name: 'collaborator-tracing',
    component: CollaboratorTracing
  },
  {
    path: '/interno/commerce/:id/colaborador/bookings',
    name: 'collaborator-bookings',
    component: CollaboratorQueueBookings
  },
  {
    path: '/interno/commerce/:keyName/filas',
    name: 'commerce-collaborator-queues',
    component: CommerceQueuesView
  }
]

export default PrivateCollaboratorRoutes;