import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    const userId = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];

    if (!userId) {
      throw new UnauthorizedException('Missing X-User-ID header');
    }

    request.user = { 
      userId: userId,
      role: role 
    };

    return true;
  }
}