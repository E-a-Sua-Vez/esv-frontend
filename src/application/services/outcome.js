import { requestBackend, getHeaders } from '../api';

const entity = 'outcome';

export const createOutcome = async body =>
  (await requestBackend.post(`/${entity}`, body, await getHeaders())).data;
