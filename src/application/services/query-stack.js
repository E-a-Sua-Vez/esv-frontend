/* eslint-disable camelcase */
import qs from 'qs';
import { requestQuery, getHeaders } from '../api';

export const getDailyMetrics = async (type, subtype, from, to, events = false) => {
  const options = {};
  options.params = { type, subtype, from, to, events };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('daily-events', options)).data;
};

const getEvents = async (type, from, to, events, goals, subtype) => {
  const options = getOptions();
  options.params = { type, from, to, events, goals };
  if (subtype) options.params.subtype = subtype;
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('daily-events', options)).data;
};

export const getMetrics = async (commerceId, queues, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, queues  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics', options)).data;
};


export const getAttentions = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('attention', options)).data;
};

export const getBusinessExecutiveReport = async (businessId, from, to) => {
  const options = {};
  options.params = { from, to, businessId };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/business-executive', options)).data;
};

export const getSurveys = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey', options)).data;
};

export const getBookings = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('booking', options)).data;
};

export const getNotifications = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('notification', options)).data;
};

export const getWaitlists = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('waitlist', options)).data;
};

export const getSurveysDetails = async (
  commerceId,
  from,
  to,
  page = undefined,
  limit = undefined,
  ratingType = undefined,
  npsType = undefined,
  contactable = undefined,
  contacted = undefined,
  keyWord = undefined,
  searchText = undefined,
  queueId = undefined
) => {
  const options = {};
  options.params = { from, to, commerceId, page, limit, ratingType, npsType, contactable, contacted, keyWord, searchText, queueId };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey/details', options)).data;
};

export const getPersonalizedSurveyDetails = async (personalizedId, commerceId, title, from, to, queueId = undefined, answerLimit = undefined) => {
  const options = {};
  options.params = { from, to, commerceId, personalizedId, title, queueId, answerLimit };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey-personalized/details', options)).data;
};

export const getSurveysEvolution = async (
  commerceId,
  from = undefined,
  to = undefined,
  queueId = undefined,
  dateType = undefined
) => {
  const options = {};
  options.params = { from, to, commerceId, queueId, dateType };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey/evolution', options)).data;
};

export const getSurveyEvolutionMetrics = async (
  commerceId,
  queueId = undefined,
  from = undefined,
  to = undefined,
  dateType = 'month'
) => {
  const options = {};
  options.params = { from, to, commerceId, queueId, dateType };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/survey/evolution', options)).data;
};

export const getSurveyMetrics = async (
  commerceId,
  queueId = undefined,
  from = undefined,
  to = undefined
) => {
  const options = {};
  options.params = { from, to, commerceId, queueId };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/survey', options)).data;
};

export const getAttentionsDetails = async (
  commerceId,
  from,
  to,
  page = undefined,
  limit = undefined,
  daysSinceType = undefined,
  daysSinceContacted = undefined,
  contactable = undefined,
  contacted = undefined,
  keyWord = undefined,
  searchText = undefined,
  queueId = undefined
) => {
  const options = {};
  options.params = { from, to, commerceId, page, limit, daysSinceType, daysSinceContacted, contactable, contacted, keyWord, searchText, queueId };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('attention/details', options)).data;
};