// jobs/reseteosCron.js
const cron = require('node-cron');
const { runPerl } = require('../services/perlRemote');

let running = false; // evita solapamientos

function startReseteosCron() {
  const expr = process.env.PERL_CRON || '*/8 * * * *';

  cron.schedule(expr, async () => {
    if (running) return console.warn('[CRON] en curso, se omite esta corrida');
    running = true;
    const t0 = Date.now();
    try {
      const r = await runPerl();
      console.log(`[CRON] rc=${r.code} dur=${Date.now()-t0}ms out=${(r.out||'').slice(0,160).replace(/\n/g,' ')}`);
    } catch (e) {
      console.error('[CRON] error:', e.message);
    } finally {
      running = false;
    }
  }, { timezone: 'America/Mexico_City' });

  console.log(`CRON Reseteos activo: ${expr}`);
}

module.exports = { startReseteosCron };
