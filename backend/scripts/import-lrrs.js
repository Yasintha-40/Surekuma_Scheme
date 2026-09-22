const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { prepareImport } = require('../services/lrrsImport');

async function main() {
  const [file, mode, output] = process.argv.slice(2);
  if (!file || (mode && !['--dry-run', '--sql'].includes(mode)) || (mode === '--sql' && !output)) {
    throw new Error('Usage: node scripts/import-lrrs.js input.json [--dry-run | --sql output.sql]');
  }
  const { records, summary } = prepareImport(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8').replace(/^\uFEFF/, '')));
  console.log(JSON.stringify(summary, null, 2));
  if (mode === '--dry-run') return;
  const dump = fs.readFileSync(path.join(__dirname, '../../surekuma_db.sql'), 'utf8');
  const schemas = ['applicant_lrrs_registrations', 'lrrs_imported_registrations'].map(table => {
    const statement = dump.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\([\\s\\S]*?;`));
    if (!statement) throw new Error(`Missing ${table} schema in surekuma_db.sql`);
    return statement[0];
  });
  if (mode === '--sql') {
    // Hex literals preserve source strings independently of MySQL quoting modes.
    const literal = value => `CONVERT(X'${Buffer.from(value, 'utf8').toString('hex')}' USING utf8mb4)`;
    const inserts = records.map(row => `(${row.map(literal).join(', ')})`).join(',\n');
    fs.writeFileSync(path.resolve(output), `${schemas.join('\n')}\nSTART TRANSACTION;\nDELETE FROM lrrs_imported_registrations;\nINSERT INTO lrrs_imported_registrations (email, registration_no) VALUES\n${inserts};\nCOMMIT;\n`);
    console.log('SQL import file prepared. It contains private registration data.');
    return;
  }
  const db = require('../config/db');
  let connection;
  try {
    connection = await db.getConnection();
    for (const schema of schemas) await connection.query(schema);
    await connection.beginTransaction();
    // Replace the selected snapshot atomically so deleted or changed entries do not linger.
    await connection.execute('DELETE FROM lrrs_imported_registrations');
    for (let offset = 0; offset < records.length; offset += 250) {
      const batch = records.slice(offset, offset + 250);
      await connection.execute(`INSERT INTO lrrs_imported_registrations (email, registration_no) VALUES ${batch.map(() => '(?, ?)').join(', ')}`, batch.flat());
    }
    await connection.commit();
    console.log('Import complete. Set LRRS_ENABLED=true and LRRS_SOURCE=import in backend/.env, then restart the backend.');
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
    await db.end();
  }
}

main().catch(error => {
  console.error(`LRRS import failed: ${error.code || error.message}`);
  process.exitCode = 1;
});
