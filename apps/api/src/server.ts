import Fastify from 'fastify'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })
const port = Number(process.env.PORT ?? 3000)

await app.register(cors, { origin: true })

app.get('/health', async () => ({
  service: 'charAIcter-api',
  status: 'ok',
}))

try {
  await app.listen({ host: '0.0.0.0', port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
