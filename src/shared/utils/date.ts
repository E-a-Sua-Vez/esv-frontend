export const dateYYYYMMDD = (date: Date) => {
  if (date && date !== undefined && date.toString() !== '') {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}

export const getDate = (date, timeZoneIn) => {
  const dateCorrected = new Date(
  new Date(date).toLocaleString('en-US', {
    timeZone: timeZoneIn,
  }));
  return dateCorrected.toLocaleString('en-GB').slice(0,10);
}