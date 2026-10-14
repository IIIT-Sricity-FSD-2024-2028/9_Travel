import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PartnerApplyDto {
  @ApiProperty({ example: 'Alex Morgan' })
  @IsString()
  @IsNotEmpty()
  applicantName!: string;

  @ApiProperty({ example: 'Summit Expeditions Ltd' })
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @ApiProperty({ example: 'alex@summitexpeditions.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ example: '123 Market Street, City' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mountain climbing guide and licensed trekking operator.' })
  @IsOptional()
  @IsString()
  businessDetails?: string;

  @ApiPropertyOptional({ example: 'Govt Tour Operator License #GOV-98745' })
  @IsOptional()
  @IsString()
  verificationInfo?: string;

  @ApiProperty({ example: 'Tour Guide' })
  @IsString()
  @IsNotEmpty()
  requestedRole!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(3)
  password!: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  otp?: string;
}
