import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ example: 'ABC Travels' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Transport' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'Goa' })
  @IsString()
  location!: string;

  @ApiPropertyOptional({ example: 4.5 })
  @IsOptional()
  @IsNumber()
  rating?: number;
}
