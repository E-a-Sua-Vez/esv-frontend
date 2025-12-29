const HomeView = () => import('@/views/HomeView.vue');
const DocumentVerification = () => import('@/views/public/DocumentVerification.vue');

const RootRoutes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/verify/:type/:id',
    name: 'document-verification',
    component: DocumentVerification,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
];

export default RootRoutes;
