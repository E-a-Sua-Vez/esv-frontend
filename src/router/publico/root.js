const HomeView = () => import('@/views/HomeView.vue');
const DocumentVerification = () => import('@/views/public/DocumentVerification.vue');
const ConsentFormView = () => import('@/views/public/ConsentFormView.vue');
const ClientPortalLogin = () => import('@/views/client-portal/ClientPortalLogin.vue');
const ClientPortalMenu = () => import('@/views/client-portal/ClientPortalMenu.vue');
const ClientConsentsView = () => import('@/views/client-portal/ClientConsentsView.vue');
const ClientTelemedicineView = () => import('@/views/client-portal/ClientTelemedicineView.vue');
const ClientProfileView = () => import('@/views/client-portal/ClientProfileView.vue');
const ClientDocumentsView = () => import('@/views/client-portal/ClientDocumentsView.vue');
const ClientHistoryView = () => import('@/views/client-portal/ClientHistoryView.vue');

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
  {
    path: '/consent/:token',
    name: 'consent-form',
    component: ConsentFormView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/login',
    name: 'client-portal-login',
    component: ClientPortalLogin,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal',
    name: 'client-portal-menu',
    component: ClientPortalMenu,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/consents',
    name: 'client-portal-consents',
    component: ClientConsentsView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/telemedicine',
    name: 'client-portal-telemedicine',
    component: ClientTelemedicineView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/profile',
    name: 'client-portal-profile',
    component: ClientProfileView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/documents',
    name: 'client-portal-documents',
    component: ClientDocumentsView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
  {
    path: '/portal/history',
    name: 'client-portal-history',
    component: ClientHistoryView,
    meta: {
      requiresAuth: false,
      isPublic: true,
    },
  },
];

export default RootRoutes;
