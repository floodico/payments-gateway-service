import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthService } from './auth.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { UsersRepository } from './repositories/users.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let sessionsRepository: jest.Mocked<SessionsRepository>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const user: UserEntity = {
    id: 'user-1',
    brandId: 'brand-a',
    email: 'user@example.com',
    passwordHash: '',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    user.passwordHash = await bcrypt.hash('password123', 12);

    usersRepository = {
      findByBrandAndEmail: jest.fn(),
      findByIdAndBrand: jest.fn(),
      create: jest.fn(),
    };

    sessionsRepository = {
      create: jest.fn().mockResolvedValue({}),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.expiresIn') return '1h';
        return undefined;
      }),
    };

    service = new AuthService(
      usersRepository,
      sessionsRepository,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  describe('register', () => {
    it('hashes password and creates user', async () => {
      usersRepository.findByBrandAndEmail.mockResolvedValue(null);
      usersRepository.create.mockImplementation(async (data) => ({
        ...user,
        ...data,
        id: 'new-user-id',
      }));

      const result = await service.register({
        brandId: 'brand-a',
        email: 'User@Example.com',
        password: 'password123',
      });

      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brandId: 'brand-a',
          email: 'user@example.com',
        }),
      );
      expect(
        await bcrypt.compare(
          'password123',
          usersRepository.create.mock.calls[0][0].passwordHash!,
        ),
      ).toBe(true);
      expect(result).toEqual({
        id: 'new-user-id',
        brandId: 'brand-a',
        email: 'user@example.com',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    });

    it('throws when user already exists for brand', async () => {
      usersRepository.findByBrandAndEmail.mockResolvedValue(user);

      await expect(
        service.register({
          brandId: 'brand-a',
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns access token for valid credentials', async () => {
      usersRepository.findByBrandAndEmail.mockResolvedValue(user);

      const result = await service.login({
        brandId: 'brand-a',
        email: 'user@example.com',
        password: 'password123',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          brandId: user.brandId,
          jti: expect.any(String),
        }),
      );
      expect(sessionsRepository.create).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'signed-jwt',
        tokenType: 'Bearer',
        expiresIn: '1h',
      });
    });

    it('rejects invalid password', async () => {
      usersRepository.findByBrandAndEmail.mockResolvedValue(user);

      await expect(
        service.login({
          brandId: 'brand-a',
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('returns user when tenant matches', async () => {
      usersRepository.findByIdAndBrand.mockResolvedValue(user);

      const result = await service.getProfile(user.id, user.brandId);

      expect(result.email).toBe(user.email);
    });

    it('forbids when user is not in token tenant', async () => {
      usersRepository.findByIdAndBrand.mockResolvedValue(null);

      await expect(
        service.getProfile(user.id, 'brand-b'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
