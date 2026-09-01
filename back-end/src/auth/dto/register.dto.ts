import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Sarah Johnson' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'sarah@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(3)
  password!: string;

  @ApiPropertyOptional({ example: 'Traveler' })
  @IsOptional()
  @IsString()
  role?: string;
}
