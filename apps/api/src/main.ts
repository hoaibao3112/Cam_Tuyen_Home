import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const frontendUrl = process.env.FRONTEND_URL
  const allowedOrigins = [
    'http://localhost:3000',
    ...(frontendUrl ? [frontendUrl] : []),
  ]

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phep request khong co origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  })

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  logger.log(`API dang chay tai cong ${port}`)
  logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`)
}

bootstrap()
