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

export const getSpyMetrics = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/spy', options)).data;
};

export const getFinancialMetrics = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/financial', options)).data;
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

export const getAttentionsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attentions', options)).data;
};

export const getBookingsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/bookings', options)).data;
};

export const getWaitlistsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/waitlists', options)).data;
};

export const getSurveysReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/surveys', options)).data;
};

export const getNotificationsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/notifications', options)).data;
};

export const getClientsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/clients', options)).data;
};

export const getClientContactsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/client-contacts', options)).data;
};

export const getBookingPaymentsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/booking-payments', options)).data;
};

export const getAttentionPaymentsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attention-payments', options)).data;
};

export const getAttentionProductsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attention-products', options)).data;
};

export const getIncomesResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/incomes', options)).data;
};

export const getOutcomesResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/outcomes', options)).data;
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
  commerceIds = undefined,
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
  options.params = {
    from, to, commerceId, commerceIds, page, limit, ratingType, npsType,
    contactable, contacted, keyWord, searchText, queueId
  };
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
  commerceIds = undefined,
  page = 1,
  limit = 10,
  daysSinceType = undefined,
  daysSinceContacted = undefined,
  contactable = undefined,
  contacted = undefined,
  searchText = undefined,
  queueId = undefined,
  survey = undefined,
  asc = true,
  contactResultType = undefined,
  serviceId = undefined,
  stock = undefined,
  id = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, daysSinceType, daysSinceContacted,
    contactable, contacted, searchText, queueId, survey, asc,
    contactResultType, serviceId, stock, id
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('attention/details', options)).data;
};

export const getPendingAttentionsDetails = async (
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = 1,
  limit = 10,
  daysSinceType = undefined,
  daysSinceContacted = undefined,
  contactable = undefined,
  contacted = undefined,
  searchText = undefined,
  queueId = undefined,
  survey = undefined,
  asc = true,
  contactResultType = undefined,
  serviceId = undefined,
  stock = undefined,
  id = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, daysSinceType, daysSinceContacted,
    contactable, contacted, searchText, queueId, survey, asc,
    contactResultType, serviceId, stock, id
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('attention/details/pending', options)).data;
};

export const getBookingsDetails = async (
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = 1,
  limit = 10,
  searchText = undefined,
  queueId = undefined,
  asc = true,
  serviceId = undefined,
  status = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit,
    searchText, queueId, asc, serviceId, status
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('booking/details', options)).data;
};

export const getPatientHistoryDetails = async (
  clientId
) => {
  const options = {};
  options.params = {
    clientId
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('patient-history/details', options)).data;
};

export const getClientsDetails = async (
  businessId,
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = undefined,
  limit = undefined,
  daysSinceType = undefined,
  daysSinceContacted = undefined,
  contactable = undefined,
  contacted = undefined,
  searchText = undefined,
  queueId = undefined,
  survey = undefined,
  asc = true,
  contactResultType = undefined,
  idNumber = undefined,
  serviceId = undefined,
  pendingControls = undefined,
  pendingBookings = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, daysSinceType, daysSinceContacted,
    contactable, contacted, searchText, queueId, survey, asc,
    contactResultType, businessId, idNumber, serviceId, pendingControls, pendingBookings
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('client/details', options)).data;
};

export const getClientContactsDetailsByClientId = async (
  commerceId,
  from,
  to,
  commerceIds = undefined,
  clientId = undefined,
  page = undefined,
  limit = undefined,
  daysSinceContacted = undefined,
  searchText = undefined,
  asc = true,
  contactResultType = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, clientId, page, limit, daysSinceContacted,
    searchText, asc, contactResultType
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get(`client-contact/details/client/${clientId}`, options)).data;
};

export const getClientContactsDetails = async (
  commerceId,
  from,
  to,
  commerceIds = undefined,
  clientId = undefined,
  page = undefined,
  limit = undefined,
  daysSinceContacted = undefined,
  searchText = undefined,
  asc = true,
  contactResultType = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, clientId, page, limit, daysSinceContacted,
    searchText, asc, contactResultType
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('client-contact/details', options)).data;
};

export const getProductsDetails = async (
  businessId,
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = undefined,
  limit = undefined,
  expired = undefined,
  replacement = undefined,
  productStatus = undefined,
  searchText = undefined,
  asc = true
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, expired, replacement,
    productStatus, searchText, asc, businessId
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('product/details', options)).data;
};

export const getProductsReplacementDetails = async (
  productId = undefined,
  page = undefined,
  limit = undefined,
  asc = true,
  from = undefined,
  to = undefined
) => {
  const options = {};
  options.params = {
    productId, page, limit, asc, from, to
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('product/replacements', options)).data;
};

export const getProductsConsumptionsDetails = async (
  commercesId = undefined,
  productId = undefined,
  page = undefined,
  limit = undefined,
  asc = true,
  from = undefined,
  to = undefined,
  attentionId = undefined
) => {
  const options = {};
  options.params = {
    commercesId, productId, page, limit, asc, from, to, attentionId
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('product/consumptions', options)).data;
};

export const getIncomesDetails = async (
  businessId = undefined,
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = undefined,
  limit = undefined,
  searchText = undefined,
  asc = true,
  incomeStatus = undefined,
  fiscalNote = undefined,
  automatic = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, searchText, asc, businessId, incomeStatus, fiscalNote, automatic
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('income/details', options)).data;
};

export const getOutcomesDetails = async (
  businessId = undefined,
  commerceId,
  from,
  to,
  commerceIds = undefined,
  page = undefined,
  limit = undefined,
  searchText = undefined,
  asc = true,
  incomeStatus = undefined,
  fiscalNote = undefined,
  automatic = undefined
) => {
  const options = {};
  options.params = {
    from, to, commerceId, commerceIds, page, limit, searchText, asc, businessId, incomeStatus, fiscalNote, automatic
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('outcome/details', options)).data;
};

export const getDocumentsDetails = async (
  from,
  to,
  commerceIds = undefined,
  page = undefined,
  limit = undefined,
  searchText = undefined,
  asc = true,
  type = undefined
) => {
  const options = {};
  options.params = {

    from, to, commerceIds, page, limit, asc, searchText, type
  };
  options.paramsSerializer = params => {
    return qs.stringify(params);
  };
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('documents/details', options)).data;
};