// Read-only connectivity check using connection settings from the supplied PHP file.
// Does not execute PHP, expose credentials, or print applicant data.
const fs = require('node:fs');
const sql = require('mssql');

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/check-lrrs-php.js path/to/test_sqlsrv_2.php');
  const source = fs.readFileSync(file, 'utf8');
  const setting = name => {
    const match = source.match(new RegExp(`"${name}"\\s*=>\\s*"([^"\\r\\n]*)"`));
    if (!match) throw new Error(`Missing PHP connection setting: ${name}`);
    return match[1];
  };
  const serverMatch = source.match(/\$serverName\s*=\s*"([^"\r\n]+)"/);
  if (!serverMatch) throw new Error('Missing PHP serverName');
  const [server, instanceName] = serverMatch[1].split(/\\+/);
  const pool = new sql.ConnectionPool({
    server,
    database: setting('Database'),
    user: setting('Uid'),
    password: setting('PWD'),
    connectionTimeout: 10000,
    requestTimeout: 15000,
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: /^(yes|true|1)$/i.test(setting('Encrypt')),
      trustServerCertificate: /^(yes|true|1)$/i.test(setting('TrustServerCertificate')),
      readOnlyIntent: true,
    },
  });
  pool.on('error', () => {});
  try {
    await pool.connect();
    console.log('SQL Server connection succeeded using the PHP settings.');
    // Same joins and active year/TDL restrictions as the provided PHP query.
    const result = await pool.request().query(`SELECT TOP (1)
      b.RegistrationNumber, d.EmailAddress
      FROM OnlineDocumentStatus a
      INNER JOIN RegistrationInformation b
        ON a.FileNo = b.FileNo AND a.ModuleCode = b.ModuleCode AND a.SubModuleCode = b.SubModuleCode
      INNER JOIN ApplicationOffice c
        ON a.FileNo = c.FileNo AND a.ModuleCode = c.ModuleCode AND a.SubModuleCode = c.SubModuleCode
      INNER JOIN ApplicationCommon d
        ON a.FileNo = d.FileNo AND a.ModuleCode = d.ModuleCode AND a.SubModuleCode = d.SubModuleCode
      WHERE a.IsTDL = 1 AND a.year BETWEEN 2023 AND 2025`);
    console.log(result.recordset.length ? 'Read succeeded: matching data is available.' : 'Read succeeded: no data matched the PHP filters.');
  } catch (error) {
    console.error(`LRRS check failed: ${error.code || 'UNKNOWN'}${error.originalError?.code ? ` (${error.originalError.code})` : ''}`);
    process.exitCode = 1;
  } finally {
    await pool.close();
  }
}

main().catch(() => { console.error('Unable to read PHP connection settings. Check the file path and format.'); process.exitCode = 1; });
