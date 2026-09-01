import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, normalizeRole, Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AssignGuideDto } from './dto/assign-guide.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { GuideUpdateDto } from './dto/guide-update.dto';
import { ScheduleProgressDto } from './dto/schedule-progress.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { VendorUpdateDto } from './dto/vendor-update.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  @ApiOkResponse({ description: 'List all trips.' })
  findAll(@Req() req: { headers: Record<string, string | undefined> }) {
    const userEmail = (req.headers['x-user-email'] as string) || undefined;
    const roleHeader = req.headers['x-role'] as string | undefined;
    const userRole = roleHeader ? (normalizeRole(roleHeader) ?? undefined) : undefined;
    return { success: true, data: this.trips.findAll(userEmail, userRole) };
  }

  @Post()
  @Roles(Role.SuperUser, Role.Partner)
  @ApiCreatedResponse({ description: 'Create a trip directly.' })
  create(@Body() dto: CreateTripDto) {
    return { success: true, data: this.trips.create(dto) };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOkResponse({ description: 'Find trip by id.' })
  findOne(@Param('id') id: string) {
    return { success: true, data: this.trips.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.SuperUser, Role.Partner)
  @ApiOkResponse({ description: 'Update trip.' })
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return { success: true, data: this.trips.update(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser, Role.Partner)
  @ApiOkResponse({ description: 'Delete trip.' })
  remove(@Param('id') id: string) {
    return { success: true, data: this.trips.remove(id) };
  }

  @Post(':id/assign-guide')
  @Roles(Role.SuperUser, Role.Partner)
  assignGuide(@Param('id') id: string, @Body() dto: AssignGuideDto) {
    return { success: true, data: this.trips.assignGuide(id, dto) };
  }

  @Post(':id/guide/accept')
  @Roles(Role.Guide, Role.SuperUser)
  acceptGuide(@Param('id') id: string) {
    return { success: true, data: this.trips.acceptGuide(id) };
  }

  @Post(':id/guide/reject')
  @Roles(Role.Guide, Role.SuperUser)
  rejectGuide(@Param('id') id: string) {
    return { success: true, data: this.trips.rejectGuide(id) };
  }

  @Post(':id/assign-vendor')
  @Roles(Role.SuperUser, Role.Partner)
  assignVendor(@Param('id') id: string, @Body() dto: AssignVendorDto) {
    return { success: true, data: this.trips.assignVendor(id, dto) };
  }

  @Post(':id/vendor/accept')
  @Roles(Role.Vendor, Role.SuperUser)
  acceptVendor(@Param('id') id: string) {
    return { success: true, data: this.trips.acceptVendor(id) };
  }

  @Post(':id/vendor/reject')
  @Roles(Role.Vendor, Role.SuperUser)
  rejectVendor(@Param('id') id: string) {
    return { success: true, data: this.trips.rejectVendor(id) };
  }

  @Post(':id/start')
  @Roles(Role.Partner, Role.SuperUser)
  start(@Param('id') id: string) {
    return { success: true, data: this.trips.start(id) };
  }

  @Get(':id/schedule')
  @Roles(...ALL_ROLES)
  schedule(@Param('id') id: string) {
    return { success: true, data: this.trips.schedule(id) };
  }

  @Patch(':id/schedule/:scheduleItemId')
  @Roles(Role.Guide, Role.Vendor, Role.Partner, Role.SuperUser)
  updateSchedule(
    @Param('id') id: string,
    @Param('scheduleItemId') scheduleItemId: string,
    @Body() dto: ScheduleProgressDto,
  ) {
    return { success: true, data: this.trips.updateSchedule(id, scheduleItemId, dto) };
  }

  @Post(':id/guide-updates')
  @Roles(Role.Guide, Role.SuperUser)
  guideUpdate(@Param('id') id: string, @Body() dto: GuideUpdateDto) {
    return { success: true, data: this.trips.guideUpdate(id, dto) };
  }

  @Post(':id/vendor-updates')
  @Roles(Role.Vendor, Role.SuperUser)
  vendorUpdate(@Param('id') id: string, @Body() dto: VendorUpdateDto) {
    return { success: true, data: this.trips.vendorUpdate(id, dto) };
  }

  @Get(':id/updates')
  @Roles(...ALL_ROLES)
  updates(@Param('id') id: string) {
    return { success: true, data: this.trips.findOne(id).updates };
  }
}
