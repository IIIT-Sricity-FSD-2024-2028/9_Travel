import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'New User' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '9999999999' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(3)
  password!: string;

  @ApiProperty({ example: 'Traveler' })
  @IsString()
  role!: string;

  @ApiPropertyOptional({ example: 'Active', enum: ['Active', 'Inactive', 'Suspended'] })
  @IsOptional()
  @IsIn(['Active', 'Inactive', 'Suspended'])
  status?: 'Active' | 'Inactive' | 'Suspended';
}
