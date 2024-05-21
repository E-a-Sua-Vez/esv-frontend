import { requestBackend, getHeaders } from '../api';

const entity = 'message';

export const updateMessage = async (id, message) => {
  return (await requestBackend.patch(`/${entity}/${id}`, message, await getHeaders())).data;
}

export const markAllAsRead = async (message) => {
  return (await requestBackend.patch(`/${entity}/all/read`, message, await getHeaders())).data;
}