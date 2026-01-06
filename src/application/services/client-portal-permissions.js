import { getClientPermissions } from './client-portal';

/**
 * Obtiene permisos del cliente desde el backend basados en su token de sesión
 * Similar a getPermissions de permissions.js pero específico para el portal del cliente
 */
export const getClientPortalPermissions = async (moduleIn, typeIn, actionIn) => {
  try {
    const result = {};
    const token = localStorage.getItem('clientPortalSessionToken');

    if (!token) {
      console.warn('No client portal session token found');
      return {};
    }

    // Obtener permisos del backend
    const permissions = await getClientPermissions(token);

    if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
      Object.keys(permissions).map(permission => {
        let push = true;
        const [module, type, action] = permission.split('.');

        if (moduleIn) {
          if (moduleIn !== module) {
            push = false;
          }
        }
        if (typeIn) {
          if (typeIn !== type) {
            push = false;
          }
        }
        if (actionIn) {
          if (actionIn !== action) {
            push = false;
          }
        }

        if (push) {
          result[permission] = permissions[permission];
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getClientPortalPermissions:', error);
    return {};
  }
};

/**
 * Verifica si el cliente tiene un permiso específico
 */
export const hasClientPermission = async permissionKey => {
  try {
    const token = localStorage.getItem('clientPortalSessionToken');

    if (!token) {
      return false;
    }

    const permissions = await getClientPermissions(token);
    return permissions && permissions[permissionKey] === true;
  } catch (error) {
    console.error('Error checking client permission:', error);
    return false;
  }
};

/**
 * Obtiene todos los permisos del cliente sin filtros
 */
export const getAllClientPortalPermissions = async () => {
  try {
    const token = localStorage.getItem('clientPortalSessionToken');

    if (!token) {
      console.warn('No client portal session token found');
      return {};
    }

    return await getClientPermissions(token);
  } catch (error) {
    console.error('Error getting all client portal permissions:', error);
    return {};
  }
};
