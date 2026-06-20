import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key']

    const validKey = process.env.ADMIN_API_KEY || 'ynuquan_secret_api_key_2026'

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key không hợp lệ')
    }

    return true
  }
}
