export const dateYYYYMMDD = (date: Date) => {
  if (date && date !== undefined && date.toString() !== '') {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}

export const getDate = (date, timeZoneIn) => {
  const [year, month, day] = date.toISOString().slice(0,10).split('-');
  return `${day}/${month}/${year}`;
}