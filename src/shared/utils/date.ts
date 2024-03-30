export const dateYYYYMMDD = (date: Date) => {
  if (date && date !== undefined && date.toString() !== '') {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}

export const getDate = (dateIn, timeZoneIn) => {
  let date = dateIn;
  try  {
    date = new Date(dateIn.toDate().toString()).toISOString();
  } catch (error) {
    date = dateIn;
  }
  const [year, month, day] = date.slice(0,10).split('-');
  const returnDate = `${day}/${month}/${year}`;
  return returnDate;
}