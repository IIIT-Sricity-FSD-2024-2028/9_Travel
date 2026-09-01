import { Body, Controller, Get, Put, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DataService } from '../data/data.service';
import { WorkflowStateDto } from './dto/workflow-state.dto';

@ApiTags('workflow')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(private readonly data: DataService) {}

  @Get('state')
  @Roles(...ALL_ROLES)
  @ApiOkResponse({ description: 'Complete in-memory state used by the static frontend workflow.' })
  state() {
    return { success: true, data: this.data.getState() };
  }

  @Put('state')
  @Roles(...ALL_ROLES)
  @ApiBody({ type: WorkflowStateDto })
  @ApiOkResponse({ description: 'Replace workflow state from the frontend after a CRUD action.' })
  replace(@Body() dto: WorkflowStateDto) {
    return { success: true, data: this.data.replaceState(dto as never) };
  }

  @Post('reset')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Reset all in-memory arrays to the initial Review-4 seed.' })
  reset() {
    return { success: true, data: this.data.reset() };
  }
}
