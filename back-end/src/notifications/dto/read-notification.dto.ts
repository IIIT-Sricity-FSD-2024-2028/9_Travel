import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReadNotificationDto {
  @ApiProperty({ example: 'traveler' })
  @IsString()
  role!: string;
}
