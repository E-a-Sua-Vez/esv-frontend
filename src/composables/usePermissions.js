import { ref, computed } from 'vue';
import { globalStore } from '@/stores/index';
import { getAuth } from 'firebase/auth';
import { USER_TYPES } from '@/shared/constants';

const userPermissions = ref({});
const permissionsLoaded = ref(false);

export function usePermissions() {
  const loadPermissions = async () => {
    try {
      // Verificar si hay un usuario autenticado antes de cargar permisos
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        userPermissions.value = {};
        permissionsLoaded.value = true;
        return;
      }

      // Usar store para obtener permisos completos del usuario
      const store = globalStore();
      const permissions = await store.getCurrentPermissions;

      userPermissions.value = permissions || {};
      permissionsLoaded.value = true;
    } catch (error) {
      userPermissions.value = {};
      permissionsLoaded.value = true;
    }
  };

  const hasPermission = (permission) => {
    if (!permissionsLoaded.value) return false;
    return !!userPermissions.value[permission];
  };

  const hasAnyPermission = (permissions) => {
    if (!permissionsLoaded.value) return false;
    return permissions.some(permission => !!userPermissions.value[permission]);
  };

  const hasAllPermissions = (permissions) => {
    if (!permissionsLoaded.value) return false;
    return permissions.every(permission => !!userPermissions.value[permission]);
  };

  // Computed permissions para mensajes y chats
  const canSendMessages = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede enviar mensajes
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('messages.admin.send') || hasPermission('messages.admin.send-mass') || hasPermission('messages.admin.send-cross-business');
  });

  const canSendMassMessages = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede enviar mensajes masivos
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('messages.admin.send-mass');
  });

  const canSendCrossBusinessMessages = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede enviar mensajes cross-business
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('messages.admin.send-cross-business');
  });

  const canViewMessages = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede ver mensajes
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('messages.admin.view');
  });

  const canDeleteMessages = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede eliminar mensajes
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('messages.admin.delete');
  });

  const canStartChats = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede iniciar chats
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('chats.admin.start') || hasPermission('chats.admin.start-cross-business');
  });

  const canStartCrossBusinessChats = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede iniciar chats cross-business
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('chats.admin.start-cross-business');
  });

  const canViewChats = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede ver chats
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('chats.admin.view');
  });

  const canModerateChats = computed(() => {
    const store = globalStore();
    // Usuario MASTER siempre puede moderar chats
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasPermission('chats.admin.moderate');
  });

  const isMasterUser = computed(() => {
    const store = globalStore();
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasAllPermissions([
      'messages.admin.send-mass',
      'messages.admin.send-cross-business',
      'chats.admin.start-cross-business'
    ]);
  });

  const isAdminUser = computed(() => {
    const store = globalStore();
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;
    return hasAnyPermission([
      'messages.admin.send',
      'chats.admin.start'
    ]);
  });

  // Computed properties para mostrar componentes basado en permisos
  const canAccessInbox = computed(() => {
    const store = globalStore();

    // Usuario MASTER siempre tiene acceso
    if (store.getCurrentUserType === USER_TYPES.MASTER) return true;

    // Si los permisos no se han cargado aún, no mostrar por defecto hasta cargar
    if (!permissionsLoaded.value) return false;

    // Si no hay permisos cargados, permitir acceso (usuario básico/guest)
    if (!userPermissions.value || Object.keys(userPermissions.value).length === 0) {
      return true;
    }

    // Lista amplia de permisos que pueden indicar acceso a mensajes/chat
    const accessPermissions = [
      // Permisos de mensajes
      'messages.admin.send',
      'messages.admin.view',
      'messages.admin.read',
      'messages.admin.send-mass',
      'messages.admin.send-cross-business',
      'messages.admin.delete',
      // Permisos de chat
      'chats.admin.start',
      'chats.admin.view',
      'chats.admin.participate',
      'chats.admin.start-cross-business',
      'chats.admin.moderate',
      // Permisos de colaborador básico que podrían permitir acceso
      'collaborator.basic.read',
      'collaborator.basic.write',
      'business.collaborator.read',
      'business.collaborator.write',
      // Permisos de negocio que incluirían mensajes
      'business.main-menu.messages',
      'business.main-menu.chats',
      'business.main-menu.notifications'
    ];

    // Si tiene algún permiso relacionado, permitir acceso
    return hasAnyPermission(accessPermissions);
  });

  const canAccessMessageComponents = computed(() => {
    if (!permissionsLoaded.value) return true;

    // Verificar permisos básicos de mensajes
    return hasAnyPermission([
      'messages.admin.send',
      'messages.admin.view',
      'messages.admin.read',
      'messages.admin.send-mass',
      'messages.admin.send-cross-business'
    ]);
  });

  const canAccessChatComponents = computed(() => {
    if (!permissionsLoaded.value) return true;

    // Verificar permisos básicos de chat
    return hasAnyPermission([
      'chats.admin.start',
      'chats.admin.view',
      'chats.admin.participate',
      'chats.admin.start-cross-business',
      'chats.admin.moderate'
    ]);
  });

  return {
    // Estado
    userPermissions,
    permissionsLoaded,

    // Métodos
    loadPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Computed permissions específicos
    canSendMessages,
    canSendMassMessages,
    canSendCrossBusinessMessages,
    canViewMessages,
    canDeleteMessages,
    canStartChats,
    canStartCrossBusinessChats,
    canViewChats,
    canModerateChats,

    // Permission groups
    isMasterUser,
    isAdminUser,

    // Computed para componentes
    canAccessInbox,
    canAccessMessageComponents,
    canAccessChatComponents,
  };
}