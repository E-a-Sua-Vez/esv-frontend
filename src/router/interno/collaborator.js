
import CollaboratorAttentionValidate from '../../views/collaborator/CollaboratorAttentionValidate.vue';
import CollaboratorQueuesView from '../../views/collaborator/CollaboratorQueuesView.vue';
import CollaboratorQueueAttentions from '../../views/collaborator/CollaboratorQueueAttentions.vue';

const PrivateCollaboratorRoutes = [
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
  }
]

export default PrivateCollaboratorRoutes;