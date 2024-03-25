const MasterLogin = () => import('../../views/master/MasterLogin.vue');

const PublicMasterRoutes = [
  {
    path: '/publico/master/login',
    name: 'master-login',
    component: MasterLogin
  }
]

export default PublicMasterRoutes;