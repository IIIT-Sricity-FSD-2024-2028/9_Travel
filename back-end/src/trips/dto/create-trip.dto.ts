import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: 'Goa Beach Tour' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Goa, India' })
  @IsString()
  destination!: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  travelerName!: string;

  @ApiPropertyOptional({ example: 'rahul@example.com' })
  @IsOptional()
  @IsString()
  travelerEmail?: string;

  @ApiPropertyOptional({ example: '2026-05-12' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-16' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  adults?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  children?: number;

  @ApiPropertyOptional({ example: 4500 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ example: 'planning' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: ['beach', 'heritage'] })
  @IsOptional()
  @IsArray()
  interests?: string[];

  @ApiPropertyOptional({ example: 'Need family-friendly activities.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
