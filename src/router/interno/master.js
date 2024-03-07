import MasterMenu from '../../views/master/MasterMenu.vue';
import BusinessSectionAtWorkView from '../../views/business/BusinessSectionAtWorkView.vue';
import BusinessQueuesAdmin from '../../views/business/BusinessQueuesAdmin.vue';
import BusinessModulesAdmin from '../../views/business/BusinessModulesAdmin.vue';
import BusinessAdministratorsAdmin from '../../views/business/BusinessAdministratorAdmin.vue';
import BusinessCollaboratorsAdmin from '../../views/business/BusinessCollaboratorAdmin.vue';
import BusinessCommerceAdmin from '../../views/business/BusinessCommerceAdmin.vue';
import BusinessReports from '../../views/business/BusinessReports.vue';
import BusinessDashboard from '../../views/business/BusinessDashboard.vue';
import BusinessExecutiveReport from '../../views/business/BusinessExecutiveReport.vue';
import BusinessAdmin from '../../views/business/BusinessAdmin.vue';
import BusinessConfiguration from '../../views/business/BusinessConfiguration.vue';
import MasterPermissionsAdmin from '../../views/business/MasterPermissionsAdmin.vue';
import BusinessPlansAdmin from '../../views/business/BusinessPlansAdmin.vue';
import BusinessPlan from '../../views/business/BusinessPlan.vue';
import BusinessPlanActivationAdmin from '../../views/business/BusinessPlanActivationAdmin.vue';
import BusinessSurveysAdmin from '../../views/business/BusinessSurveyAdmin.vue';
import BusinessServicesAdmin from '../../views/business/BusinessServicesAdmin.vue';
import BusinessTracing from '../../views/business/BusinessTracing.vue';

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
]

export default PrivateMasterRoutes;