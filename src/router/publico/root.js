const HomeView = () => import('../../views/HomeView.vue');

const RootRoutes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  }
]

export default RootRoutes;