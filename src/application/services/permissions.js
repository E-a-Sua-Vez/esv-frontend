import { globalStore } from '../../stores/index';
import { getRolByName } from './rol';

export const getPermissions = async (moduleIn, typeIn, actionIn) => {
  const store = globalStore();
  let result = {};
  let permissions = await store.getCurrentPermissions;
  if (!permissions) {
    const rolName =  await store.getCurrentUserType;
    permissions = await getRolByName(rolName);
  }
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

