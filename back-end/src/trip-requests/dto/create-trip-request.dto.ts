import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateTripRequestDto {
  @ApiProperty({ example: 'Sarah Johnson' })
  @IsString()
  travelerName!: string;

  @ApiPropertyOptional({ example: 'traveler@gmail.com' })
  @IsOptional()
  @IsString()
  travelerEmail?: string;

  @ApiProperty({ example: 'Maldives Escape' })
  @IsString()
  packageName!: string;

  @ApiProperty({ example: 'Male, Maldives' })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({ example: '2026-06-10' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-16' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  adults?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  children?: number;

  @ApiPropertyOptional({ example: 5200 })
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ example: ['beach', 'snorkeling'] })
  @IsOptional()
  @IsArray()
  interests?: string[];

  @ApiPropertyOptional({ example: 'Ocean-view resort preferred.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
