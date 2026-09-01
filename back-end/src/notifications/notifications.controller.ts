import { Body, Controller, Delete, Get, Headers, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { NotificationsService } from './notifications.service';
import { ReadNotificationDto } from './dto/read-notification.dto';

@ApiTags('notifications')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Roles(...ALL_ROLES)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'role', required: false, description: 'Filter notifications for a role key.' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter notifications for user email.' })
  @ApiOkResponse({ description: 'List notifications.' })
  findAll(
    @Query('role') role?: string,
    @Query('email') email?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const userEmail = email || userEmailHeader;
    return { success: true, data: this.notifications.findAll(role, userEmail) };
  }

  @Patch(':id/read')
  @ApiOkResponse({ description: 'Mark notification as read for a role.' })
  markRead(@Param('id') id: string, @Body() dto: ReadNotificationDto) {
    return { success: true, data: this.notifications.markRead(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { success: true, data: this.notifications.remove(id) };
  }
}
