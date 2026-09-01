import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { TripsService } from '../trips/trips.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';

@ApiTags('trip-requests')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('trip-requests')
export class TripRequestsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @Roles(Role.SuperUser, Role.Partner, Role.Traveler)
  @ApiOkResponse({ description: 'List pending traveler trip requests.' })
  findAll() {
    return { success: true, data: this.trips.findRequests() };
  }

  @Post()
  @Roles(Role.SuperUser, Role.Traveler)
  @ApiCreatedResponse({ description: 'Create traveler trip request.' })
  create(@Body() dto: CreateTripRequestDto) {
    const trip = this.trips.create(
      {
        title: dto.packageName,
        destination: dto.destination,
        travelerName: dto.travelerName,
        travelerEmail: dto.travelerEmail,
        startDate: dto.startDate,
        endDate: dto.endDate,
        adults: Number(dto.adults || 1),
        children: Number(dto.children || 0),
        budget: Number(dto.budget || 0),
        notes: dto.notes,
        interests: dto.interests,
      },
      true,
    );
    return { success: true, data: trip };
  }

  @Post(':id/accept')
  @Roles(Role.SuperUser, Role.Partner)
  @ApiOkResponse({ description: 'Travel partner accepts a traveler request.' })
  accept(@Param('id') id: string) {
    return { success: true, data: this.trips.acceptRequest(id) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser, Role.Traveler, Role.Partner)
  @ApiOkResponse({ description: 'Cancel or delete a traveler trip request.' })
  cancel(@Param('id') id: string) {
    return { success: true, data: this.trips.cancel(id) };
  }
}
