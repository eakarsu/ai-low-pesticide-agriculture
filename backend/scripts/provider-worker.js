'use strict';

const pool = require('../db');
const { workOnce } = require('../services/providers');

const once = process.argv.includes('--once') || process.env.WORKER_ONCE === 'true';
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

async function main() {
  do {
    const result = await workOnce(pool);
    if (result) console.log(JSON.stringify(result));
    if (once) break;
    if (!result) await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (!stopping);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end();
  process.exitCode = 1;
});
