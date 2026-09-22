const sql = require('mssql');
const db = require('../config/db');

const enabled = () => process.env.LRRS_ENABLED === 'true';

const registryError = (code, message, status = 503) =>
  Object.assign(new Error(message), { code, status });

let poolPromise;

/* =========================================================
   LRRS SQL SERVER CONNECTION
   ========================================================= */

const getPool = async () => {
  if (!poolPromise) {
    if (
      !process.env.LRRS_SERVER ||
      !process.env.LRRS_DATABASE ||
      !process.env.LRRS_USER ||
      !process.env.LRRS_PASSWORD
    ) {
      throw registryError(
        'LRRS_UNAVAILABLE',
        'LRRS registration service is not configured. Please contact your administrator.'
      );
    }

    const pool = new sql.ConnectionPool({
      server: process.env.LRRS_SERVER,
      database: process.env.LRRS_DATABASE,
      user: process.env.LRRS_USER,
      password: process.env.LRRS_PASSWORD,

      ...(process.env.LRRS_PORT
        ? { port: Number(process.env.LRRS_PORT) }
        : {}),

      connectionTimeout: 10000,
      requestTimeout: 15000,

      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },

      options: {
        ...(!process.env.LRRS_PORT && process.env.LRRS_INSTANCE
          ? { instanceName: process.env.LRRS_INSTANCE }
          : {}),

        encrypt: process.env.LRRS_ENCRYPT !== 'false',

        trustServerCertificate:
          process.env.LRRS_TRUST_SERVER_CERTIFICATE === 'true',

        readOnlyIntent: true,
      },
    });

    pool.on('error', () => {
      // Prevent credentials or sensitive connection
      // information from being exposed.
    });

    poolPromise = pool.connect().catch(async (error) => {
      poolPromise = undefined;

      await pool.close().catch(() => {});

      throw Object.assign(
        registryError(
          'LRRS_UNAVAILABLE',
          'LRRS is temporarily unavailable. Please try again later.'
        ),
        {
          driverCode: error.code,
        }
      );
    });
  }

  return poolPromise;
};

/* =========================================================
   MEMBER LOOKUP QUERY

   Purpose:
   1. Find the entered email in ApplicationCommon
   2. Match it with RegistrationInformation
   3. Return the registration number

   ApplicationOffice is NOT required for email verification.
   ========================================================= */

const MEMBER_QUERY = `
SELECT DISTINCT TOP (2)
    LTRIM(RTRIM(b.RegistrationNumber)) AS RegistrationNumber

FROM dbo.ApplicationCommon d

INNER JOIN dbo.RegistrationInformation b
    ON d.FileNo = b.FileNo
    AND d.ModuleCode = b.ModuleCode
    AND d.SubModuleCode = b.SubModuleCode

WHERE
    LOWER(LTRIM(RTRIM(d.EmailAddress))) = @email

    AND NULLIF(
        LTRIM(RTRIM(b.RegistrationNumber)),
        ''
    ) IS NOT NULL
`;

/* =========================================================
   SELECT ONE REGISTRATION
   ========================================================= */

const selectRegistration = (rows) => {
  const numbers = [
    ...new Set(
      rows
        .map((row) =>
          String(row.RegistrationNumber || '').trim()
        )
        .filter(Boolean)
    ),
  ];

  // No registration found
  if (!numbers.length) {
    return null;
  }

  // Same email belongs to multiple registrations
  if (numbers.length > 1) {
    throw registryError(
      'LRRS_AMBIGUOUS',
      'Multiple LRRS registrations use this email. Please contact SLTDA to confirm the correct registration.',
      409
    );
  }

  // Invalid registration number
  if (numbers[0].length > 100) {
    throw registryError(
      'LRRS_INVALID_RECORD',
      'Your LRRS registration needs administrator attention.',
      409
    );
  }

  return numbers[0];
};

/* =========================================================
   FIND REGISTRATION BY EMAIL
   ========================================================= */

const findRegistration = async (email) => {
  try {
    if (!email || typeof email !== 'string') {
      throw registryError(
        'LRRS_INVALID_EMAIL',
        'A valid email address is required.',
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    /* -----------------------------------------------------
       IMPORTED LRRS DATA
       ----------------------------------------------------- */

    if (process.env.LRRS_SOURCE === 'import') {
      const [rows] = await db.execute(
        `
        SELECT
            registration_no AS RegistrationNumber
        FROM lrrs_imported_registrations
        WHERE LOWER(TRIM(email)) = ?
        LIMIT 2
        `,
        [normalizedEmail]
      );

      return selectRegistration(rows);
    }

    /* -----------------------------------------------------
       CHECK SOURCE CONFIGURATION
       ----------------------------------------------------- */

    if (
      process.env.LRRS_SOURCE &&
      process.env.LRRS_SOURCE !== 'sqlserver'
    ) {
      throw registryError(
        'LRRS_CONFIGURATION',
        'Unknown LRRS source. Please contact your administrator.'
      );
    }

    /* -----------------------------------------------------
       SQL SERVER
       ----------------------------------------------------- */

    const pool = await getPool();

    const result = await pool
      .request()
      .input(
        'email',
        sql.NVarChar(150),
        normalizedEmail
      )
      .query(MEMBER_QUERY);

    return selectRegistration(result.recordset);

  } catch (error) {
    if (error.code?.startsWith('LRRS_')) {
      throw error;
    }

    throw Object.assign(
      registryError(
        'LRRS_UNAVAILABLE',
        'LRRS is temporarily unavailable. Please try again later.'
      ),
      {
        driverCode: error.code,
      }
    );
  }
};

/* =========================================================
   CLOSE CONNECTION
   ========================================================= */

const close = async () => {
  const pending = poolPromise;

  poolPromise = undefined;

  if (pending) {
    const pool = await pending;
    await pool.close();
  }
};

/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {
  enabled,
  findRegistration,
  selectRegistration,
  MEMBER_QUERY,
  close,
};