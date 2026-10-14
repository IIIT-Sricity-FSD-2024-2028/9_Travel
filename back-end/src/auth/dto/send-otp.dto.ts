import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'sarah@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'registration' })
  @IsOptional()
  @IsString()
  purpose?: string;
}
