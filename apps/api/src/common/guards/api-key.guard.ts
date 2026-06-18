import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key']

    const validKey = process.env.ADMIN_API_KEY
    if (!validKey) {
      throw new UnauthorizedException('Server chưa cấu hình ADMIN_API_KEY')
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key không hợp lệ')
    }

    return true
  }
}
