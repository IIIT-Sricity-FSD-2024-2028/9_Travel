import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGuideDto {
  @ApiProperty({ example: 'Arun Kumar' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'English, Hindi' })
  @IsString()
  languages!: string;

  @ApiProperty({ example: '8 years' })
  @IsString()
  experience!: string;

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional()
  @IsNumber()
  rating?: number;
}
