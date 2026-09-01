import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'traveler@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(3)
  password!: string;

  @ApiPropertyOptional({ example: 'Traveler' })
  @IsOptional()
  @IsString()
  role?: string;
}
