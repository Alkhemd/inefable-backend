import { Injectable, InternalServerErrorException, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, dto: CreateMerchantDto) {
    const { data, error } = await this.supabase.client
      .from('businesses')
      .insert({ owner_user_id: userId, ...dto })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException('El usuario ya tiene un negocio registrado.');
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async getMyBusiness(userId: string) {
    const { data, error } = await this.supabase.client
      .from('businesses')
      .select('*')
      .eq('owner_user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('No tienes ningún negocio registrado.');
      }
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async updateMyBusiness(userId: string, dto: UpdateMerchantDto) {
    const { data, error } = await this.supabase.client
      .from('businesses')
      .update(dto)
      .eq('owner_user_id', userId)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    if (!data) {
       throw new NotFoundException('Negocio no encontrado.');
    }
    return data;
  }
}
