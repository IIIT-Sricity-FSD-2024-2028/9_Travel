import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateIssueDto {
  @ApiProperty({ example: 'TRIP-101' })
  @IsString()
  tripId!: string;

  @ApiProperty({ example: 'Hotel reservation issue' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Hotel could not find the booking.' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 'Accommodation' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'High' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 'Sarah Johnson' })
  @IsOptional()
  @IsString()
  reportedBy?: string;

  @ApiPropertyOptional({ example: '/uploads/file-12345.png' })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional({ example: 'Traveler' })
  @IsOptional()
  @IsString()
  reporterRole?: string;
}
