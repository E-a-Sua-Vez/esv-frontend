import { requestBackend, getHeaders } from '../api';

export const createSurvey = async (body) => {
  return (await requestBackend.post(`/survey`, body, await getHeaders())).data;
}

export const contactSurvey = async (id) => {
  return (await requestBackend.patch(`/survey/contact/${id}`, {}, await getHeaders())).data;
}