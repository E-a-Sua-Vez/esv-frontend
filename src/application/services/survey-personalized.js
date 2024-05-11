import { requestBackend, getHeaders } from '../api';

const entity = 'survey-personalized';

export const getSurveyPersonalizedByCommerceId = async commerceId => {
  return (await requestBackend.get(`/${entity}/commerceId/${commerceId}`, await getHeaders())).data;
}

export const createSurveyPersonalized = async (body) => {
  return (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
}

export const updateSurveyPersonalized = async (id, survey) => {
  return (await requestBackend.patch(`/${entity}/${id}`, survey, await getHeaders())).data;
}

export const getSurveyPersonalizedDetailsById = async (body) => {
  return (await requestBackend.get(`/${entity}/details/`, body, await getHeaders())).data;
}
