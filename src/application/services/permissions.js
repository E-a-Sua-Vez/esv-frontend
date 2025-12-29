import { globalStore } from '../../stores/index';
import { getRolByName } from './rol';

export const getPermissions = async (moduleIn, typeIn, actionIn) => {
  try {
    const store = globalStore();
    const result = {};
    let permissions = await store.getCurrentPermissions;
    if (!permissions) {
      const rolName = await store.getCurrentUserType;
      permissions = await getRolByName(rolName);
    }
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
    console.error('Error in getPermissions:', error);
    return {};
  }
};
