import CommerceQueuesView from '../../views/CommerceQueuesView.vue';
import CommerceQRSetup from '../../views/CommerceQRSetup.vue';
import BusinessQRSetup from '../../views/business/BusinessQRSetup.vue';

const PublicCommerceRoutes = [
  {
    path: '/interno/comercio/:id',
    name: 'commerce-qr-setup',
    component: CommerceQRSetup
  },
  {
    path: '/interno/negocio/:id',
    name: 'business-qr-setup',
    component: BusinessQRSetup
  },
  {
    path: '/publico/comercio/:keyName/filas',
    name: 'commerce-queues',
    component: CommerceQueuesView
  },
  {
    path: '/publico/comercio/:keyName/filas/:queueId/',
    name: 'commerce-queues-directed',
    component: CommerceQueuesView
  },
  {
    path: '/publico/comercio/:keyName/filas/user/:name/:lastName/:idNumber/:phone/:email',
    name: 'commerce-queues-user',
    component: CommerceQueuesView
  }
]

export default PublicCommerceRoutes;