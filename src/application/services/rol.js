import { requestBackend, getHeaders } from '../api';
import { globalStore } from '../../stores/index';

export const getRolByName = async name => {
  const store = globalStore();
  const permissions = await store.getCurrentPermissions;
  if (!permissions) {
    const rol = (await requestBackend.get(`/rol/name/${name}`, await getHeaders())).data;
    if (rol.permissions) {
      await store.setCurrentPermissions(rol.permissions);
    }
    return rol;
  }
};

export const getRoles = async () => (await requestBackend.get('/rol', await getHeaders())).data;

export const updateRolPermission = async (id, permission) =>
  (await requestBackend.patch(`/rol/${id}/permission`, permission, await getHeaders())).data;

export const updatePermissionsByRolName = async name => {
  const store = globalStore();
  const rol = (await requestBackend.get(`/rol/name/${name}`, await getHeaders())).data;
  if (rol.permissions) {
    await store.setCurrentPermissions(rol.permissions);
  }
  return rol;
};
