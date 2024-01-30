import { createRouter, createWebHistory } from 'vue-router';
import { globalStore } from '../stores';
import { logout } from '../application/firebase';
import { signInInvited, signOut } from '../application/services/auth';
import NotFoundView from '../views/NotFoundView.vue';
import PrivateUserRoutes from './interno/user';
import PrivateCollaboratorRoutes from './interno/collaborator';
import PrivateCommerceRoutes from './interno/commerce';
import PublicBusinessRoutes from './publico/business';
import PublicCollaboratorRoutes from './publico/collaborator';
import PublicCommerceRoutes from './publico/commerce';
import RootRoutes from './publico/root';
import PublicMasterRoutes from './publico/master';
import PrivateMasterRoutes from './interno/master';

const privateChildren = [
  ...PrivateCollaboratorRoutes,
  ...PrivateUserRoutes,
  ...PrivateCommerceRoutes,
  ...PrivateMasterRoutes
];
const publicChildren = [
  ...PublicCollaboratorRoutes,
  ...PublicBusinessRoutes,
  ...PublicCommerceRoutes,
  ...PublicMasterRoutes
];

const rootChildren = [
  ...RootRoutes
]

const rootViews = RootRoutes.map(route => route.name);

const privateCollaboratorViews = PrivateCollaboratorRoutes.map(route => route.name);
const privateCommerceViews = PrivateCommerceRoutes.map(route => route.name);
const privateUserViews = PrivateUserRoutes.map(route => route.name);
const privateMasterViews = PrivateMasterRoutes.map(route => route.name);

const publicCollaboratorViews = PublicCollaboratorRoutes.map(route => route.name);
const publicBusinessViews = PublicBusinessRoutes.map(route => route.name);
const publicCommerceViews = PublicCommerceRoutes.map(route => route.name);
const publicMasterRoutes = PublicMasterRoutes.map(route => route.name);


/**
 * Define las rutas
 */
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  },
  routes: [
    ...rootChildren,
    ...privateChildren,
    ...publicChildren,
    {
      path: '/:pathMatch(.*)*',
      component: NotFoundView
    },
  ]
})

const getSessionIsNotAlive = (currentUser) => {
  const currentDate = new Date();
    let days = 1;
    if (currentUser.lastSignIn) {
      days = Math.abs(currentDate - new Date(currentUser.lastSignIn)) / (1000 * 60 * 60 * 24);
    }
  return days > 1 ;
}

const getInvitedSessionAlive = (sessionDate) => {
  let diff = (new Date().getTime() - new Date(sessionDate).getTime()) / 1000;
  diff /= (60 * 60);
  const hours = Math.abs(Math.round(diff));
  return hours >= 6;
 }

/**
 * Casos de uso
 */
router.beforeEach(async (to, from, next) => {
  const store = globalStore();
  const currentUser = await store.getCurrentUser;
  const currentUserType = await store.getCurrentUserType;
  const userNotExists = currentUser === undefined;

  /**
   * ROOT
   */
  if (rootViews.includes(to.name)) {
    if (!userNotExists && !getSessionIsNotAlive(currentUser)) {
      if (currentUserType === 'collaborator') {
        next({ name: 'collaborator-menu', replace: true, params: { id: currentUser.commerceId } });
        return;
      } else if (currentUserType === 'business') {
        next({ name: 'business-menu', replace: true });
        return;
      } else if (currentUserType === 'master') {
        next({ name: 'master-menu', replace: true });
        return;
      }
    }
  }

   /**
   * MASTER - Rutas Publicas
   */
   if (publicMasterRoutes.includes(to.name)) {
    if (userNotExists) {
      if (to.name === 'master-login') {
        await store.resetSession();
        await store.setCurrentUserType('master');
        next();
        return;
      }
    } else {
      if (currentUserType === 'master') {
        next();
        return;
      } else {
        await logout();
        await store.resetSession();
        store.setCurrentUserType('master');
        if (to.name !== 'master-login') {
          next({ name: 'master-login', replace: true });
        }
        next();
        return;
      }
    }
  }

  /**
   * COLABORADOR - Rutas Publicas
   */
  if (publicCollaboratorViews.includes(to.name)) {
    if (userNotExists) {
      if (to.name === 'collaborator-login') {
        await store.resetSession();
        await store.setCurrentUserType('collaborator');
        next();
        return;
      }
    } else {
      if (currentUserType === 'colaborator') {
        next();
        return;
      } else {
        await logout();
        await store.resetSession();
        store.setCurrentUserType('collaborator');
        if (to.name !== 'collaborator-login') {
          next({ name: 'collaborator-login', replace: true });
        }
        next();
        return;
      }
    }
  }

  /**
   * NEGOCIO - Rutas Publicas
   */
  if (publicBusinessViews.includes(to.name)) {
    if (userNotExists) {
      if (to.name === 'business-login') {
        await store.resetSession();
        await store.setCurrentUserType('business');
        next();
        return;
      }
    } else {
      if (currentUserType === 'business') {
        next();
        return;
      } else {
        await logout();
        await store.resetSession();
        store.setCurrentUserType('business');
        next({ name: 'business-login', replace: true });
        return;
      }
    }
  }

  /**
   * COMERCIO/USER - Rutas Publicas
   */
  if (publicCommerceViews.includes(to.name) || privateUserViews.includes(to.name)) {
    const environment = import.meta.env.VITE_NODE_ENV || 'local';
    const currentUserType = await store.getCurrentUserType;
    if (environment === 'prod' &&
      ((currentUserType !== 'invited') ||
      (currentUserType === 'invited' && userNotExists) ||
      (currentUserType === 'invited' && getInvitedSessionAlive(currentUser.time)))) {
        await signOut(undefined, currentUserType);
        await store.resetSession();
        store.setCurrentUserType('invited');
        const user = await signInInvited();
        store.setCurrentUser(user);
    }
    next();
    return;
  }

  /**
   * MASTER - Rutas Privadas
   */
  if (privateMasterViews.includes(to.name)) {
    if (userNotExists) {
      if (currentUserType === 'master') {
        await logout();
      }
      await store.resetSession();
      await store.setCurrentUserType('master');
      next({ name: 'master-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'master-login') {
          await logout();
          await store.resetSession();
          await store.setCurrentUserType('master');
          router.go({ name: 'master-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === 'master') {
          next();
          return;
        } else {
          await logout();
          await store.resetSession();
          store.setCurrentUserType('master');
          router.go({ name: 'master-login', replace: true });
          return;
        }
      }
    }
  }

  /**
   * COLABORADOR - Rutas Privadas
   */
  if (privateCollaboratorViews.includes(to.name)) {
    if (userNotExists) {
      if (currentUserType === 'collaborator') {
        await logout();
      }
      await store.resetSession();
      await store.setCurrentUserType('collaborator');
      next({ name: 'collaborator-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'collaborator-login') {
          await logout();
          await store.resetSession();
          await store.setCurrentUserType('collaborator');
          router.go({ name: 'collaborator-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === 'collaborator') {
          next();
          return;
        } else {
          await logout();
          await store.resetSession();
          store.setCurrentUserType('collaborator');
          router.go({ name: 'collaborator-login', replace: true });
          return;
        }
      }
    }
  }

  /**
   * NEGOCIO - Rutas Privadas
   */
  if (privateCommerceViews.includes(to.name)) {
    if (userNotExists) {
      if (currentUserType === 'business') {
        await logout();
      }
      await store.resetSession();
      await store.setCurrentUserType('business');
      next({ name: 'business-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'business-login') {
          await logout();
          await store.resetSession();
          await store.setCurrentUserType('business');
          router.go({ name: 'business-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === 'business') {
          next();
          return;
        } else {
          await logout();
          await store.resetSession();
          store.setCurrentUserType('business');
          router.go({ name: 'business-login', replace: true });
          return;
        }
      }
    }
  }

  next();
});

export default router
