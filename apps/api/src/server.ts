import Fastify from 'fastify'
import cors from '@fastify/cors'

import { analyzeInput, MAX_INPUT_LENGTH } from './analyze.js'
export { MAX_INPUT_LENGTH } from './analyze.js'

export function buildApp() {
  const app = Fastify({
    ajv: { customOptions: { coerceTypes: false } },
    logger: true,
  })

  void app.register(cors, { origin: true })

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

const app = buildApp()
const port = Number(process.env.PORT ?? 3000)

if (process.env.NODE_ENV !== 'test') {
  try {
    await app.listen({ host: '0.0.0.0', port })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}
