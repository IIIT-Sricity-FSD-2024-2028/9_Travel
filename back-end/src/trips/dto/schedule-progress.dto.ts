import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ScheduleProgressDto {
  @ApiProperty({ example: 'completed', enum: ['in-progress', 'completed', 'delay'] })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ example: 'Pickup completed successfully.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Goa Airport' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'ABC Travels' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
