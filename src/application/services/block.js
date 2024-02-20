import { requestBackend, getHeaders } from '../api';

const entity = 'block';

export const getBlocksByQueueId = async (queueId) => {
  return (await requestBackend.get(`/${entity}/queueId/${queueId}`, await getHeaders())).data;
}

export const getQueueBlockDetailsByDay = async (queueId) => {
  return (await requestBackend.get(`/${entity}/day/queueId/${queueId}`, await getHeaders())).data;
}