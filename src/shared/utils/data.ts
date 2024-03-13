export const getPhoneCodes = () => {
  return [
    { id: 've', label: '🇻🇪', code: '58' },
    { id: 'br', label: '🇧🇷', code: '55' },
    { id: 'cl', label: '🇨🇱', code: '56' },
    { id: 'us', label: '🇺🇸', code: '1' },
    { id: 'mx', label: '🇲🇽', code: '52' },
    { id: 'xx', label: '🏴', code: 'xx' }
  ];
}

export const getUserOrigin = () => {
  return [
    { id: 'REFERENCE', code: 'REFERENCE' },
    { id: 'GOOGLE', code: 'GOOGLE' },
    { id: 'WEB_SITE',  code: 'WEB_SITE' },
    { id: 'INSTAGRAM',  code: 'INSTAGRAM' },
    { id: 'FACEBOOK',  code: 'FACEBOOK' },
    { id: 'EMAIL', code: 'EMAIL' },
    { id: 'MARKETING', code: 'MARKETING' },
    { id: 'TV', code: 'TV' },
    { id: 'RADIO', code: 'RADIO' },
    { id: 'TIK_TOK', code: 'TIK_TOK' },
    { id: 'WHATSAPP', code: 'WHATSAPP' },
    { id: 'CALL', code: 'CALL' },
    { id: 'OTHER', code: 'OTHER' }
  ];
}

export const getQuestionTypes = () => {
  return [
    "RATING_TO_5",
    "RATING_TO_10",
    "YES_OR_NOT",
    "OPEN_WRITING",
    "OPEN_OPTIONS",
    "CHOOSE_OPTION"
  ]
}

export const getSurveyTypes = () => {
  return [
    "SIMPLE_CSAT",
    "SIMPLE_NPS",
    "SIMPLE_CSAT_NPS",
    "PERSONALIZED_SURVEY"
  ]
}

export const getContactTypes = () => {
  return [
    { id: 'CALL', name: 'CALL' },
    { id: 'EMAIL', name: 'EMAIL' },
    { id: 'MESSAGE', name: 'MESSAGE' },
    { id: 'VISIT', name: 'VISIT' }
  ]
}

export const getContactResultTypes = () => {
  return [
    { id: 'INTERESTED', name: 'INTERESTED' },
    { id: 'CONTACT_LATER', name: 'CONTACT_LATER' },
    { id: 'REJECTED', name: 'REJECTED' }
  ]
}

export const getPaymentTypes = () => {
  return [
    { id: 'PAID', name: 'PAID' },
    { id: 'TOTALLY', name: 'TOTALLY' },
    { id: 'PARTIAL', name: 'PARTIAL' },
    { id: 'TRIAL', name: 'TRIAL' },
    { id: 'EVALUATION', name: 'EVALUATION' },
    { id: 'PROMOTION', name: 'PROMOTION' },
  ]
}

export const getPaymentMethods = () => {
  return [
    { id: 'PAID', name: 'PAID' },
    { id: 'CREDIT_CARD', name: 'CREDIT_CARD' },
    { id: 'DEBIT_CARD', name: 'DEBIT_CARD' },
    { id: 'WIRE_TRANSFER', name: 'WIRE_TRANSFER' },
    { id: 'DEPOSIT', name: 'DEPOSIT' },
    { id: 'CHECK', name: 'CHECK' },
    { id: 'MONEY', name: 'MONEY' },
    { id: 'BOLETO', name: 'BOLETO' },
    { id: 'PIX', name: 'PIX' }
  ]
}