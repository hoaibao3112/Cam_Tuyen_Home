import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const apiKey = request.headers['x-api-key']

    // KHONG fallback ve key cung trong source code - key nay da tung bi commit len git
    // truoc day va co the da lo. Neu thieu env, server phai fail ro rang.
    const validKey = process.env.ADMIN_API_KEY

    if (!validKey) {
      throw new InternalServerErrorException('ADMIN_API_KEY chưa được cấu hình')
    }

    if (!apiKey || apiKey !== validKey) {
      throw new UnauthorizedException('API key không hợp lệ')
    }

    return true
  }
}
