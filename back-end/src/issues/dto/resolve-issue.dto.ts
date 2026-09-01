import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResolveIssueDto {
  @ApiProperty({ example: 'Support contacted hotel and confirmed reservation.' })
  @IsString()
  resolution!: string;
}
