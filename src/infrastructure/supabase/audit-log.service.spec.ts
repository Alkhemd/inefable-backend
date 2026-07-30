import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { SupabaseService } from './supabase.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let fromMock: jest.Mock;
  let insertMock: jest.Mock;

  beforeEach(async () => {
    insertMock = jest.fn(() => mockQueryResult({ error: null }));
    fromMock = jest.fn(() => ({ insert: insertMock }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('inserta en audit_logs mapeando los campos al snake_case de la tabla', async () => {
    await service.log({
      actorId: 'user-1',
      action: 'employee_created',
      entityType: 'employees',
      entityId: 'employee-1',
      oldValue: { is_active: true },
      newValue: { is_active: false },
      ip: '1.2.3.4',
      userAgent: 'jest-agent',
    });

    expect(fromMock).toHaveBeenCalledWith('audit_logs');
    expect(insertMock).toHaveBeenCalledWith({
      actor_id: 'user-1',
      action: 'employee_created',
      entity_type: 'employees',
      entity_id: 'employee-1',
      old_value: { is_active: true },
      new_value: { is_active: false },
      ip_address: '1.2.3.4',
      user_agent: 'jest-agent',
    });
  });

  it('usa null en los campos opcionales que no se pasan', async () => {
    await service.log({ action: 'cashier_login_failed' });

    expect(insertMock).toHaveBeenCalledWith({
      actor_id: null,
      action: 'cashier_login_failed',
      entity_type: null,
      entity_id: null,
      old_value: null,
      new_value: null,
      ip_address: null,
      user_agent: null,
    });
  });

  it('no lanza error si Supabase falla al insertar (se traga el error)', async () => {
    insertMock.mockReturnValueOnce(
      mockQueryResult({ error: { message: 'boom' } }),
    );

    await expect(
      service.log({ action: 'stamp_granted' }),
    ).resolves.toBeUndefined();
  });
});
