// Local-only static server for this bundled, trusted publication.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.epub':'application/epub+zip','.json':'application/json'};
http.createServer((req,res) => {
  let name;
  try { name = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const target = path.resolve(root, '.'+(name === '/' ? '/index.html' : name));
  if (!target.startsWith(root+path.sep) || name.split('/').some(p=>p.startsWith('.')) || !['GET','HEAD'].includes(req.method)) { res.writeHead(403).end(); return; }
  fs.readFile(target,(err,data)=> {
    if (err) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type',types[path.extname(target)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(Number(process.env.PORT || 4173),'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+(process.env.PORT || 4173)));
