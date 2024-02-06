import { requestBackend, getHeaders } from '../api';
import { signUp } from './auth';
import { globalStore } from '../../stores/index';

const entity = 'collaborator';

export const getCollaboratorById = async id => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
}

export const getCollaboratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getCollaboratorByEmailSimple = async email => {
  const user = (await requestBackend.get(`/${entity}/email/${email}`, await getHeaders())).data;
  return user;
}

export const getCollaboratorByEmailNotToken = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/${entity}/email/${email}`)).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getCollaboratorsByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateModule = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/${id}`, body, await getHeaders())).data;
}

export const registerCollaboratorToken = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/register-token/${id}`, body, await getHeaders())).data;
}

export const changeCollaboratorPassword = async (id, body) => {
  return (await requestBackend.patch(`/${entity}/change-password/${id}`)).data;
}

export const updateCollaborator = async (id, collaborator) => {
  return (await requestBackend.patch(`/${entity}/${id}`, collaborator, await getHeaders())).data;
}

export const addCollaborator = async (newCollaborator) => {
  let collaborator = (await requestBackend.post(`/${entity}`, newCollaborator, await getHeaders())).data;
  if (collaborator.bot === false) {
    await signUp(collaborator.email, collaborator.email);
  }
  return collaborator;
}

export const updateCollaboratorPermission = async (id, permission) => {
  return (await requestBackend.patch(`/${entity}/${id}/permission`, permission, await getHeaders())).data;
}
