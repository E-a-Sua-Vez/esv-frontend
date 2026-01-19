export const getCountries = () => {
  return ['br', 'cl', 'us', 've', 'mx'];
};

export const getPeriodicities = () => {
  return ['weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual'];
};

export const getProductTypes = () => {
  return ['ALL_IN_ONE', 'ONLY_SURVEYS', 'QUEUES_BOOKING'];
};

export const getPhoneCodes = () => {
  return [
    { id: 've', label: '🇻🇪', code: '58' },
    { id: 'br', label: '🇧🇷', code: '55' },
    { id: 'cl', label: '🇨🇱', code: '56' },
    { id: 'us', label: '🇺🇸', code: '1' },
    { id: 'mx', label: '🇲🇽', code: '52' },
    { id: 'xx', label: '🏴', code: 'xx' },
  ];
};

export const getUserOrigin = () => {
  return [
    { id: 'REFERENCE', code: 'REFERENCE' },
    { id: 'GOOGLE', code: 'GOOGLE' },
    { id: 'WEB_SITE', code: 'WEB_SITE' },
    { id: 'INSTAGRAM', code: 'INSTAGRAM' },
    { id: 'FACEBOOK', code: 'FACEBOOK' },
    { id: 'EMAIL', code: 'EMAIL' },
    { id: 'MARKETING', code: 'MARKETING' },
    { id: 'TV', code: 'TV' },
    { id: 'RADIO', code: 'RADIO' },
    { id: 'TIK_TOK', code: 'TIK_TOK' },
    { id: 'WHATSAPP', code: 'WHATSAPP' },
    { id: 'CALL', code: 'CALL' },
    { id: 'OTHER', code: 'OTHER' },
  ];
};

export const getQuestionTypes = () => {
  return [
    'RATING_TO_5',
    'RATING_TO_10',
    'YES_OR_NOT',
    'OPEN_WRITING',
    'OPEN_OPTIONS',
    'CHOOSE_OPTION',
  ];
};

export const getQuestionFormTypes = () => {
  return [
    'OPEN_TEXT_FIELD',
    'OPEN_NUMBER_FIELD',
    'YES_OR_NOT',
    'OPEN_WRITING',
    'OPEN_OPTIONS',
    'CHOOSE_OPTION',
  ];
};

export const getSurveyTypes = () => {
  return ['SIMPLE_CSAT', 'SIMPLE_NPS', 'SIMPLE_CSAT_NPS', 'PERSONALIZED_SURVEY'];
};

export const getFormTypes = () => {
  return ['FIRST_ATTENTION', 'PRE_ATTENTION'];
};

export const getContactTypes = () => {
  return [
    { id: 'CALL', name: 'CALL' },
    { id: 'EMAIL', name: 'EMAIL' },
    { id: 'MESSAGE', name: 'MESSAGE' },
    { id: 'VISIT', name: 'VISIT' },
  ];
};

export const getCollaboratorTypes = () => {
  return [
    { type: 'STANDARD', name: 'Standard' },
    { type: 'ASSISTANT', name: 'Assistant' },
    { type: 'FULL', name: 'Full' },
  ];
};

export const getContactResultTypes = () => {
  return [
    { id: 'INTERESTED', name: 'INTERESTED' },
    { id: 'CONTACT_LATER', name: 'CONTACT_LATER' },
    { id: 'REJECTED', name: 'REJECTED' },
  ];
};

export const getPaymentTypes = () => {
  return [
    { id: 'TOTALLY', name: 'TOTALLY' },
    { id: 'PARTIAL', name: 'PARTIAL' },
    { id: 'TRIAL', name: 'TRIAL' },
    { id: 'EVALUATION', name: 'EVALUATION' },
    { id: 'PROMOTION', name: 'PROMOTION' },
    { id: 'RETURN', name: 'RETURN' },
    { id: 'PAID', name: 'PAID' },
  ];
};

export const getPaymentMethods = () => {
  return [
    { id: 'CREDIT_CARD', name: 'CREDIT_CARD' },
    { id: 'DEBIT_CARD', name: 'DEBIT_CARD' },
    { id: 'PIX', name: 'PIX' },
    { id: 'HEALTH_AGREEMENT', name: 'HEALTH_AGREEMENT' },
    { id: 'PAID', name: 'PAID' },
    { id: 'DEPOSIT', name: 'DEPOSIT' },
    { id: 'CHECK', name: 'CHECK' },
    { id: 'MONEY', name: 'MONEY' },
    { id: 'BOLETO', name: 'BOLETO' },
    { id: 'WIRE_TRANSFER', name: 'WIRE_TRANSFER' },
  ];
};

export const getQueueTypes = () => {
  return [
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'COLLABORATOR', name: 'COLLABORATOR' },
    { id: 'SERVICE', name: 'SERVICE' },
    { id: 'MULTI_SERVICE', name: 'MULTI_SERVICE' },
    { id: 'SELECT_SERVICE', name: 'SELECT_SERVICE' },
  ];
};

export const getPaymentFiscalNoteTypes = () => {
  return [
    { id: 'NOTA_FISCAL', name: 'NOTA_FISCAL' },
    { id: 'GERENCIAL', name: 'GERENCIAL' },
  ];
};

export const getProductsTypes = () => {
  return [{ id: 'SERVICE', name: 'SERVICE' }];
};

export const getProductMeasureTypes = () => {
  return [
    { id: 'MILLILITERS', name: 'MILLILITERS' },
    { id: 'GRAMS', name: 'GRAMS' },
    { id: 'UNITS', name: 'UNITS' },
  ];
};

export const getServiceTypes = () => {
  return [
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'SELECTABLE', name: 'SELECTABLE' },
  ];
};

export const getOutcomeTypes = () => {
  return [
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'SUPPLIER', name: 'SUPPLIER' },
    { id: 'BENEFICIARY', name: 'BENEFICIARY' },
    { id: 'COLLABORATOR', name: 'COLLABORATOR' },
    { id: 'SERVICE', name: 'SERVICE' },
  ];
};

export const getIncomeTypesToIncrease = () => {
  return [
    { id: 'FUND_INCREASE', name: 'FUND_INCREASE' },
    { id: 'STANDARD', name: 'STANDARD' },
  ];
};

export const getCivilStatuses = () => {
  return [
    { id: 'SINGLE', name: 'SINGLE' },
    { id: 'MARRIED', name: 'MARRIED' },
    { id: 'CIVIL_UNION', name: 'CIVIL_UNION' },
    { id: 'DIVORCED', name: 'DIVORCED' },
    { id: 'WIDOW', name: 'WIDOW' },
  ];
};

export const getSexs = () => {
  return [
    { id: 'MALE', name: 'MALE' },
    { id: 'FEMALE', name: 'FEMALE' },
  ];
};

export const getCompanyTypes = () => {
  return [
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'SUPPLIER', name: 'SUPPLIER' },
    { id: 'BENEFICIARY', name: 'BENEFICIARY' },
    { id: 'COLLABORATOR', name: 'COLLABORATOR' },
    { id: 'SERVICE', name: 'SERVICE' },
    { id: 'HEALTH_AGREEMENT', name: 'HEALTH_AGREEMENT' },
  ];
};

export const getPatientHistoryItemTypes = () => {
  return [
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'PERSONAL_HISTORY', name: 'PERSONAL_HISTORY' },
    { id: 'PHYSICAL_EXAM', name: 'PHYSICAL_EXAM' },
    { id: 'PATIENT_DOCUMENTS', name: 'PATIENT_DOCUMENTS' },
  ];
};

export const getPatientHistoryItemFrequenciesTypes = () => {
  return [
    { id: 'DAILY', name: 'DAILY' },
    { id: 'WEEKLY', name: 'WEEKLY' },
    { id: 'OCCASIONALLY', name: 'OCCASIONALLY' },
  ];
};

export const getControlStatusTypes = () => {
  return [
    { id: 'PENDING', name: 'PENDING' },
    { id: 'PROCCESSED', name: 'PROCCESSED' },
    { id: 'CANCELLED', name: 'CANCELLED' },
  ];
};

export const getControlReasonsTypes = () => {
  return [
    { id: 'EXAM_REVISION', name: 'EXAM_REVISION' },
    { id: 'TREATEMENT_REVISION', name: 'TREATEMENT_REVISION' },
    { id: 'PROCEDURE_REVISION', name: 'PROCEDURE_REVISION' },
    { id: 'GENERAL_REVISION', name: 'GENERAL_REVISION' },
    { id: 'OTHER', name: 'OTHER' },
  ];
};

export const getDocumentTypes = () => {
  return [
    { id: 'COMMERCE', name: 'COMMERCE' },
    { id: 'CLIENT', name: 'CLIENT' },
  ];
};

export const getDocumentCommerceTypes = () => {
  return [
    { id: 'terms_of_service', name: 'terms_of_service' },
    { id: 'post_attention', name: 'post_attention' },
  ];
};

export const getConfigurationTypes = () => {
  return [
    { id: 'EMAIL', name: 'email' },
    { id: 'PRODUCT', name: 'product' },
    { id: 'USER', name: 'user' },
    { id: 'WHATSAPP', name: 'whatsapp' },
    { id: 'MESSAGE', name: 'message' },
  ];
};
export const getProfessionalTypes = () => {
  return [
    { id: 'DOCTOR', name: 'DOCTOR' },
    { id: 'SPECIALIST', name: 'SPECIALIST' },
    { id: 'NURSE', name: 'NURSE' },
    { id: 'MEDICAL_ASSISTANT', name: 'MEDICAL_ASSISTANT' },
    { id: 'SECRETARY', name: 'SECRETARY' },
    { id: 'RECEPTIONIST', name: 'RECEPTIONIST' },
    { id: 'STYLIST', name: 'STYLIST' },
    { id: 'BARBER', name: 'BARBER' },
    { id: 'STANDARD', name: 'STANDARD' },
    { id: 'ASSISTANT', name: 'ASSISTANT' },
    { id: 'FULL', name: 'FULL' },
  ];
};