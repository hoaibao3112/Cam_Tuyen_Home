import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as express from 'express'

const server = express()
let isInitialized = false

export async function bootstrapNest() {
  if (isInitialized) return server

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server))

  // Validate tất cả request body tự động theo DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Loại bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // Báo lỗi nếu client gửi field lạ
      transform: true,       // Tự động convert type (string → number, v.v.)
    }),
  )

  app.enableCors({
    origin: '*', // Hỗ trợ CORS cho Vercel
  })

  await app.init()
  isInitialized = true
  return server
}

// Khởi chạy local ở môi trường dev hoặc chạy standalone trên Render
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = process.env.PORT || 3001
  NestFactory.create(AppModule).then(async (app) => {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
    })
    await app.listen(port)
    console.log(`API đang chạy tại cổng ${port}`)
  })
}

// Export default handler phục vụ Vercel Serverless
export default async (req: any, res: any) => {
  await bootstrapNest()
  server(req, res)
}

