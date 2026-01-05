import { createRouter, createWebHistory } from 'vue-router';
import { globalStore } from '@/stores';
import { logout } from '@/application/firebase';
import { signInInvited, signOut } from '@/application/services/auth';
import { USER_TYPES } from '@/shared/constants';
import NotFoundView from '@/views/NotFoundView.vue';
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
  ...PrivateMasterRoutes,
];
const publicChildren = [
  ...PublicCollaboratorRoutes,
  ...PublicBusinessRoutes,
  ...PublicCommerceRoutes,
  ...PublicMasterRoutes,
];

const rootChildren = [...RootRoutes];

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
    // If there's a saved position (e.g., back button), use it
    if (savedPosition) {
      return savedPosition;
    }
    // Otherwise, scroll to top and ensure padding is updated
    return new Promise(resolve => {
      // Wait for next tick to ensure DOM is updated
      setTimeout(() => {
        // Update padding for fixed header
        const header = document.querySelector('.modern-nav');
        const mainContent = document.querySelector('.main-content-wrapper');
        if (header && mainContent) {
          const headerHeight = header.offsetHeight;
          mainContent.style.paddingTop = `${headerHeight + 10}px`;
        }
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        resolve({ top: 0, behavior: 'smooth' });
      }, 150);
    });
  },
  routes: [
    ...rootChildren,
    ...privateChildren,
    ...publicChildren,
    {
      path: '/:pathMatch(.*)*',
      component: NotFoundView,
    },
  ],
});

const getSessionIsNotAlive = currentUser => {
  if (!currentUser) {
    return true;
  }
  const currentDate = new Date();
  let days = 1;
  if (currentUser.lastSignIn) {
    days = Math.abs(currentDate - new Date(currentUser.lastSignIn)) / (1000 * 60 * 60 * 24);
  }
  return days > 1;
};

const getInvitedSessionAlive = sessionDate => {
  let diff = (new Date().getTime() - new Date(sessionDate).getTime()) / 1000;
  diff /= 60 * 60;
  const hours = Math.abs(Math.round(diff));
  return hours >= 6;
};

/**
 * Casos de uso
 */
router.beforeEach(async (to, from, next) => {
  const store = globalStore();
  const currentUser = store.getCurrentUser;
  const currentUserType = store.getCurrentUserType;
  const userNotExists = currentUser === undefined || currentUser === null;

  // Limpiar toda la sesión al llegar a la página root
  if (to.name === 'home') {
    localStorage.clear();
    await store.resetSession();
  }

  /**
   * ROOT
   */
  if (rootViews.includes(to.name)) {
    if (!userNotExists && !getSessionIsNotAlive(currentUser)) {
      if (currentUserType === USER_TYPES.COLLABORATOR) {
        next({ name: 'collaborator-menu', replace: true, params: { id: currentUser.commerceId } });
        return;
      } else if (currentUserType === USER_TYPES.BUSINESS) {
        next({ name: 'business-menu', replace: true });
        return;
      } else if (currentUserType === USER_TYPES.MASTER) {
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
        await localStorage.clear();
        await store.resetSession();
        await store.setCurrentUserType(USER_TYPES.MASTER);
        next();
        return;
      }
    } else {
      if (currentUserType === USER_TYPES.MASTER) {
        next();
        return;
      } else {
        await logout();
        await localStorage.clear();
        await store.resetSession();
        store.setCurrentUserType(USER_TYPES.MASTER);
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
        await localStorage.clear();
        await store.resetSession();
        await store.setCurrentUserType(USER_TYPES.COLLABORATOR);
        next();
        return;
      }
    } else {
      if (currentUserType === USER_TYPES.COLLABORATOR) {
        next();
        return;
      } else {
        await logout();
         await localStorage.clear();
        await store.resetSession();
        store.setCurrentUserType(USER_TYPES.COLLABORATOR);
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
        await localStorage.clear();
        await store.resetSession();
        await store.setCurrentUserType(USER_TYPES.BUSINESS);
        next();
        return;
      }
    } else {
      if (currentUserType === USER_TYPES.BUSINESS) {
        next();
        return;
      } else {
        await logout();
        await localStorage.clear();
        await store.resetSession();
        store.setCurrentUserType(USER_TYPES.BUSINESS);
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
    const currentUserType = store.getCurrentUserType;
    if (
      environment !== 'local' &&
      (currentUserType !== USER_TYPES.INVITED ||
        (currentUserType === USER_TYPES.INVITED && userNotExists) ||
        (currentUserType === USER_TYPES.INVITED && getInvitedSessionAlive(currentUser.time)))
    ) {
      await signOut(undefined, currentUserType);
      await localStorage.clear();
      await store.resetSession();
      store.setCurrentUserType(USER_TYPES.INVITED);
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
      if (currentUserType === USER_TYPES.MASTER) {
        await logout();
      }
      await localStorage.clear();
      await store.resetSession();
      await store.setCurrentUserType(USER_TYPES.MASTER);
      next({ name: 'master-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'master-login') {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          await store.setCurrentUserType(USER_TYPES.MASTER);
          router.go({ name: 'master-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === USER_TYPES.MASTER) {
          next();
          return;
        } else {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          store.setCurrentUserType(USER_TYPES.MASTER);
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
      if (currentUserType === USER_TYPES.COLLABORATOR) {
        await logout();
      }
      await localStorage.clear();
      await store.resetSession();
      await store.setCurrentUserType(USER_TYPES.COLLABORATOR);
      next({ name: 'collaborator-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'collaborator-login') {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          await store.setCurrentUserType(USER_TYPES.COLLABORATOR);
          router.go({ name: 'collaborator-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === USER_TYPES.COLLABORATOR) {
          next();
          return;
        } else {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          store.setCurrentUserType(USER_TYPES.COLLABORATOR);
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
      if (currentUserType === USER_TYPES.BUSINESS) {
        await logout();
      }
      await localStorage.clear();
      await store.resetSession();
      await store.setCurrentUserType(USER_TYPES.BUSINESS);
      next({ name: 'business-login', replace: true });
      return;
    } else {
      const sessionIsNotAlive = getSessionIsNotAlive(currentUser);
      if (sessionIsNotAlive) {
        if (to.name !== 'business-login') {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          await store.setCurrentUserType(USER_TYPES.BUSINESS);
          router.go({ name: 'business-login', replace: true });
          return;
        }
      } else {
        if (currentUserType === USER_TYPES.BUSINESS) {
          next();
          return;
        } else {
          await logout();
          await localStorage.clear();
          await store.resetSession();
          store.setCurrentUserType(USER_TYPES.BUSINESS);
          router.go({ name: 'business-login', replace: true });
          return;
        }
      }
    }
  }

  next();
});

// Update padding after each navigation to ensure content is not covered by fixed header
router.afterEach(() => {
  // Wait for DOM to update, then update padding multiple times to ensure it's applied
  const updatePadding = () => {
    const header = document.querySelector('.modern-nav');
    const mainContent = document.querySelector('.main-content-wrapper');
    if (header && mainContent) {
      const headerHeight = header.offsetHeight;
      const paddingValue = `${headerHeight + 15}px`;
      mainContent.style.paddingTop = paddingValue;
      // Also update CSS variable if needed
      document.documentElement.style.setProperty('--header-height', paddingValue);
    }
  };

  // Update immediately
  updatePadding();

  // Update after a short delay to ensure DOM is ready
  setTimeout(updatePadding, 100);

  // Update again after route transition completes
  setTimeout(() => {
    updatePadding();
    // Ensure we're scrolled to top (accounting for header)
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, 300);
});

export default router;
