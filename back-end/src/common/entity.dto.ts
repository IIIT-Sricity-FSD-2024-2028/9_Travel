import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'USER-1' })
  id!: string;

  @ApiProperty({ example: 'Sarah Johnson' })
  name!: string;

  @ApiProperty({ example: 'traveler@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'Traveler' })
  role!: string;

  @ApiProperty({ example: 'Active' })
  status!: string;
}

export class ScheduleItemResponseDto {
  @ApiProperty({ example: 'SCH-TRIP-101-1' })
  id!: string;

  @ApiProperty({ example: 1 })
  day!: number;

  @ApiProperty({ example: '2026-05-12' })
  date!: string;

  @ApiProperty({ example: '09:00' })
  time!: string;

  @ApiProperty({ example: 'Airport pickup and hotel check-in' })
  title!: string;

  @ApiProperty({ example: 'vendor' })
  owner!: string;

  @ApiProperty({ example: 'Goa Airport' })
  location!: string;

  @ApiProperty({ example: 'in-progress' })
  status!: string;

  @ApiPropertyOptional({ example: 'Vendor confirmed pickup.' })
  notes?: string;
}

export class TripResponseDto {
  @ApiProperty({ example: 'TRIP-101' })
  id!: string;

  @ApiProperty({ example: 'REQ-101' })
  requestId!: string;

  @ApiProperty({ example: 'Goa Beach Tour' })
  title!: string;

  @ApiProperty({ example: 'Rahul Sharma' })
  travelerName!: string;

  @ApiProperty({ example: 'Goa, India' })
  destination!: string;

  @ApiProperty({ example: 'ongoing' })
  status!: string;

  @ApiProperty({ example: 'Accepted' })
  requestStatus!: string;

  @ApiProperty({ example: 40 })
  progress!: number;

  @ApiProperty({ type: [ScheduleItemResponseDto] })
  schedule!: ScheduleItemResponseDto[];
}
