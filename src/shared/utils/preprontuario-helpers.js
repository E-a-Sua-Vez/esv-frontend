/**
 * Helper functions to load preprontuario data into prontuario sections
 */

/**
 * Extract personal data from a FIRST_ATTENTION form
 * @param {Object} form - The form object with answers
 * @returns {Object} - Personal data object ready for PatientPersonalDataForm
 */
export const extractPersonalDataFromForm = form => {
  console.log('🔍 Extracting personal data from form:', form);

  if (!form || !form.answers || form.answers.length === 0) {
    console.log('❌ No form or answers found');
    return null;
  }

  const personalData = {};

  // Extract occupation
  const occupationAnswer = form.answers.find(answer => answer.type === 'PATIENT_OCCUPATION');
  if (occupationAnswer && occupationAnswer.answer) {
    let occupation = occupationAnswer.answer;
    if (Array.isArray(occupation)) {
      occupation = occupation[0] || '';
    }
    personalData.occupation = occupation || '';
    console.log('✅ Found occupation:', occupation);
  }

  // Extract sex
  const sexAnswer = form.answers.find(answer => answer.type === 'PATIENT_SEX');
  if (sexAnswer && sexAnswer.answer) {
    let sex = sexAnswer.answer;
    if (!Array.isArray(sex)) {
      sex = [sex];
    }
    sex = sex[0] || undefined;
    personalData.sex = sex || '';
    console.log('✅ Found sex:', sex);
  }

  // Extract civil status
  const civilStatusAnswer = form.answers.find(answer => answer.type === 'PATIENT_CIVIL_STATUS');
  if (civilStatusAnswer && civilStatusAnswer.answer) {
    let civilStatus = civilStatusAnswer.answer;
    if (!Array.isArray(civilStatus)) {
      civilStatus = [civilStatus];
    }
    civilStatus = civilStatus[0] || undefined;
    personalData.civilStatus = civilStatus || '';
    console.log('✅ Found civil status:', civilStatus);
  }

  const result = Object.keys(personalData).length > 0 ? personalData : null;
  console.log('📤 Personal data extraction result:', result);
  return result;
};

/**
 * Extract anamnese data (personal history) from a FIRST_ATTENTION form
 * @param {Object} form - The form object with answers
 * @returns {Object} - Habits aux object ready for PatientAnamneseForm
 */
export const extractAnamneseDataFromForm = form => {
  console.log('🔍 Extracting anamnese data from form:', form);

  if (!form || !form.answers || form.answers.length === 0) {
    console.log('❌ No form or answers found');
    return {};
  }

  const habitsAux = {};

  const personalHistoryAnswers = form.answers.filter(answer => answer.type === 'PERSONAL_HISTORY');
  console.log('📋 Found personal history answers:', personalHistoryAnswers.length);

  if (personalHistoryAnswers && personalHistoryAnswers.length > 0) {
    personalHistoryAnswers.forEach(element => {
      if (element.id) {
        habitsAux[element.id] = { ...element.answer, ...element };
        console.log('✅ Added habit:', element.id, habitsAux[element.id]);
      }
    });
  }

  console.log('📤 Anamnese data extraction result:', habitsAux);
  return habitsAux;
};

/**
 * Check if a form can be loaded to prontuario
 * @param {Object} form - The form object
 * @returns {boolean} - True if form can be loaded
 */
export const canLoadFormToProntuario = form => {
  if (!form) return false;

  // Only FIRST_ATTENTION and PRE_ATTENTION forms can be loaded
  if (form.type !== 'FIRST_ATTENTION' && form.type !== 'PRE_ATTENTION') {
    return false;
  }

  // Check if form has answers
  if (!form.answers || form.answers.length === 0) {
    return false;
  }

  // Check if form is already loaded
  if (form.loadedToProntuario === true) {
    return false;
  }

  return true;
};

/**
 * Get forms that can be loaded to prontuario
 * @param {Array} forms - Array of form objects
 * @returns {Array} - Filtered array of forms that can be loaded
 */
export const getLoadableForms = forms => {
  if (!forms || !Array.isArray(forms)) {
    return [];
  }

  return forms.filter(form => canLoadFormToProntuario(form));
};

/**
 * Sort forms by date (most recent first)
 * @param {Array} forms - Array of form objects
 * @returns {Array} - Sorted array
 */
export const sortFormsByDate = forms => {
  if (!forms || !Array.isArray(forms)) {
    return [];
  }

  return [...forms].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA; // Most recent first
  });
};

/**
 * Filter forms by type
 * @param {Array} forms - Array of form objects
 * @param {string} type - Form type (FIRST_ATTENTION, PRE_ATTENTION)
 * @returns {Array} - Filtered array
 */
export const filterFormsByType = (forms, type) => {
  if (!forms || !Array.isArray(forms)) {
    return [];
  }

  return forms.filter(form => form.type === type);
};
