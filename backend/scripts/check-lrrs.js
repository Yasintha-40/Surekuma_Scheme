require('dotenv').config({ quiet: true });
const registry = require('../services/lrrsRegistry');

// Explicit email argument only; prints no member data, passwords, or raw driver errors.
const email = process.argv[2];
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) {
  console.error('Usage: node scripts/check-lrrs.js member@example.com');
  process.exitCode = 1;
} else {
  registry.findRegistration(email)
    .then(number => console.log(number ? 'LRRS connection OK: one registration found.' : 'LRRS connection OK: no matching TDL registration.'))
    .catch(error => { console.error(error.code, error.message, error.driverCode ? `Driver code: ${error.driverCode}` : ''); process.exitCode = 1; })
    .finally(() => registry.close().catch(() => {}));
}
