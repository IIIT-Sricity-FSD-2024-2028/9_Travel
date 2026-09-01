import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class VendorUpdateDto {
  @ApiProperty({ example: 'SCH-TRIP-101-1' })
  @IsString()
  scheduleItemId!: string;

  @ApiProperty({ example: 'completed', enum: ['progress', 'enroute', 'completed'] })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ example: 'Completed' })
  @IsOptional()
  @IsString()
  statusText?: string;

  @ApiPropertyOptional({ example: 'Transport' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiProperty({ example: 'Transport pickup completed.' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ example: 'Goa Airport' })
  @IsOptional()
  @IsString()
  location?: string;
}
