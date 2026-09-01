import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignVendorDto {
  @ApiPropertyOptional({ example: 'VENDOR-1' })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'ABC Travels' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ example: 'Transport' })
  @IsOptional()
  @IsString()
  serviceType?: string;
}
