import { requestBackend, getHeaders } from '../api';
import { signUp } from './auth';
import { globalStore } from '../../stores/index';

export const getAdministratorById = async id => {
  return (await requestBackend.get(`/administrator/${id}`, await getHeaders())).data;
}

export const getAdministratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/administrator/email/${email}`, await getHeaders())).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getAdministratorByEmailNotToken = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/administrator/email/${email}`)).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getMasterAdministratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/administrator/email/${email}/master`, await getHeaders())).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const registerAdministratorToken = async (id, body) => {
  return (await requestBackend.patch(`/administrator/register-token/${id}`, body, await getHeaders())).data;
}

export const changeAdministratorPassword = async (id, body) => {
  return (await requestBackend.patch(`/administrator/change-password/${id}`, body, await getHeaders())).data;
}

export const addAdministrator = async (newAdministrator) => {
  let administrator = (await requestBackend.post(`/administrator`, newAdministrator, await getHeaders())).data;
  await signUp(administrator.email, administrator.email);
  return administrator;
}