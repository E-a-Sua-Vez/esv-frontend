import { requestBackend, getHeaders } from '../api';

export const createSuggestion = async (body) => {
  return (await requestBackend.post(`/suggestion`, body, await getHeaders())).data;
}
