import { globalStore } from '../../stores/index';

export const getPermissions = async (moduleIn, typeIn, actionIn) => {
  const store = globalStore();
  let result = {};
  const permissions = await store.getCurrentPermissions;
  Object.keys(permissions).map(permission => {
    let push = true;
    const [ module, type, action ] = permission.split('.');
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
  })
  return result;
}

