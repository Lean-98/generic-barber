import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaServiceMock } from '../../../test/mocks/prisma.service.mock';

describe('GoogleCalendarService', () => {
  let service: GoogleCalendarService;
  let prismaMock: PrismaServiceMock;

  const mockConfig = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiryDate: new Date('2026-06-15'),
    calendarId: 'primary',
  };

  const mockTurno = {
    idTurno: 1,
    idPersona: 1,
    fechaHoraInicio: new Date('2026-06-15T10:00:00Z'),
    fechaHoraFin: new Date('2026-06-15T11:00:00Z'),
    estado: 'PENDIENTE',
    observacion: 'Corte y color',
    googleEventId: null,
    persona: {
      nombre: 'Juan',
      apellido: 'Pérez',
    },
  };

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleCalendarService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'GOOGLE_CLIENT_ID':
                  return 'test-client-id';
                case 'GOOGLE_CLIENT_SECRET':
                  return 'test-client-secret';
                case 'GOOGLE_REDIRECT_URI':
                  return 'http://localhost:3000/auth/callback';
                case 'GOOGLE_CALENDAR_ID':
                  return 'primary';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleCalendarService>(GoogleCalendarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConfigured', () => {
    it('should return true when all env vars are set', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('getAuthUrl', () => {
    it('should return a valid auth URL', () => {
      const url = service.getAuthUrl();
      expect(url).toContain('accounts.google.com');
      expect(url).toContain('client_id=test-client-id');
    });

    it('should throw when not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleCalendarService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(null),
            },
          },
        ],
      }).compile();

      const unconfiguredService = module.get<GoogleCalendarService>(GoogleCalendarService);
      expect(unconfiguredService.isConfigured()).toBe(false);
      expect(() => unconfiguredService.getAuthUrl()).toThrow(BadRequestException);
    });
  });

  describe('isConnected', () => {
    it('should return true when config exists', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(mockConfig);
      const result = await service.isConnected();
      expect(result).toBe(true);
    });

    it('should return false when config does not exist', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(null);
      const result = await service.isConnected();
      expect(result).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return config when connected', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(mockConfig);
      const result = await service.getConfig();
      expect(result).toHaveProperty('calendarId');
      expect(result.calendarId).toBe('primary');
    });

    it('should throw NotFoundException when not connected', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(null);
      await expect(service.getConfig()).rejects.toThrow(NotFoundException);
    });
  });

  describe('disconnect', () => {
    it('should delete config', async () => {
      prismaMock.googleCalendarConfig.deleteMany.mockResolvedValue({ count: 1 });
      await service.disconnect();
      expect(prismaMock.googleCalendarConfig.deleteMany).toHaveBeenCalled();
    });
  });

  describe('createEvent', () => {
    it('should return null when not connected', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(null);
      const result = await service.createEvent(mockTurno as any);
      expect(result).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('should return when no googleEventId', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(mockConfig);
      await service.updateEvent(mockTurno as any);
      // No debería lanzar error
    });
  });

  describe('deleteEvent', () => {
    it('should return when not connected', async () => {
      prismaMock.googleCalendarConfig.findFirst.mockResolvedValue(null);
      await service.deleteEvent('event-id');
      // No debería lanzar error
    });
  });
});
