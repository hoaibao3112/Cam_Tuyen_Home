import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Validate tất cả request body tự động theo DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Loại bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu client gửi field lạ
      transform: true,       // Tự động convert type (string → number, v.v.)
    }),
  )

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  })

  await app.listen(process.env.PORT || 3001)
  console.log(`API đang chạy tại http://localhost:${process.env.PORT || 3001}`)
}
bootstrap()
