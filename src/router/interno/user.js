import UserQueueAttention from '../../views/UserQueueAttention.vue';

const PrivateUserRoutes = [
  {
    path: '/interno/fila/:queueId/atencion/:id/',
    name: 'commerce-queue-attention',
    component: UserQueueAttention
  }
]

export default PrivateUserRoutes;