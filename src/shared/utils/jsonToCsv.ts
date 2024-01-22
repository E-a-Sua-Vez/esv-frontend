export default (items) => {
  const header = Object.keys(items[0]);
  const headerString = header.join(';');
  const replacer = (key, value) => {
    return value ?? '';
  }
  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(';')
  );
  const csv = [headerString, ...rowItems].join('\r\n');
  return csv;
}