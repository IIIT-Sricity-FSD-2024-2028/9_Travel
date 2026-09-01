import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GuideUpdateDto {
  @ApiProperty({ example: 'SCH-TRIP-101-2' })
  @IsString()
  scheduleItemId!: string;

  @ApiProperty({ example: 'completed', enum: ['location', 'started', 'delay', 'completed'] })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ example: 'Tour Completed' })
  @IsOptional()
  @IsString()
  statusText?: string;

  @ApiPropertyOptional({ example: 'Calangute' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Traveler reached the current activity.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
