import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'TRIP-101' })
  @IsString()
  tripId!: string;

  @ApiProperty({ example: 'traveler' })
  @IsString()
  fromRole!: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  fromName!: string;

  @ApiPropertyOptional({ example: ['guide', 'vendor'] })
  @IsOptional()
  @IsArray()
  toRoles?: string[];

  @ApiProperty({ example: 'What time is the pickup?' })
  @IsString()
  body!: string;
}
