import { requestBackend, getHeaders } from '../api';

const entity = 'survey';

export const createSurvey = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;

export const contactSurvey = async id =>
  (await requestBackend.patch(`/${entity}/contact/${id}`, {}, await getHeaders())).data;
