import { requestBackend, getHeaders } from '../api';

export const getSurveyPersonalizedByCommerceId = async commerceId => {
  return (await requestBackend.get(`/survey-personalized/commerceId/${commerceId}`, await getHeaders())).data;
}

export const createSurveyPersonalized = async (body) => {
  return (await requestBackend.post(`/survey-personalized`, body, await getHeaders())).data;
}

export const updateSurveyPersonalized = async (id, survey) => {
  return (await requestBackend.patch(`/survey-personalized/${id}`, survey, await getHeaders())).data;
}

export const getSurveyPersonalizedDetailsById = async (body) => {
  return (await requestBackend.get(`/survey-personalized/details/`, body, await getHeaders())).data;
}
