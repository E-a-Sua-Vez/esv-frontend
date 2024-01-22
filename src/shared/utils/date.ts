export const dateYYYYMMDD = (date: Date) => {
  if (date !== undefined) {
    return new Date(date).toISOString().slice(0,10);
  }
  return undefined;
}