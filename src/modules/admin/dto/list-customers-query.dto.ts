import { IsOptional, IsUUID } from 'class-validator';

export class ListCustomersQueryDto {
  @IsUUID()
  @IsOptional()
  businessId?: string;
}
