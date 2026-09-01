import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class WorkflowStateDto {
  @ApiProperty({ example: 4 })
  @IsNumber()
  version!: number;

  @ApiProperty({ example: 107 })
  @IsNumber()
  nextTripNumber!: number;

  @ApiProperty({ example: 5425 })
  @IsNumber()
  nextIssueNumber!: number;

  @ApiProperty({ type: Array })
  @IsArray()
  trips!: unknown[];

  @ApiProperty({ type: Array })
  @IsArray()
  notifications!: unknown[];

  @ApiProperty({ type: Array })
  @IsArray()
  issues!: unknown[];

  @ApiProperty({ type: Array })
  @IsArray()
  messages!: unknown[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  guides?: unknown[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  vendors?: unknown[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  users?: unknown[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  packages?: unknown[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  deletedNotifIds?: string[];

  @ApiProperty({ type: Array, required: false })
  @IsOptional()
  @IsArray()
  partnerReadItems?: unknown[];
}
