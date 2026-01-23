/* eslint-disable camelcase */
import qs from 'qs';
import { requestQuery, getHeaders } from '../api';

export const getDailyMetrics = async (type, subtype, from, to, events = false) => {
  const options = {};
  options.params = { type, subtype, from, to, events };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('daily-events', options)).data;
};

const getEvents = async (type, from, to, events, goals, subtype) => {
  const options = {};
  options.params = { type, from, to, events, goals };
  if (subtype) options.params.subtype = subtype;
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('daily-events', options)).data;
};

export const getMetrics = async (commerceId, queues, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, queues };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics', options)).data;
};

export const getSpyMetrics = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/spy', options)).data;
};

export const getFinancialMetrics = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/financial', options)).data;
};

export const getFinancialComparison = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/financial/comparison', options)).data;
};

export const getFinancialTrends = async (commercesId, to) => {
  const options = {};
  options.params = { to, commercesId };
  options.paramsSerializer = params => qs.stringify(params);
  options.timeout = 120000; // 120 seconds - this endpoint processes 12 months of data sequentially
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/financial/trends', options)).data;
};

export const getOutcomesCategoryAnalysis = async (commercesId, from, to) => {
  const options = {};
  options.params = { from, to, commercesId };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('metrics/financial/outcomes/categories', options)).data;
};

export const getAttentions = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('attention', options)).data;
};

export const getBusinessExecutiveReport = async (businessId, from, to) => {
  const options = {};
  options.params = { from, to, businessId };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/business-executive', options)).data;
};

export const getAttentionsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attentions', options)).data;
};

export const getBookingsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/bookings', options)).data;
};

export const getWaitlistsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/waitlists', options)).data;
};

export const getSurveysReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/surveys', options)).data;
};

export const getNotificationsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/notifications', options)).data;
};

export const getClientsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/clients', options)).data;
};

export const getClientContactsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/client-contacts', options)).data;
};

export const getBookingPaymentsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/booking-payments', options)).data;
};

export const getAttentionPaymentsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attention-payments', options)).data;
};

export const getAttentionProductsResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/attention-products', options)).data;
};

export const getIncomesResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/incomes', options)).data;
};

export const getOutcomesResume = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/outcomes', options)).data;
};

export const getCashFlowMonthlyReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/cash-flow-monthly', options)).data;
};

export const getServiceProfitabilityReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/service-profitability', options)).data;
};

export const getMostProfitableClientsReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/most-profitable-clients', options)).data;
};

export const getExpensesByProviderReport = async (commerceId, commerceIds, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, commerceIds };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('reports/expenses-by-provider', options)).data;
};

export const getSurveys = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey', options)).data;
};

export const getBookings = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('booking', options)).data;
};

export const getNotifications = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('notification', options)).data;
};

export const getWaitlists = async (commerceId, from, to) => {
  const options = {};
  options.params = { from, to, commerceId, orderByDCreatedAt: 'true' };
  options.paramsSerializer = params => qs.stringify(params);
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
  queueId = undefined,
  serviceId = undefined
) => {
  const options = {};
  // Convert boolean values to strings for API compatibility
  const convertBool = val => {
    if (val === true) return 'true';
    if (val === false) return 'false';
    return val;
  };
  options.params = {
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    ratingType,
    npsType,
    contactable: convertBool(contactable),
    contacted: convertBool(contacted),
    keyWord,
    searchText,
    queueId,
    serviceId,
    // Add timestamp to prevent 304 cache responses
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('survey/details', options)).data;
};

export const getPersonalizedSurveyDetails = async (
  personalizedId,
  commerceId,
  title,
  from,
  to,
  queueId = undefined,
  answerLimit = undefined
) => {
  const options = {};
  options.params = { from, to, commerceId, personalizedId, title, queueId, answerLimit };
  options.paramsSerializer = params => qs.stringify(params);
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
  options.paramsSerializer = params => qs.stringify(params);
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
  options.paramsSerializer = params => qs.stringify(params);
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
  options.paramsSerializer = params => qs.stringify(params);
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
  id = undefined,
  userId = undefined,
  clientId = undefined,
  status = undefined
) => {
  const options = {};
  // Convert boolean values to strings for API compatibility
  const convertBool = val => {
    if (val === true) return 'true';
    if (val === false) return 'false';
    return val;
  };
  options.params = {
    from,
    to,
    commerceId,
    ...(commerceIds ? { commerceIds } : {}), // Only include if defined
    page,
    limit,
    daysSinceType,
    daysSinceContacted,
    contactable: convertBool(contactable),
    contacted: convertBool(contacted),
    searchText,
    queueId,
    survey: convertBool(survey),
    asc: convertBool(asc),
    contactResultType,
    serviceId,
    stock: convertBool(stock),
    id,
    userId,
    clientId,
    status,
    // Add timestamp to prevent 304 cache responses
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    daysSinceType,
    daysSinceContacted,
    contactable,
    contacted,
    searchText,
    queueId,
    survey,
    asc,
    contactResultType,
    serviceId,
    stock,
    id,
  };
  options.paramsSerializer = params => qs.stringify(params);
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
  status = undefined,
  clientId = undefined,
  packageId = undefined,
  survey = undefined
) => {
  const options = {};
  // Convert boolean values to strings for API compatibility
  const convertBool = val => {
    if (val === true) return 'true';
    if (val === false) return 'false';
    return val;
  };
  options.params = {
    from,
    to,
    commerceId,
    ...(commerceIds ? { commerceIds } : {}), // Only include if defined
    page,
    limit,
    searchText,
    queueId,
    asc: convertBool(asc),
    serviceId,
    status,
    clientId,
    packageId,
    survey: convertBool(survey), // Convert survey boolean to string
    // Add timestamp to prevent 304 cache responses
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('booking/details', options)).data;
};

export const getPatientHistoryDetails = async clientId => {
  const options = {};
  options.params = {
    clientId,
  };
  options.paramsSerializer = params => qs.stringify(params);
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
  pendingBookings = undefined,
  firstAttentionForm = undefined,
  ratingType = undefined,
  npsType = undefined
) => {
  const options = {};
  // Convert boolean values to strings for API compatibility
  const convertBool = val => {
    if (val === true) return 'true';
    if (val === false) return 'false';
    return val;
  };
  options.params = {
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    daysSinceType,
    daysSinceContacted,
    contactable: convertBool(contactable),
    contacted: convertBool(contacted),
    searchText,
    queueId,
    survey: convertBool(survey),
    asc: convertBool(asc),
    contactResultType,
    businessId,
    idNumber,
    serviceId,
    pendingControls: convertBool(pendingControls),
    pendingBookings: convertBool(pendingBookings),
    firstAttentionForm: convertBool(firstAttentionForm),
    ratingType,
    npsType,
    // Add timestamp to prevent 304 cache responses
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    from,
    to,
    commerceId,
    commerceIds,
    clientId,
    page,
    limit,
    daysSinceContacted,
    searchText,
    asc,
    contactResultType,
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    from,
    to,
    commerceId,
    commerceIds,
    clientId,
    page,
    limit,
    daysSinceContacted,
    searchText,
    asc,
    contactResultType,
  };
  options.paramsSerializer = params => qs.stringify(params);
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
  asc = true,
  queueId = undefined,
  serviceId = undefined
) => {
  const options = {};
  options.params = {
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    expired,
    replacement,
    productStatus,
    searchText,
    asc,
    businessId,
    queueId,
    serviceId,
    // Add timestamp to prevent 304 cache responses
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    productId,
    page,
    limit,
    asc,
    from,
    to,
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    commercesId,
    productId,
    page,
    limit,
    asc,
    from,
    to,
    attentionId,
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('product/consumptions', options)).data;
};

export const getProductsKpis = async (
  commerceId = undefined,
  commerceIds = undefined,
  from = undefined,
  to = undefined
) => {
  const options = {};
  options.params = {
    commerceId,
    commerceIds,
    _t: Date.now(), // Prevent cache
  };
  if (from) options.params.from = from;
  if (to) options.params.to = to;
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('product/kpis', options)).data;
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
  automatic = undefined,
  minAmount = undefined,
  maxAmount = undefined,
  incomeTypeFilter = undefined,
  paymentMethodFilter = undefined,
  professionalFilter = undefined
) => {
  const options = {};
  options.params = {
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    searchText,
    asc,
    businessId,
    incomeStatus,
    fiscalNote: fiscalNote !== undefined ? fiscalNote.toString() : undefined,
    automatic: automatic !== undefined ? automatic.toString() : undefined,
    minAmount,
    maxAmount,
    incomeTypeFilter,
    paymentMethodFilter,
    // Add timestamp to prevent caching
    _t: Date.now(),
  };
  
  // Only include professionalFilter if it has a value
  if (professionalFilter !== undefined && professionalFilter !== null && professionalFilter !== '') {
    options.params.professionalFilter = professionalFilter;
    console.log('[getIncomesDetails] Including professionalFilter in params:', professionalFilter);
  } else {
    console.log('[getIncomesDetails] professionalFilter is empty/undefined, not including in params');
  }
  
  console.log('[getIncomesDetails] Final params:', options.params);
  options.paramsSerializer = params => qs.stringify(params);
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
  automatic = undefined,
  minAmount = undefined,
  maxAmount = undefined,
  outcomeTypeFilter = undefined,
  paymentMethodFilter = undefined
) => {
  const options = {};
  options.params = {
    from,
    to,
    commerceId,
    commerceIds,
    page,
    limit,
    searchText,
    asc,
    businessId,
    incomeStatus,
    fiscalNote: fiscalNote !== undefined ? fiscalNote.toString() : undefined,
    automatic: automatic !== undefined ? automatic.toString() : undefined,
    minAmount,
    maxAmount,
    outcomeTypeFilter,
    paymentMethodFilter,
    // Add timestamp to prevent caching
    _t: Date.now(),
  };
  options.paramsSerializer = params => qs.stringify(params);
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
    from,
    to,
    commerceIds,
    page,
    limit,
    asc,
    searchText,
    type,
  };
  options.paramsSerializer = params => qs.stringify(params);
  const { headers } = await getHeaders();
  options.headers = headers;
  return (await requestQuery.get('documents/details', options)).data;
};
