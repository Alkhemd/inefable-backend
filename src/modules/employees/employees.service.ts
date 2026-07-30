import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import type { CashierJwtPayload } from '../../core/guards/cashier-auth.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeScheduleDto } from './dto/update-employee-schedule.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const DEFAULT_TIMEZONE = 'America/Mexico_City';
const SECONDS_PER_DAY = 24 * 3600;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  // Convierte "HH:mm" o "HH:mm:ss" (como lo regresa la columna TIME de Postgres) a segundos del día.
  private timeStringToSeconds(time: string): number {
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + (s || 0);
  }

  // Hora actual (en segundos desde medianoche) en la zona horaria del negocio.
  // Usa Intl nativo de Node — sin dependencias nuevas. Si la zona horaria guardada
  // es inválida, cae de vuelta a la zona por default en vez de tronar el login.
  private getCurrentSecondsInTimezone(timezone: string): number {
    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: DEFAULT_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
    }

    const parts = formatter.formatToParts(new Date());
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');

    return get('hour') * 3600 + get('minute') * 60 + get('second');
  }

  // Soporta turnos que cruzan la medianoche (ej. 22:00 - 06:00).
  private isWithinSchedule(
    currentSeconds: number,
    shiftStartSeconds: number,
    shiftEndSeconds: number,
  ): boolean {
    if (shiftStartSeconds <= shiftEndSeconds) {
      return (
        currentSeconds >= shiftStartSeconds && currentSeconds <= shiftEndSeconds
      );
    }
    return (
      currentSeconds >= shiftStartSeconds || currentSeconds <= shiftEndSeconds
    );
  }

  // Segundos restantes hasta shift_end (si el turno ya cruzó medianoche, suma un día).
  private secondsUntilShiftEnd(
    currentSeconds: number,
    shiftEndSeconds: number,
  ): number {
    const remaining = shiftEndSeconds - currentSeconds;
    return remaining > 0 ? remaining : remaining + SECONDS_PER_DAY;
  }

  // 1. Crear Empleado
  async createEmployee(
    userId: string,
    dto: CreateEmployeeDto,
    ip?: string,
    userAgent?: string,
  ) {
    // Paso A: Obtener el business_id del dueño
    const { data: business, error: businessError } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (businessError || !business) {
      throw new NotFoundException(
        'No se encontró un negocio asociado a este dueño. Debes registrar tu negocio primero.',
      );
    }

    const businessId = business.id;

    // Paso B: Hashear el PIN de 4 dígitos
    const saltRounds = 10;
    const pinHash = await bcrypt.hash(dto.pin, saltRounds);

    // Paso C: Insertar en base de datos (se descarta el PIN en texto plano)
    const { data: newEmployee, error: insertError } = await this.supabase.client
      .from('employees')
      .insert({
        business_id: businessId,
        name: dto.name,
        pin_hash: pinHash, // Solo guardamos el Hash
      })
      .select('id, name, is_active, created_at') // Retornamos info sin el hash por seguridad extra
      .single();

    if (insertError) {
      throw new InternalServerErrorException(
        'Error al crear el cajero: ' + insertError.message,
      );
    }

    await this.auditLog.log({
      actorId: userId,
      action: 'employee_created',
      entityType: 'employees',
      entityId: newEmployee.id,
      newValue: newEmployee,
      ip,
      userAgent,
    });

    return newEmployee;
  }

  // 2. Listar Empleados
  async getEmployees(userId: string) {
    // La política RLS de Supabase nos exige pasar la validación.
    // Aunque el RLS filtra solo, tenemos que enviar la query. Supabase usa el JWT del cliente internamente.
    // Como nuestro backend usa el token ServiceRole en SupabaseService por defecto,
    // debemos ser explícitos filtrando, o bien inyectar el JWT del request al cliente de Supabase.
    // Como la API es backend-server, filtramos explícitamente cruzando datos:

    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!business) return [];

    const { data, error } = await this.supabase.client
      .from('employees')
      .select('id, name, is_active, created_at, shift_start, shift_end')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  // 3. Desactivar Empleado (Soft Delete)
  async deactivateEmployee(
    userId: string,
    employeeId: string,
    ip?: string,
    userAgent?: string,
  ) {
    // Primero aseguramos que el dueño sea dueño de ese cajero
    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!business) throw new NotFoundException('Negocio no encontrado');

    const { data: oldEmployee } = await this.supabase.client
      .from('employees')
      .select('id, name, is_active')
      .eq('id', employeeId)
      .eq('business_id', business.id)
      .single();

    const { data, error } = await this.supabase.client
      .from('employees')
      .update({ is_active: false })
      .eq('id', employeeId)
      .eq('business_id', business.id) // Seguridad extra backend-side
      .select('id, name, is_active')
      .single();

    if (error || !data) {
      throw new NotFoundException('Empleado no encontrado o no te pertenece.');
    }

    await this.auditLog.log({
      actorId: userId,
      action: 'employee_deactivated',
      entityType: 'employees',
      entityId: data.id,
      oldValue: oldEmployee ?? null,
      newValue: data,
      ip,
      userAgent,
    });

    return data;
  }

  // 3.1 Configurar el horario de turno del cajero
  async updateEmployeeSchedule(
    userId: string,
    employeeId: string,
    dto: UpdateEmployeeScheduleDto,
    ip?: string,
    userAgent?: string,
  ) {
    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .is('deleted_at', null)
      .single();

    if (!business) throw new NotFoundException('Negocio no encontrado');

    const { data: oldEmployee } = await this.supabase.client
      .from('employees')
      .select('id, name, shift_start, shift_end')
      .eq('id', employeeId)
      .eq('business_id', business.id)
      .single();

    const { data, error } = await this.supabase.client
      .from('employees')
      .update({ shift_start: dto.shift_start, shift_end: dto.shift_end })
      .eq('id', employeeId)
      .eq('business_id', business.id)
      .select('id, name, shift_start, shift_end')
      .single();

    if (error || !data) {
      throw new NotFoundException('Empleado no encontrado o no te pertenece.');
    }

    await this.auditLog.log({
      actorId: userId,
      action: 'employee_schedule_updated',
      entityType: 'employees',
      entityId: data.id,
      oldValue: oldEmployee ?? null,
      newValue: data,
      ip,
      userAgent,
    });

    return data;
  }

  // 4. Login de Cajero (Validación de PIN + horario de turno)
  async loginEmployee(
    businessId: string,
    pin: string,
    ip?: string,
    userAgent?: string,
  ) {
    // El negocio debe existir y no estar eliminado (soft-delete) para poder loguear cajeros
    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id, timezone')
      .eq('id', businessId)
      .is('deleted_at', null)
      .single();

    if (!business) {
      throw new NotFoundException('Este negocio ya no está activo.');
    }

    // Buscar todos los cajeros activos de este negocio
    const { data: employees, error } = await this.supabase.client
      .from('employees')
      .select('id, name, pin_hash, shift_start, shift_end')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error || !employees || employees.length === 0) {
      throw new NotFoundException('No hay cajeros activos para este negocio.');
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'Configuración de seguridad incompleta en el servidor.',
      );
    }

    // Verificar el PIN contra los hashes
    for (const employee of employees) {
      const isMatch = await bcrypt.compare(pin, employee.pin_hash);
      if (isMatch) {
        if (!employee.shift_start || !employee.shift_end) {
          await this.auditLog.log({
            actorId: employee.id,
            action: 'cashier_login_blocked_no_schedule',
            entityType: 'employees',
            entityId: employee.id,
            newValue: { businessId },
            ip,
            userAgent,
          });
          throw new ForbiddenException(
            'Este cajero no tiene un horario configurado. Contacta al dueño del negocio.',
          );
        }

        const timezone = business.timezone || DEFAULT_TIMEZONE;
        const currentSeconds = this.getCurrentSecondsInTimezone(timezone);
        const shiftStartSeconds = this.timeStringToSeconds(
          employee.shift_start,
        );
        const shiftEndSeconds = this.timeStringToSeconds(employee.shift_end);

        if (
          !this.isWithinSchedule(
            currentSeconds,
            shiftStartSeconds,
            shiftEndSeconds,
          )
        ) {
          await this.auditLog.log({
            actorId: employee.id,
            action: 'cashier_login_blocked_schedule',
            entityType: 'employees',
            entityId: employee.id,
            newValue: {
              businessId,
              shift_start: employee.shift_start,
              shift_end: employee.shift_end,
            },
            ip,
            userAgent,
          });
          throw new ForbiddenException(
            'Estás fuera de tu horario asignado. No puedes iniciar sesión en este momento.',
          );
        }

        // Credenciales válidas - Generar JWT
        const payload: CashierJwtPayload = {
          sub: employee.id,
          type: 'cashier',
          businessId,
          name: employee.name,
        };

        // El token expira exactamente cuando termina el turno del cajero (no 12h fijas).
        const expiresInSeconds = this.secondsUntilShiftEnd(
          currentSeconds,
          shiftEndSeconds,
        );
        const token = jwt.sign(payload, jwtSecret, {
          expiresIn: expiresInSeconds,
        });

        await this.auditLog.log({
          actorId: employee.id,
          action: 'cashier_login',
          entityType: 'employees',
          entityId: employee.id,
          newValue: { businessId, name: employee.name },
          ip,
          userAgent,
        });

        return {
          employeeId: employee.id,
          name: employee.name,
          businessId,
          token,
          message: 'Login exitoso',
        };
      }
    }

    await this.auditLog.log({
      actorId: null,
      action: 'cashier_login_failed',
      entityType: 'employees',
      newValue: { businessId },
      ip,
      userAgent,
    });

    throw new InternalServerErrorException('PIN incorrecto.');
  }
}
