'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const findings = [];
for (const file of tracked) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) findings.push(`${file}: environment file is tracked`);
  const target = path.join(root, file);
  if (!fs.existsSync(target) || fs.statSync(target).size > 2_000_000) continue;
  const data = fs.readFileSync(target);
  if (/BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/.test(data)) findings.push(`${file}: private key material`);
  if (/\bsk-[A-Za-z0-9_-]{20,}/.test(data)) findings.push(`${file}: API-key-shaped value`);
}
const launcher = fs.readFileSync(path.join(root, 'start.sh'), 'utf8');
for (const forbidden of [/kill\s+-9/, /\bnpm\s+install\b/, /\bcreatedb\b/, /db\/seed\.sql/, /db\/schema\.sql/]) {
  if (forbidden.test(launcher)) findings.push(`start.sh: destructive or non-reproducible command ${forbidden}`);
}
const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
if (!/generatedEnabled/.test(server) || !/NODE_ENV !== 'production'/.test(server)) findings.push('backend/server.js: generated routes are not production-gated');
if (findings.length) { console.error(findings.join('\n')); process.exit(1); }
console.log(`repository safety audit passed (${tracked.length} tracked paths)`);
