import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateBusinessStatusDto {
  @IsIn(['trial', 'active', 'suspended', 'cancelled'])
  @IsNotEmpty()
  status: string;
}
