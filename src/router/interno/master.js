const MasterMenu = () => import('../../views/master/MasterMenu.vue');
const BusinessDashboard = () => import('../../views/business/BusinessDashboard.vue');
const BusinessSectionAtWorkView = () => import('../../views/business/BusinessSectionAtWorkView.vue');
const BusinessQueuesAdmin = () => import('../../views/business/BusinessQueuesAdmin.vue');
const BusinessModulesAdmin = () => import('../../views/business/BusinessModulesAdmin.vue');
const BusinessAdministratorsAdmin = () => import('../../views/business/BusinessAdministratorAdmin.vue');
const BusinessCollaboratorsAdmin = () => import('../../views/business/BusinessCollaboratorAdmin.vue');
const BusinessCommerceAdmin = () => import('../../views/business/BusinessCommerceAdmin.vue');
const BusinessReports = () => import('../../views/business/BusinessReports.vue');
const BusinessExecutiveReport = () => import('../../views/business/BusinessExecutiveReport.vue');
const BusinessAdmin = () => import('../../views/business/BusinessAdmin.vue');
const BusinessConfiguration = () => import('../../views/business/BusinessConfiguration.vue');
const BusinessPlan = () => import('../../views/business/BusinessPlan.vue');
const MasterPermissionsAdmin = () => import('../../views/business/MasterPermissionsAdmin.vue');
const BusinessPlansAdmin = () => import('../../views/business/BusinessPlansAdmin.vue');
const BusinessPlanActivationAdmin = () => import('../../views/business/BusinessPlanActivationAdmin.vue');
const BusinessSurveysAdmin = () => import('../../views/business/BusinessSurveyAdmin.vue');
const BusinessServicesAdmin = () => import('../../views/business/BusinessServicesAdmin.vue');
const BusinessProductsAdmin = () => import('../../views/business/BusinessProductsAdmin.vue');
const BusinessTracing = () => import('../../views/business/BusinessTracing.vue');
const BusinessDocuments = () => import('../../views/business/BusinessDocuments.vue');
const BusinessOutcomeTypesAdmin = () => import('../../views/business/BusinessOutcomeTypesAdmin.vue');
const BusinessFinancial = () => import('../../views/business/BusinessFinancial.vue');
const BusinessCompaniesAdmin = () => import('../../views/business/BusinessCompaniesAdmin.vue');

const PrivateMasterRoutes = [
  {
    path: '/interno/master/menu',
    name: 'master-menu',
    component: MasterMenu
  },
  {
    path: '/interno/master/business-master-admin',
    name: 'business-master-admin',
    component: BusinessAdmin
  },
  {
    path: '/interno/master/business-master-resume',
    name: 'business-master-resume',
    component: BusinessExecutiveReport
  },
  {
    path: '/interno/master/dashboard',
    name: 'business-master-dashboard',
    component: BusinessDashboard
  },
  {
    path: '/interno/master/tracing',
    name: 'business-master-tracing',
    component: BusinessTracing
  },
  {
    path: '/interno/master/financial',
    name: 'business-master-financial',
    component: BusinessFinancial
  },
  {
    path: '/interno/master/commerce-master-admin',
    name: 'business-commerce-master-admin',
    component: BusinessCommerceAdmin
  },
  {
    path: '/interno/master/service-master-admin',
    name: 'business-service-master-admin',
    component: BusinessServicesAdmin
  },
  {
    path: '/interno/master/product-master-admin',
    name: 'business-product-master-admin',
    component: BusinessProductsAdmin
  },
  {
    path: '/interno/master/queues-master-admin',
    name: 'business-queues-master-admin',
    component: BusinessQueuesAdmin
  },
  {
    path: '/interno/master/configuration',
    name: 'business-master-configuration',
    component: BusinessConfiguration
  },
  {
    path: '/interno/master/documents',
    name: 'business-master-documents',
    component: BusinessDocuments
  },
  {
    path: '/interno/master/reports',
    name: 'business-master-reports',
    component: BusinessReports
  },
  {
    path: '/interno/master/your-plan',
    name: 'business-master-your-plan',
    component: BusinessPlan
  },
  {
    path: '/interno/master/administrators-master-admin',
    name: 'business-administrators-master-admin',
    component: BusinessAdministratorsAdmin
  },
  {
    path: '/interno/master/collaborators-master-admin',
    name: 'business-collaborators-master-admin',
    component: BusinessCollaboratorsAdmin
  },
  {
    path: '/interno/master/modules-master-admin',
    name: 'business-modules-master-admin',
    component: BusinessModulesAdmin
  },
  {
    path: '/interno/master/outcome-types-master-admin',
    name: 'business-outcome-types-master-admin',
    component: BusinessOutcomeTypesAdmin
  },
  {
    path: '/interno/master/plans-master-admin',
    name: 'plans-master-admin',
    component: BusinessPlansAdmin
  },
  {
    path: '/interno/master/features-master-admin',
    name: 'features-master-admin',
    component: MasterPermissionsAdmin
  },
  {
    path: '/interno/master/plan-activations-admin',
    name: 'plan-activations-admin',
    component: BusinessPlanActivationAdmin
  },
  {
    path: '/interno/master/surveys-master-admin',
    name: 'surveys-master-admin',
    component: BusinessSurveysAdmin
  },
  {
    path: '/interno/master/company-master-admin',
    name: 'company-master-admin',
    component: BusinessCompaniesAdmin
  }
]

export default PrivateMasterRoutes;