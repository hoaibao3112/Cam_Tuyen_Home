import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key']

    const validKey = process.env.ADMIN_API_KEY || 'camtuyen_secret_api_key_2026'

    if (!validKey) {
      throw new InternalServerErrorException('ADMIN_API_KEY chưa được cấu hình')
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key không hợp lệ')
    }

    return true
  }
}
