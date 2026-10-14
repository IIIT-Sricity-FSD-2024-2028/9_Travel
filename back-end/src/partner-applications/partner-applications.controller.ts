import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PartnerApplicationsService } from './partner-applications.service';

@ApiTags('partner-applications')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('partner-applications')
export class PartnerApplicationsController {
  constructor(private readonly service: PartnerApplicationsService) {}

  @Get()
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'List all partner applications.' })
  findAll() {
    return { success: true, data: this.service.findAll() };
  }

  @Get(':id')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Get a single partner application.' })
  findOne(@Param('id') id: string) {
    return { success: true, data: this.service.findOne(id) };
  }

  @Post(':id/approve')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Approve a partner application and activate their account.' })
  approve(@Param('id') id: string, @Req() req: any) {
    const reviewer = String(req.headers ? req.headers['x-user-email'] || 'Super User' : 'Super User');
    return this.service.approve(id, reviewer);
  }

  @Post(':id/reject')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Reject a partner application.' })
  reject(
    @Param('id') id: string,
    @Body() body: { rejectionReason?: string },
    @Req() req: any,
  ) {
    const reviewer = String(req.headers ? req.headers['x-user-email'] || 'Super User' : 'Super User');
    return this.service.reject(id, body?.rejectionReason, reviewer);
  }
}
