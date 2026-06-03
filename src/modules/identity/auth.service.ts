import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtPayload } from './interfaces/authenticated-user.interface';
import { SessionsRepository } from './repositories/sessions.repository';
import { UsersRepository } from './repositories/users.repository';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase();
    const existing = await this.usersRepository.findByBrandAndEmail(
      dto.brandId,
      email,
    );

    if (existing) {
      throw new ConflictException('User already exists for this brand');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersRepository.create({
      brandId: dto.brandId,
      email,
      passwordHash,
    });

    return this.toUserResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.findByBrandAndEmail(
      dto.brandId,
      email,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jti = randomUUID();
    const expiresIn = this.configService.get<string>('jwt.expiresIn', '1h')!;
    const payload: JwtPayload = {
      sub: user.id,
      brandId: user.brandId,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresAt = this.resolveExpiresAt(expiresIn);

    await this.sessionsRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(jti),
      expiresAt,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  async getProfile(userId: string, brandId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByIdAndBrand(userId, brandId);

    if (!user) {
      throw new ForbiddenException('Access denied for this tenant');
    }

    return this.toUserResponse(user);
  }

  private toUserResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      brandId: user.brandId,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private hashToken(jti: string): string {
    return createHash('sha256').update(jti).digest('hex');
  }

  private resolveExpiresAt(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/.exec(expiresIn);
    if (!match) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
