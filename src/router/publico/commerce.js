const CommerceQueuesView = () => import('@/views/CommerceQueuesView.vue');
const CommerceQRSetup = () => import('@/views/CommerceQRSetup.vue');
const BusinessQRSetup = () => import('@/views/business/BusinessQRSetup.vue');

const PublicCommerceRoutes = [
  {
    path: '/interno/comercio/:id',
    name: 'commerce-qr-setup',
    component: CommerceQRSetup,
  },
  {
    path: '/interno/negocio/:id',
    name: 'business-qr-setup',
    component: BusinessQRSetup,
  },
  {
    path: '/publico/comercio/:keyName/filas',
    name: 'commerce-queues',
    component: CommerceQueuesView,
  },
  {
    path: '/publico/comercio/:keyName/filas/user/:name/:lastName/:idNumber/:phone/:email/:birthday/:addressCode/:addressText/:addressComplement',
    name: 'commerce-queues-user',
    component: CommerceQueuesView,
  },
  {
    path: '/publico/comercio/:keyName/filas/:queueId/',
    name: 'commerce-queues-directed',
    component: CommerceQueuesView,
  },
  {
    path: '/publico/comercio/:keyName/filas/:queueId/user/:name/:lastName/:idNumber/:phone/:email/:birthday/:addressCode/:addressText/:addressComplement',
    name: 'commerce-queues-user',
    component: CommerceQueuesView,
  },
];

export default PublicCommerceRoutes;
