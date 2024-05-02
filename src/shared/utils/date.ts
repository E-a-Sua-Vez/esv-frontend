export const dateYYYYMMDD = (date: Date) => {
  if (date && date !== undefined && date.toString() !== '') {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}

export const getDate = (dateIn, timeZoneIn) => {
  if (dateIn) {
    let date = dateIn;
    try  {
      date = new Date(dateIn.toDate().toString()).toISOString();
    } catch (error) {
      date = new Date(dateIn).toISOString();
    }
    const [year, month, day] = date.slice(0,10).split('-');
    const returnDate = `${day}/${month}/${year}`;
    return returnDate;
  }
}

export const addPeriodToDate = (date, {years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0})  => {
  let new_date = new Date(date);
  new_date.setFullYear(new_date.getFullYear() + years);
  new_date.setMonth(new_date.getMonth() + months);
  new_date.setDate(new_date.getDate() + days);
  new_date.setHours(new_date.getHours() + hours);
  new_date.setMinutes(new_date.getMinutes() + minutes);
  new_date.setSeconds(new_date.getSeconds() + seconds);
  return new_date;
}