import { requestBackend, getHeaders } from '../api';
import { signUp } from './auth';
import { globalStore } from '../../stores/index';

const entity = 'administrator';

export const getAdministratorById = async id =>
  (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;

export const getAdministratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;
  if (user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
};

export const getAdministratorByEmailSimple = async email => {
  const user = (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;
  return user;
};

export const getAdministratorByEmailNotToken = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`)).data;
  if (user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
};

export const getMasterAdministratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}/master`, await getHeaders()))
    .data;
  if (user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
};

export const registerAdministratorToken = async (id, body) =>
  (await requestBackend.patch(`/${entity}/register-token/${id}`, body, await getHeaders())).data;

export const changeAdministratorPassword = async (id, body) =>
  (await requestBackend.patch(`/${entity}/change-password/${id}`, body, await getHeaders())).data;

export const addAdministrator = async newAdministrator => {
  const administrator = (
    await requestBackend.post(`/${entity}`, newAdministrator, await getHeaders())
  ).data;
  await signUp(administrator.email, administrator.email);
  return administrator;
};

export const getAdministratorsByBusinessId = async businessId =>
  (await requestBackend.get(`/${entity}/businessId/${businessId}`, await getHeaders())).data;

export const updateAdministrator = async (id, administrator) =>
  (await requestBackend.patch(`/${entity}/${id}`, administrator, await getHeaders())).data;

export const updateAdministratorPermission = async (id, permission) =>
  (await requestBackend.patch(`/${entity}/${id}/permission`, permission, await getHeaders())).data;
