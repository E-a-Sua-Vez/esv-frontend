const BusinessLogin = () => import('@/views/business/BusinessLogin.vue');

const PublicBusinessRoutes = [
  {
    path: '/publico/negocio/login',
    name: 'business-login',
    component: BusinessLogin,
  },
];

export default PublicBusinessRoutes;
