export const dateYYYYMMDD = (date: Date) => {
  if (date && date !== undefined && date.toString() !== '') {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}

export const getDate = (date, timeZoneIn) => {
  console.log("🚀 ~ getDate ~ date:", date);
  const dateCorrected = new Date(
  new Date(date).toLocaleString('en-US', {
    timeZone: timeZoneIn,
  }));
  console.log("🚀 ~ getDate ~ dateCorrected:", dateCorrected);
  const [year, month, day] = dateCorrected.toISOString().slice(0,10).split('-');
  const returnDate = `${day}/${month}/${year}`;
  console.log("🚀 ~ getDate ~ returnDate:", returnDate);
  return returnDate;
}