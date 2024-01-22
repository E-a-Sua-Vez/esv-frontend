import { requestBackend, getHeaders } from '../api';
import { signUp } from './auth';
import { globalStore } from '../../stores/index';

export const getCollaboratorById = async id => {
  return (await requestBackend.get(`/collaborator/${id}`, await getHeaders())).data;
}

export const getCollaboratorByEmail = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/collaborator/email/${email}`, await getHeaders())).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getCollaboratorByEmailNotToken = async email => {
  const store = globalStore();
  const user = (await requestBackend.get(`/collaborator/email/${email}`)).data;
  if(user.permissions) {
    await store.setCurrentPermissions(user.permissions);
  }
  return user;
}

export const getCollaboratorsByCommerceId = async commerceId => {
  return (await requestBackend.get(`/collaborator/commerceId/${commerceId}`, await getHeaders())).data;
}

export const updateModule = async (id, body) => {
  return (await requestBackend.patch(`/collaborator/${id}`, body, await getHeaders())).data;
}

export const registerCollaboratorToken = async (id, body) => {
  return (await requestBackend.patch(`/collaborator/register-token/${id}`, body, await getHeaders())).data;
}

export const changeCollaboratorPassword = async (id, body) => {
  return (await requestBackend.patch(`/collaborator/change-password/${id}`)).data;
}

export const updateCollaborator = async (id, collaborator) => {
  return (await requestBackend.patch(`/collaborator/${id}`, collaborator, await getHeaders())).data;
}

export const addCollaborator = async (newCollaborator) => {
  let collaborator = (await requestBackend.post(`/collaborator`, newCollaborator, await getHeaders())).data;
  if (collaborator.bot === false) {
    await signUp(collaborator.email, collaborator.email);
  }
  return collaborator;
}