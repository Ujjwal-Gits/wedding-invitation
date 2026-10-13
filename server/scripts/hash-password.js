// Prints an argon2id hash for ADMIN_PASSWORD_HASH in server/.env.
// Interactive:      npm run hash-password                 (prompts, input hidden)
// Non-interactive:  printf '%s' "$PW" | npm run --silent hash-password -- --raw
//                   (reads the password from stdin; --raw prints only the hash, nothing else)
// Never pass the password as a command-line argument (it would show in the process list).
import { hash } from '@node-rs/argon2';
import { createInterface } from 'node:readline';

const raw = process.argv.includes('--raw');

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = '';
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, '');
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes('Password')) rl.output.write(s); };
    rl.question('Password (min 12 characters): ', (pw) => { rl.close(); process.stdout.write('\n'); resolve(pw); });
  });
}

const pw = await readPassword();
if (pw.length < 12) {
  console.error('Use at least 12 characters (a short phrase is easiest to remember).');
  process.exit(1);
}
// argon2id, OWASP-recommended parameters: 19 MiB memory, 2 iterations, 1 lane.
const h = await hash(pw, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
if (raw) process.stdout.write(`${h}\n`);
else console.log(`\nPut this line in server/.env:\n\nADMIN_PASSWORD_HASH='${h}'\n`);
