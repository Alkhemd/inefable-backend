import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { EmployeesService } from './employees.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let fromMock: jest.Mock;
  let auditLogMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    auditLogMock = jest.fn().mockResolvedValue(undefined);
    process.env.SUPABASE_JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEmployee', () => {
    it('crea el cajero y audita employee_created', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // businesses
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              id: 'employee-1',
              name: 'Emiliano',
              is_active: true,
              created_at: 'now',
            },
            error: null,
          }),
        ); // insert employees

      const result = await service.createEmployee(
        'owner-1',
        { name: 'Emiliano', pin: '1234' },
        '1.2.3.4',
        'jest-agent',
      );

      expect(result).toEqual({
        id: 'employee-1',
        name: 'Emiliano',
        is_active: true,
        created_at: 'now',
      });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'employee_created',
          actorId: 'owner-1',
        }),
      );
    });

    it('lanza NotFoundException si el dueño no tiene negocio activo', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({ data: null, error: null }),
      );

      await expect(
        service.createEmployee('owner-1', { name: 'Emiliano', pin: '1234' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEmployees', () => {
    it('regresa la lista de cajeros del negocio', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } }))
        .mockReturnValueOnce(
          mockQueryResult({
            data: [{ id: 'employee-1', name: 'Emiliano' }],
            error: null,
          }),
        );

      const result = await service.getEmployees('owner-1');

      expect(result).toEqual([{ id: 'employee-1', name: 'Emiliano' }]);
    });

    it('regresa arreglo vacío si el dueño no tiene negocio activo', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      const result = await service.getEmployees('owner-1');

      expect(result).toEqual([]);
    });
  });

  describe('deactivateEmployee', () => {
    it('desactiva al cajero y audita employee_deactivated', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // businesses
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'employee-1', name: 'Emiliano', is_active: true },
          }),
        ) // oldEmployee
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'employee-1', name: 'Emiliano', is_active: false },
            error: null,
          }),
        ); // update

      const result = await service.deactivateEmployee('owner-1', 'employee-1');

      expect(result.is_active).toBe(false);
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'employee_deactivated',
          oldValue: { id: 'employee-1', name: 'Emiliano', is_active: true },
        }),
      );
    });

    it('lanza NotFoundException si el negocio del dueño no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(
        service.deactivateEmployee('owner-1', 'employee-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('loginEmployee', () => {
    it('lanza NotFoundException si el negocio ya no está activo', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(service.loginEmployee('business-1', '1234')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('bloquea el login y audita cashier_login_blocked_no_schedule si el cajero no tiene horario', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', timezone: 'America/Mexico_City' },
          }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              {
                id: 'employee-1',
                name: 'Emiliano',
                pin_hash: pinHash,
                shift_start: null,
                shift_end: null,
              },
            ],
            error: null,
          }),
        );

      await expect(
        service.loginEmployee('business-1', '1234', '1.2.3.4', 'jest-agent'),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cashier_login_blocked_no_schedule',
          actorId: 'employee-1',
        }),
      );
    });

    it('bloquea el login y audita cashier_login_blocked_schedule si está fuera de su horario', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', timezone: 'America/Mexico_City' },
          }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              {
                id: 'employee-1',
                name: 'Emiliano',
                pin_hash: pinHash,
                shift_start: '09:00:00',
                shift_end: '18:00:00',
              },
            ],
            error: null,
          }),
        );

      // Fijamos la "hora actual" a la 1:00am (fuera del turno 09:00-18:00)
      jest
        .spyOn(service as any, 'getCurrentSecondsInTimezone')
        .mockReturnValue(1 * 3600);

      await expect(
        service.loginEmployee('business-1', '1234', '1.2.3.4', 'jest-agent'),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cashier_login_blocked_schedule',
          actorId: 'employee-1',
        }),
      );
    });

    it('genera un token que expira exactamente al final del turno cuando está dentro de su horario', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', timezone: 'America/Mexico_City' },
          }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              {
                id: 'employee-1',
                name: 'Emiliano',
                pin_hash: pinHash,
                shift_start: '09:00:00',
                shift_end: '18:00:00',
              },
            ],
            error: null,
          }),
        );

      // Fijamos la "hora actual" a las 10:00am (dentro del turno, faltan 8h para las 18:00)
      jest
        .spyOn(service as any, 'getCurrentSecondsInTimezone')
        .mockReturnValue(10 * 3600);

      const result = await service.loginEmployee(
        'business-1',
        '1234',
        '1.2.3.4',
        'jest-agent',
      );

      expect(result.employeeId).toBe('employee-1');
      const decoded = jwt.decode(result.token) as { iat: number; exp: number };
      expect(decoded.exp - decoded.iat).toBe(8 * 3600);
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cashier_login',
          actorId: 'employee-1',
        }),
      );
    });

    it('audita cashier_login_failed y lanza error cuando el PIN es incorrecto', async () => {
      const pinHash = await bcrypt.hash('1234', 10);
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', timezone: 'America/Mexico_City' },
          }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              {
                id: 'employee-1',
                name: 'Emiliano',
                pin_hash: pinHash,
                shift_start: '09:00:00',
                shift_end: '18:00:00',
              },
            ],
            error: null,
          }),
        );

      await expect(
        service.loginEmployee('business-1', '9999', '1.2.3.4', 'jest-agent'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'cashier_login_failed',
          actorId: null,
        }),
      );
    });
  });

  describe('updateEmployeeSchedule', () => {
    it('actualiza el horario y audita employee_schedule_updated', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // business del dueño
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              id: 'employee-1',
              name: 'Emiliano',
              shift_start: null,
              shift_end: null,
            },
          }),
        ) // oldEmployee
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              id: 'employee-1',
              name: 'Emiliano',
              shift_start: '09:00',
              shift_end: '18:00',
            },
            error: null,
          }),
        ); // update

      const result = await service.updateEmployeeSchedule(
        'owner-1',
        'employee-1',
        {
          shift_start: '09:00',
          shift_end: '18:00',
        },
      );

      expect(result.shift_start).toBe('09:00');
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'employee_schedule_updated' }),
      );
    });

    it('lanza NotFoundException si el negocio del dueño no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(
        service.updateEmployeeSchedule('owner-1', 'employee-1', {
          shift_start: '09:00',
          shift_end: '18:00',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
