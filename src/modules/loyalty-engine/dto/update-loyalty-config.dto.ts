import {
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class UpdateLoyaltyConfigDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  stamp_goal: number;

  @IsString()
  reward_description: string;

  @IsString()
  @IsOptional()
  terms_and_conditions?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
