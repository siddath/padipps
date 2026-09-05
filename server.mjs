/** Local preview: read-only assets, bound to loopback. Deploy the same files on a static host. */
import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4177);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('PORT must be an integer from 1024 to 65535.');
const allowed = new Set(['index.html','app.js','styles.css','appearance.js','motion.js','engine.js','content.js','catalog.js','pack-engine.js','backup-engine.js','packs-ui.js','notebook-ui.js','focus-ui.js','focus-engine.js','focus.css','reflections.js','assets/padipps-icon.webp','vendor/gsap-3.15.0.min.js','packs/starter.json']);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp'};
http.createServer(async (req,res) => {
  if (![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)) {res.writeHead(403);res.end('Loopback host required');return;}
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  let file;
  try { const pathname=decodeURIComponent(new URL(req.url,`http://${req.headers.host}`).pathname); file=pathname==='/'?'index.html':pathname.slice(1); } catch {res.writeHead(400);res.end();return;}
  if (!allowed.has(file)) {res.writeHead(404);res.end('Not found');return;}
  try {
    const target=await realpath(path.join(root,file));
    if(!target.startsWith(root+path.sep))throw Error('Outside app');
    const body=await readFile(target);
    res.writeHead(200,{'Content-Type':types[path.extname(target)],'Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Padipps: http://127.0.0.1:${port}`));
