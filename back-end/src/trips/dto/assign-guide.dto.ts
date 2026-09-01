import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignGuideDto {
  @ApiPropertyOptional({ example: 'GUIDE-1' })
  @IsOptional()
  @IsString()
  guideId?: string;

  @ApiPropertyOptional({ example: 'Arun Kumar' })
  @IsOptional()
  @IsString()
  guideName?: string;
}
