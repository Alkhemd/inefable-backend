import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EmployeesService {
  constructor(private readonly supabase: SupabaseService) {}

  // 1. Crear Empleado
  async createEmployee(userId: string, dto: CreateEmployeeDto) {
    // Paso A: Obtener el business_id del dueño
    const { data: business, error: businessError } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .single();

    if (businessError || !business) {
      throw new NotFoundException('No se encontró un negocio asociado a este dueño. Debes registrar tu negocio primero.');
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
      throw new InternalServerErrorException('Error al crear el cajero: ' + insertError.message);
    }

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
      .single();

    if (!business) return [];

    const { data, error } = await this.supabase.client
      .from('employees')
      .select('id, name, is_active, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  // 3. Desactivar Empleado (Soft Delete)
  async deactivateEmployee(userId: string, employeeId: string) {
    // Primero aseguramos que el dueño sea dueño de ese cajero
    const { data: business } = await this.supabase.client
      .from('businesses')
      .select('id')
      .eq('owner_user_id', userId)
      .single();

    if (!business) throw new NotFoundException('Negocio no encontrado');

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

    return data;
  }

  // 4. Login de Cajero (Validación de PIN)
  async loginEmployee(businessId: string, pin: string) {
    // Buscar todos los cajeros activos de este negocio
    const { data: employees, error } = await this.supabase.client
      .from('employees')
      .select('id, name, pin_hash')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (error || !employees || employees.length === 0) {
      throw new NotFoundException('No hay cajeros activos para este negocio.');
    }

    // Verificar el PIN contra los hashes (dado que no sabemos cuál cajero es, iteramos)
    for (const employee of employees) {
      const isMatch = await bcrypt.compare(pin, employee.pin_hash);
      if (isMatch) {
        // Credenciales válidas
        return {
          employeeId: employee.id,
          name: employee.name,
          businessId,
          message: 'Login exitoso',
          // NOTA: Aquí generaríamos un JWT interno para el cajero en la vida real.
        };
      }
    }

    throw new InternalServerErrorException('PIN incorrecto.');
  }
}
