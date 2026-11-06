import { Command } from 'commander';
import { mkdir } from 'node:fs/promises';
import { parse } from 'node:path';

const program = new Command();

program
  .helpOption('-H, --help', 'показати довідку')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до теки шляху');

  program.parse();
  const options = program.opts();

  try {
    await mkdir(options.cache, { recursive: true });
  } catch (error) {
    console.error('Не вдалося створити теку кешу')
    process.exit(1);
  }
  console.log(options);