const CollaboratorLogin = () => import('@/views/collaborator/CollaboratorLogin.vue');

const PublicColaboratorRoutes = [
  {
    path: '/publico/colaborador/login',
    name: 'collaborator-login',
    component: CollaboratorLogin,
  },
];

export default PublicColaboratorRoutes;
