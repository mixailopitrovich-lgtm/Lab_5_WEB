import { Command } from 'commander';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import superagent from 'superagent';
import { parse } from 'node:path';
import http from 'node:http';
import path from 'node:path';

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
 
  function send(res, code, message, extraHeaders = {}){
     res.writeHead(code, {'Content-Type': 'text/plain; charset=utf-8',
        ...extraHeaders,})
        res.end(message);
  }

  async function readFromCache(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function fetchFromHttpCat(code) {
  try {
    const response = await superagent
      .get(`https://http.cat/${code}`)
      .buffer(true)
      .parse(superagent.parse.image);
    return response.body;
  } catch (error) {
    return null;
  }
}

function sendImage(res, image, source) {
  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': image.length,
    'X-Image-Source': source,
  });
  res.end(image);
}

  const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
      send(res, 405, 'Метод не дозволено', { Allow: 'GET, PUT, DELETE' });
      return;
    }

    const url = new URL(req.url, 'http://localhost');
    const match = url.pathname.match(/^\/(\d{3})$/);
    if (!match) {
      send(res, 404, 'Невірний шлях: очікується /<код стану>, наприклад /404');
      return;
    }

    const code = match[1];
    const filePath = path.join(options.cache, `${code}.jpg`);

   if (req.method === 'GET') {
  let image = await readFromCache(filePath);
  if (image) {
    sendImage(res, image, 'cache');
    return;
  }

  image = await fetchFromHttpCat(code);
  if (!image) {
    send(res, 404, 'Картинку не знайдено');
    return;
  }

  await writeFile(filePath, image);
  sendImage(res, image, 'http.cat');
  return;
}

send(res, 200, `Заглушка: ${req.method} ${code}`);
  } catch (error) {
    send(res, 500, 'Внутрішня помилка сервера');
  }
});

server.listen(Number(options.port), options.host, () => {
  console.log(`Сервер запущено: http://${options.host}:${options.port}`);
});
