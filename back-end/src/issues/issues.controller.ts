import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES, Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateIssueDto } from './dto/create-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { IssuesService } from './issues.service';

@ApiTags('issues')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get()
  @Roles(Role.SuperUser, Role.Support, Role.Partner)
  findAll() {
    return { success: true, data: this.issues.findAll() };
  }

  @Post()
  @Roles(...ALL_ROLES)
  @ApiCreatedResponse({ description: 'Report an issue to support.' })
  create(@Body() dto: CreateIssueDto) {
    return { success: true, data: this.issues.create(dto) };
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id') id: string) {
    return { success: true, data: this.issues.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.SuperUser, Role.Support)
  update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    return { success: true, data: this.issues.update(id, dto) };
  }

  @Post(':id/resolve')
  @Roles(Role.SuperUser, Role.Support)
  @ApiOkResponse({ description: 'Resolve an issue and notify every trip member.' })
  resolve(@Param('id') id: string, @Body() dto: ResolveIssueDto) {
    return { success: true, data: this.issues.resolve(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser, Role.Support)
  remove(@Param('id') id: string) {
    return { success: true, data: this.issues.remove(id) };
  }
}
