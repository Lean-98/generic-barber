import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

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
    it('should return JWT token when credentials are valid', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(mockUser);

      const dto: LoginDto = { login: 'admin', password: 'admin123' };
      const result = await service.login(dto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.usuario).toBe('admin');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('rol');
      expect(result.user).not.toHaveProperty('nombre');
      expect(result.user).not.toHaveProperty('apellido');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      prismaMock.usuarioWeb.findUnique.mockResolvedValue(null);

      const dto: LoginDto = { login: 'admin', password: 'wrong' };
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
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
});
