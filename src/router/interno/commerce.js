const BusinessDashboard = () => import('../../views/business/BusinessDashboard.vue');
const BusinessMenu = () => import('../../views/business/BusinessMenu.vue');
const BusinessSectionAtWorkView = () => import('../../views/business/BusinessSectionAtWorkView.vue');
const BusinessQueuesAdmin = () => import('../../views/business/BusinessQueuesAdmin.vue');
const BusinessModulesAdmin = () => import('../../views/business/BusinessModulesAdmin.vue');
const BusinessCollaboratorsAdmin = () => import('../../views/business/BusinessCollaboratorAdmin.vue');
const BusinessCommerceAdmin = () => import('../../views/business/BusinessCommerceAdmin.vue');
const BusinessReports = () => import('../../views/business/BusinessReports.vue');
const BusinessExecutiveReport = () => import('../../views/business/BusinessExecutiveReport.vue');
const BusinessConfiguration = () => import('../../views/business/BusinessConfiguration.vue');
const BusinessPlan = () => import('../../views/business/BusinessPlan.vue');
const BusinessSurveysAdmin = () => import('../../views/business/BusinessSurveyAdmin.vue');
const BusinessServicesAdmin = () => import('../../views/business/BusinessServicesAdmin.vue');
const BusinessProductsAdmin = () => import('../../views/business/BusinessProductsAdmin.vue');
const BusinessTracing = () => import('../../views/business/BusinessTracing.vue');
const BusinessPermissionsAdmin = () => import('../../views/business/BusinessPermissionsAdmin.vue');
const CommerceQueuesView = () => import('../../views/CommerceQueuesView.vue');
const BusinessProductStockAdmin = () => import('../../views/business/BusinessProductStockAdmin.vue');

const PrivateCommerceRoutes = [
  {
    path: '/interno/negocio/menu',
    name: 'business-menu',
    component: BusinessMenu
  },
  {
    path: '/interno/negocio/dashboard',
    name: 'business-dashboard',
    component: BusinessDashboard
  },
  {
    path: '/interno/negocio/tracing',
    name: 'business-tracing',
    component: BusinessTracing
  },
  {
    path: '/interno/negocio/product-stock',
    name: 'business-product-stock',
    component: BusinessProductStockAdmin
  },
  {
    path: '/interno/negocio/commerce-admin',
    name: 'business-commerce-admin',
    component: BusinessCommerceAdmin
  },
  {
    path: '/interno/negocio/service-admin',
    name: 'business-service-admin',
    component: BusinessServicesAdmin
  },
  {
    path: '/interno/negocio/product-admin',
    name: 'business-product-admin',
    component: BusinessProductsAdmin
  },
  {
    path: '/interno/negocio/queues-admin',
    name: 'business-queues-admin',
    component: BusinessQueuesAdmin
  },
  {
    path: '/interno/negocio/configuration',
    name: 'business-configuration',
    component: BusinessConfiguration
  },
  {
    path: '/interno/negocio/reports',
    name: 'business-reports',
    component: BusinessReports
  },
  {
    path: '/interno/negocio/your-plan',
    name: 'business-your-plan',
    component: BusinessPlan
  },
  {
    path: '/interno/negocio/collaborators-admin',
    name: 'business-collaborators-admin',
    component: BusinessCollaboratorsAdmin
  },
  {
    path: '/interno/negocio/modules-admin',
    name: 'business-modules-admin',
    component: BusinessModulesAdmin
  },
  {
    path: '/interno/negocio/business-resume',
    name: 'business-resume',
    component: BusinessExecutiveReport
  },
  {
    path: '/interno/negocio/surveys-admin',
    name: 'surveys-admin',
    component: BusinessSurveysAdmin
  },
  {
    path: '/interno/negocio/permissions-admin',
    name: 'permissions-admin',
    component: BusinessPermissionsAdmin
  },
  {
    path: '/interno/negocio/commerce/:keyName/filas',
    name: 'commerce-business-queues',
    component: CommerceQueuesView
  }
]

export default PrivateCommerceRoutes;