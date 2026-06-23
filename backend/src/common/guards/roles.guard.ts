import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const userId = (user as { userId?: string })?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const dbUser = await this.userModel.findById(userId).select('role').exec();
    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }
    return requiredRoles.includes(dbUser.role);
  }
}
