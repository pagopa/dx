// Local HTTP service for eval source checks: /ok answers 200, everything else 404.
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 8787);

createServer((request, response) => {
  const ok = new URL(request.url, "http://localhost").pathname === "/ok";
  response.writeHead(ok ? 200 : 404, { "content-type": "text/plain" });
  response.end(request.method === "HEAD" ? undefined : ok ? "ok" : "not found");
}).listen(port, "127.0.0.1");
