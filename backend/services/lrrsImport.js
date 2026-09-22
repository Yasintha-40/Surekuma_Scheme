const prepareImport = rows => {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Expected a non-empty LRRS JSON array.');
  const members = new Map();
  let skipped = 0;
  let duplicates = 0;
  for (const row of rows) {
    const email = typeof row?.email === 'string' ? row.email.trim().toLowerCase() : '';
    const registration = typeof row?.reg_no === 'string' ? row.reg_no.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150 ||
        !registration || registration.length > 100 || /[\x00-\x1f\x7f]/.test(registration)) {
      skipped++;
      continue;
    }
    if (!members.has(email)) members.set(email, new Set());
    const numbers = members.get(email);
    if (numbers.has(registration)) duplicates++;
    numbers.add(registration);
  }
  const records = [...members].flatMap(([email, numbers]) => [...numbers].map(number => [email, number]));
  if (!records.length) throw new Error('No valid email and registration pairs found; existing data has not been changed.');
  return { records, summary: { total: rows.length, importedPairs: records.length, uniqueEmails: members.size,
    skipped, duplicates, ambiguousEmails: [...members.values()].filter(numbers => numbers.size > 1).length } };
};

module.exports = { prepareImport };
