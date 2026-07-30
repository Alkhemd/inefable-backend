import { IsMilitaryTime, IsNotEmpty } from 'class-validator';

export class UpdateEmployeeScheduleDto {
  @IsMilitaryTime({
    message: 'shift_start debe tener formato 24h HH:mm (ej. 09:00)',
  })
  @IsNotEmpty()
  shift_start: string;

  @IsMilitaryTime({
    message: 'shift_end debe tener formato 24h HH:mm (ej. 18:00)',
  })
  @IsNotEmpty()
  shift_end: string;
}
