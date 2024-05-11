import { requestBackend, getHeaders } from '../api';

const entity = 'survey';

export const createSurvey = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const contactSurvey = async (id) => {
  return (await requestBackend.patch(`/${entity}/contact/${id}`, {}, await getHeaders())).data;
}