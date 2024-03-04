import BusinessDashboard from '../../views/business/BusinessDashboard.vue';
import BusinessMenu from '../../views/business/BusinessMenu.vue';
import BusinessSectionAtWorkView from '../../views/business/BusinessSectionAtWorkView.vue';
import BusinessQueuesAdmin from '../../views/business/BusinessQueuesAdmin.vue';
import BusinessModulesAdmin from '../../views/business/BusinessModulesAdmin.vue';
import BusinessCollaboratorsAdmin from '../../views/business/BusinessCollaboratorAdmin.vue';
import BusinessCommerceAdmin from '../../views/business/BusinessCommerceAdmin.vue';
import BusinessReports from '../../views/business/BusinessReports.vue';
import BusinessExecutiveReport from '../../views/business/BusinessExecutiveReport.vue';
import BusinessConfiguration from '../../views/business/BusinessConfiguration.vue';
import BusinessPlan from '../../views/business/BusinessPlan.vue';
import BusinessSurveysAdmin from '../../views/business/BusinessSurveyAdmin.vue';
import BusinessServicesAdmin from '../../views/business/BusinessServicesAdmin.vue';

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
  }
]

export default PrivateCommerceRoutes;