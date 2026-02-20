const BusinessDashboard = () => import('@/views/business/BusinessDashboard.vue');
const BusinessMenu = () => import('@/views/business/BusinessMenu.vue');
const BusinessSectionAtWorkView = () => import('@/views/business/BusinessSectionAtWorkView.vue');
const BusinessQueuesAdmin = () => import('@/views/business/BusinessQueuesAdmin.vue');
const BusinessModulesAdmin = () => import('@/views/business/BusinessModulesAdmin.vue');
const BusinessCollaboratorsAdmin = () => import('@/views/business/BusinessCollaboratorAdmin.vue');
const BusinessCommerceAdmin = () => import('@/views/business/BusinessCommerceAdmin.vue');
const BusinessReports = () => import('@/views/business/BusinessReports.vue');
const BusinessExecutiveReport = () => import('@/views/business/BusinessExecutiveReport.vue');
const BusinessConfiguration = () => import('@/views/business/BusinessConfiguration.vue');
const BusinessPlan = () => import('@/views/business/BusinessPlan.vue');
const BusinessSurveysAdmin = () => import('@/views/business/BusinessSurveyAdmin.vue');
const BusinessServicesAdmin = () => import('@/views/business/BusinessServicesAdmin.vue');
const BusinessProductsAdmin = () => import('@/views/business/BusinessProductsAdmin.vue');
const BusinessTracing = () => import('@/views/business/BusinessTracing.vue');
const BusinessPermissionsAdmin = () => import('@/views/business/BusinessPermissionsAdmin.vue');
const CommerceQueuesView = () => import('@/views/CommerceQueuesView.vue');
const BusinessProductStockAdmin = () => import('@/views/business/BusinessProductStockAdmin.vue');
const BusinessDocuments = () => import('@/views/business/BusinessDocuments.vue');
const BusinessOutcomeTypesAdmin = () => import('@/views/business/BusinessOutcomeTypesAdmin.vue');
const BusinessFinancial = () => import('@/views/business/BusinessFinancial.vue');
const BusinessQueueBookings = () => import('@/views/business/BusinessQueueBookings.vue');
const BusinessCompaniesAdmin = () => import('@/views/business/BusinessCompaniesAdmin.vue');
const BusinessPatientHistoryItemAdmin = () =>
  import('@/views/business/BusinessPatientHistoryItemAdmin.vue');
const BusinessFormAdmin = () => import('@/views/business/BusinessFormAdmin.vue');
const BusinessLgpdConsentAdmin = () => import('@/views/business/BusinessLgpdConsentAdmin.vue');
const BusinessProfessionalsAdmin = () => import('@/views/business/BusinessProfessionalsAdmin.vue');
const BusinessLeadPipeline = () => import('@/views/business/BusinessLeadPipeline.vue');
const BusinessInfo = () => import('@/views/business/BusinessInfo.vue');

const PrivateCommerceRoutes = [
  {
    path: '/interno/negocio/menu',
    name: 'business-menu',
    component: BusinessMenu,
  },
  {
    path: '/interno/negocio/dashboard',
    name: 'business-dashboard',
    component: BusinessDashboard,
  },
  {
    path: '/interno/negocio/tracing',
    name: 'business-tracing',
    component: BusinessTracing,
  },
  {
    path: '/interno/negocio/lead-pipeline',
    name: 'business-lead-pipeline',
    component: BusinessLeadPipeline,
  },
  {
    path: '/interno/negocio/financial',
    name: 'business-financial',
    component: BusinessFinancial,
  },
  {
    path: '/interno/negocio/product-stock',
    name: 'business-product-stock',
    component: BusinessProductStockAdmin,
  },
  {
    path: '/interno/negocio/commerce-admin',
    name: 'business-commerce-admin',
    component: BusinessCommerceAdmin,
  },
  {
    path: '/interno/negocio/service-admin',
    name: 'business-service-admin',
    component: BusinessServicesAdmin,
  },
  {
    path: '/interno/negocio/product-admin',
    name: 'business-product-admin',
    component: BusinessProductsAdmin,
  },
  {
    path: '/interno/negocio/queues-admin',
    name: 'business-queues-admin',
    component: BusinessQueuesAdmin,
  },
  {
    path: '/interno/negocio/configuration',
    name: 'business-configuration',
    component: BusinessConfiguration,
  },
  {
    path: '/interno/negocio/documents',
    name: 'business-documents',
    component: BusinessDocuments,
  },
  {
    path: '/interno/negocio/reports',
    name: 'business-reports',
    component: BusinessReports,
  },
  {
    path: '/interno/negocio/your-plan',
    name: 'business-your-plan',
    component: BusinessPlan,
  },
  {
    path: '/interno/negocio/collaborators-admin',
    name: 'business-collaborators-admin',
    component: BusinessCollaboratorsAdmin,
  },
  {
    path: '/interno/negocio/modules-admin',
    name: 'business-modules-admin',
    component: BusinessModulesAdmin,
  },
  {
    path: '/interno/negocio/outcome-types-admin',
    name: 'business-outcome-types-admin',
    component: BusinessOutcomeTypesAdmin,
  },
  {
    path: '/interno/negocio/business-resume',
    name: 'business-resume',
    component: BusinessExecutiveReport,
  },
  {
    path: '/interno/negocio/surveys-admin',
    name: 'surveys-admin',
    component: BusinessSurveysAdmin,
  },
  {
    path: '/interno/negocio/permissions-admin',
    name: 'permissions-admin',
    component: BusinessPermissionsAdmin,
  },
  {
    path: '/interno/negocio/business-info',
    name: 'business-info',
    component: BusinessInfo,
  },
  {
    path: '/interno/negocio/commerce/:keyName/filas',
    name: 'commerce-business-queues',
    component: CommerceQueuesView,
  },
  {
    path: '/interno/negocio/booking-manage',
    name: 'commerce-bookings',
    component: BusinessQueueBookings,
  },
  {
    path: '/interno/negocio/company-admin',
    name: 'business-company-admin',
    component: BusinessCompaniesAdmin,
  },
  {
    path: '/interno/negocio/patient-history-item-admin',
    name: 'business-patient-history-item-admin',
    component: BusinessPatientHistoryItemAdmin,
  },
  {
    path: '/interno/negocio/forms-admin',
    name: 'forms-admin',
    component: BusinessFormAdmin,
  },
  {
    path: '/interno/negocio/lgpd-consent-admin',
    name: 'lgpd-consent-admin',
    component: BusinessLgpdConsentAdmin,
  },
  {
    path: '/interno/negocio/professionals-admin',
    name: 'business-professionals-admin',
    component: BusinessProfessionalsAdmin,
  },
  {
    path: '/interno/negocio/medications-admin',
    name: 'business-medications-admin',
    component: () => import('../../views/business/BusinessMedicationsAdmin.vue'),
  },
  {
    path: '/interno/negocio/medical-exams-admin',
    name: 'business-medical-exams-admin',
    component: () => import('../../views/business/BusinessMedicalExamsAdmin.vue'),
  },
  {
    path: '/interno/negocio/medical-templates-admin',
    name: 'business-medical-templates-admin',
    component: () => import('../../views/business/BusinessMedicalTemplatesAdmin.vue'),
  },
  {
    path: '/interno/negocio/pdf-templates-admin',
    name: 'business-pdf-templates-admin',
    component: () => import('../../views/business/BusinessPdfTemplatesAdmin.vue'),
  },
  {
    path: '/interno/negocio/audit-log',
    name: 'business-audit-log',
    component: () => import('../../views/business/BusinessAuditLog.vue'),
  },
];

export default PrivateCommerceRoutes;
