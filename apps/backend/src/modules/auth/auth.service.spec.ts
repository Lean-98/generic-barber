import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

/**
 * Test Unitario: AuthService
 */
describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: PrismaServiceMock;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mailServiceMock: { sendPasswordResetEmail: jest.Mock; sendTwoFactorCode: jest.Mock };

  const mockUser = {
    usuario: 'admin',
    email: 'admin@test.com',
    hashPass: '$2b$10$hashedpassword',
    rol: 'ADMIN',
    idPersona: 1,
  };

  const mockPersona = {
    idPersona: 1,
    nombre: 'Admin',
    apellido: 'Test',
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();
    mailServiceMock = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendTwoFactorCode: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when valid by username', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('admin', 'admin123');

      expect(result).toBeDefined();
      expect(result!.usuario).toBe('admin');
      expect(result).not.toHaveProperty('hashPass');
    });

    it('should return user without password when valid by email', async () => {
      prismaMock.usuarioWeb.findUnique
        .mockResolvedValueOnce(null) // first call by username
        .mockResolvedValueOnce(mockUser); // second call by email

      const result = await service.validateUser('admin@test.com', 'admin123');

      expect(result).toBeDefined();
      expect(result!.usuario).toBe('admin');
      expect(result).not.toHaveProperty('hashPass');
    });

    it('should return null when user not found', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('admin', 'admin123');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should require 2FA and email a code when credentials are valid and there is no trusted device', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);

      const dto: LoginDto = { login: 'admin', password: 'admin123' };
      const result = await service.login(dto);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.login).toBe('admin');
      expect(result).not.toHaveProperty('access_token');
      expect(prismaMock.usuarioWeb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario: 'admin' },
          data: expect.objectContaining({
            twoFactorCodeHash: expect.any(String),
            twoFactorCodeExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mailServiceMock.sendTwoFactorCode).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);

      const dto: LoginDto = { login: 'admin', password: 'wrong' };
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should skip 2FA and return a token right away when a valid trusted device token is given', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);
      prismaMock.dispositivoConfiable.findUnique.mockResolvedValue({
        usuario: 'admin',
        tokenHash: sha256('raw-device-token'),
        expiraEn: new Date(Date.now() + 1000 * 60),
      });

      const dto: LoginDto = { login: 'admin', password: 'admin123' };
      const result = await service.login(dto, 'raw-device-token');

      expect(result.requiresTwoFactor).toBe(false);
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user?.usuario).toBe('admin');
      expect(prismaMock.usuarioWeb.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendTwoFactorCode).not.toHaveBeenCalled();
    });

    it('should still require 2FA when the device token belongs to a different user', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);
      prismaMock.dispositivoConfiable.findUnique.mockResolvedValue({
        usuario: 'otro-usuario',
        tokenHash: sha256('raw-device-token'),
        expiraEn: new Date(Date.now() + 1000 * 60),
      });

      const dto: LoginDto = { login: 'admin', password: 'admin123' };
      const result = await service.login(dto, 'raw-device-token');

      expect(result.requiresTwoFactor).toBe(true);
    });
  });

  describe('verifyTwoFactor', () => {
    const userWithCode = {
      ...mockUser,
      twoFactorCodeHash: sha256('482913'),
      twoFactorCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 5),
    };

    it('should return a token and clear the code when it matches and is not expired', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(userWithCode);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);

      const result = await service.verifyTwoFactor({ login: 'admin', code: '482913' });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.usuario).toBe('admin');
      expect(result.deviceToken).toBeUndefined();
      expect(prismaMock.usuarioWeb.update).toHaveBeenCalledWith({
        where: { usuario: 'admin' },
        data: { twoFactorCodeHash: null, twoFactorCodeExpiresAt: null },
      });
    });

    it('should also create a trusted device when recordarDispositivo is true', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(userWithCode);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);
      prismaMock.dispositivoConfiable.create.mockResolvedValue({});

      const result = await service.verifyTwoFactor({
        login: 'admin',
        code: '482913',
        recordarDispositivo: true,
      });

      expect(result.deviceToken).toBeDefined();
      expect(prismaMock.dispositivoConfiable.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuario: 'admin',
            tokenHash: expect.any(String),
            expiraEn: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when the code does not match', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(userWithCode);

      await expect(
        service.verifyTwoFactor({ login: 'admin', code: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the code expired', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue({
        ...userWithCode,
        twoFactorCodeExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyTwoFactor({ login: 'admin', code: '482913' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create a new user and return minimal data', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);
      prismaMock.persona.create.mockResolvedValue(mockPersona);
      prismaMock.usuarioWeb.create.mockResolvedValue(mockUser);

      const dto: RegisterDto = {
        usuario: 'newuser',
        email: 'new@test.com',
        password: 'password123',
        nombre: 'New',
        apellido: 'User',
      };

      const result = await service.register(dto);

      expect(result).toHaveProperty('usuario');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('rol');
      expect(result).not.toHaveProperty('hashPass');
      expect(result).not.toHaveProperty('persona');
    });

    it('should throw ConflictException when username exists', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);

      const dto: RegisterDto = {
        usuario: 'admin',
        email: 'new@test.com',
        password: 'password123',
        nombre: 'New',
        apellido: 'User',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it('should return minimal profile data', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('admin');

      expect(result).toHaveProperty('usuario');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('rol');
      expect(result).not.toHaveProperty('hashPass');
      expect(result).not.toHaveProperty('persona');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('admin')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should generate a reset token and send email when the user exists', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('Si el email existe');
      expect(prismaMock.usuarioWeb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { usuario: mockUser.usuario },
          data: expect.objectContaining({
            resetTokenHash: expect.any(String),
            resetTokenExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mailServiceMock.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        expect.stringContaining('/reset-password?token='),
      );
    });

    it('should return the same generic message and not send email when the user does not exist', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nadie@test.com' });

      expect(result.message).toContain('Si el email existe');
      expect(prismaMock.usuarioWeb.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should update the password and clear the token when it is valid', async () => {
      prismaMock.usuarioWeb.findFirst.mockResolvedValue(mockUser);
      prismaMock.usuarioWeb.update.mockResolvedValue(mockUser);

      const result = await service.resetPassword({
        token: 'valid-raw-token',
        password: 'nuevaPassword123',
      });

      expect(result.message).toBe('Contraseña actualizada correctamente');
      expect(prismaMock.usuarioWeb.update).toHaveBeenCalledWith({
        where: { usuario: mockUser.usuario },
        data: {
          hashPass: 'hashed',
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      });
    });

    it('should throw BadRequestException when the token is invalid or expired', async () => {
      prismaMock.usuarioWeb.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bad-token', password: 'nuevaPassword123' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.usuarioWeb.update).not.toHaveBeenCalled();
    });
  });
});
