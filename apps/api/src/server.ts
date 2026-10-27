import Fastify from 'fastify'
import cors from '@fastify/cors'

import { analyzeInput, MAX_INPUT_LENGTH } from './analyze.js'
export { MAX_INPUT_LENGTH } from './analyze.js'

const isTest = process.env.NODE_ENV === 'test'

/**
 * Origins allowed to call the API from another site. CORS_ORIGIN takes a
 * comma-separated list. Without it, development allows any origin and
 * production allows none; same-origin requests work either way.
 */
function corsOrigin() {
  const configured = process.env.CORS_ORIGIN
  if (configured) return configured.split(',').map((origin) => origin.trim())
  return process.env.NODE_ENV !== 'production'
}

export function buildApp() {
  const app = Fastify({
    ajv: { customOptions: { coerceTypes: false } },
    logger: !isTest,
  })

  void app.register(cors, { origin: corsOrigin() })

  app.get('/health', async () => ({
    service: 'charAIcter-api',
    status: 'ok',
  }))

  app.post<{ Body: { text: string } }>(
    '/analyze',
    {
      schema: {
        body: {
          additionalProperties: false,
          required: ['text'],
          type: 'object',
          properties: {
            text: { maxLength: MAX_INPUT_LENGTH, type: 'string' },
          },
        },
      },
    },
    async (request) => analyzeInput(request.body.text),
  )

  return app
}

// Tests build their own app instances; only a real run starts the server.
if (!isTest) {
  const app = buildApp()
  const port = Number(process.env.PORT ?? 3000)
  try {
    await app.listen({ host: '0.0.0.0', port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}
