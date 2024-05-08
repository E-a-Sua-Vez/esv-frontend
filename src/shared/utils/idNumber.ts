export const formatIdNumber = (commerce, idNumber) => {
  if (idNumber) {
    if (commerce.localeInfo.country === 'br') {
      return idNumber.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (commerce.localeInfo.country === 'cl') {
      return idNumber.replace(/^(\d{2})(\d{3})(\d{3})(\w{1})$/, '$1.$2.$3-$4')
    } else {
      return idNumber;
    }
  } else {
    return idNumber
  }
}

export const validateIdNumber = (commerce, idNumber) => {
   if (idNumber) {
    if (commerce.localeInfo.country === 'br') {
      if (/(\d{3})(\d{3})(\d{3})(\d{2})/.test(idNumber)) {
        return true;
      } else {
        return false;
      }
    } else if (commerce.localeInfo.country === 'cl') {
      if (/^(\d{2})(\d{3})(\d{3})(\w{1})$/.test(idNumber)) {
        return true;
      } else {
        return false;
      }
    } else {
      if (/^(\d{2})(\d{3})(\d{3})$/.test(idNumber)) {
        return true;
      } else {
        return false;
      }
    }
  }
}