import { IsIn, IsOptional } from 'class-validator';

export class ListBusinessesQueryDto {
  @IsIn(['trial', 'active', 'suspended', 'cancelled'])
  @IsOptional()
  status?: string;
}
