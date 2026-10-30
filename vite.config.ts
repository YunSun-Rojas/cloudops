import { loadEnv, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import githubAuditHandler from './api/github-audit';

interface LocalApiRequest {
  method?: string;
  body: unknown;
}

interface LocalApiResponse {
  status(code: number): LocalApiResponse;
  json(body: unknown): void;
}

function localGithubAuditPlugin(): Plugin {
  return {
    name: 'local-github-audit-function',
    configureServer(server) {
      server.middlewares.use('/api/github-audit', (request, response) => {
        const apiRequest = request as typeof request & {
          method?: string;
          setEncoding(encoding: string): void;
          on(event: 'data', listener: (chunk: string) => void): void;
          on(event: 'end', listener: () => void): void;
        };

        if (apiRequest.method !== 'POST') {
          response.statusCode = 405;
          response.setHeader('Allow', 'POST');
          response.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
          return;
        }

        apiRequest.setEncoding('utf8');
        let body = '';
        let bodyTooLarge = false;
        apiRequest.on('data', (chunk) => {
          if (body.length + chunk.length > 500_000) {
            bodyTooLarge = true;
            return;
          }
          body += chunk;
        });
        apiRequest.on('end', () => {
          if (bodyTooLarge) {
            response.statusCode = 413;
            response.end(JSON.stringify({ error: 'La solicitud es demasiado grande.' }));
            return;
          }

          let parsedBody: unknown;
          try {
            parsedBody = JSON.parse(body);
          } catch {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'El cuerpo de la solicitud debe ser JSON válido.' }));
            return;
          }

          let statusCode = 200;
          const apiResponse: LocalApiResponse = {
            status(code) {
              statusCode = code;
              return apiResponse;
            },
            json(payload) {
              response.statusCode = statusCode;
              response.setHeader('Content-Type', 'application/json; charset=utf-8');
              response.end(JSON.stringify(payload));
            },
          };

          void githubAuditHandler(
            { method: apiRequest.method, body: parsedBody } satisfies LocalApiRequest,
            apiResponse,
          );
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'GEMINI_');
  const runtime = globalThis as typeof globalThis & {
    process: { env: Record<string, string | undefined> };
  };
  if (env.GEMINI_API_KEY) {
    runtime.process.env.GEMINI_API_KEY ??= env.GEMINI_API_KEY;
  }

  return {
    plugins: [react(), localGithubAuditPlugin()],
    server: {
      port: 5173,
      open: true,
    },
  };
});
