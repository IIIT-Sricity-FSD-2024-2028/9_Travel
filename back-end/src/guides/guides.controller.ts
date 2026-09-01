import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';
import { GuidesService } from './guides.service';

@ApiTags('guides')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('guides')
export class GuidesController {
  constructor(private readonly guides: GuidesService) {}

  @Get()
  @Roles(Role.SuperUser, Role.Partner, Role.Guide, Role.Support)
  @ApiOkResponse({ description: 'List tour guides.' })
  findAll() {
    return { success: true, data: this.guides.findAll() };
  }

  @Post()
  @Roles(Role.SuperUser)
  @ApiCreatedResponse({ description: 'Create tour guide.' })
  create(@Body() dto: CreateGuideDto) {
    return { success: true, data: this.guides.create(dto) };
  }

  @Get(':id')
  @Roles(Role.SuperUser, Role.Partner, Role.Guide, Role.Support)
  @ApiOkResponse({ description: 'Find tour guide.' })
  findOne(@Param('id') id: string) {
    return { success: true, data: this.guides.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.SuperUser, Role.Guide)
  @ApiOkResponse({ description: 'Update tour guide.' })
  update(@Param('id') id: string, @Body() dto: UpdateGuideDto) {
    return { success: true, data: this.guides.update(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Delete tour guide.' })
  remove(@Param('id') id: string) {
    return { success: true, data: this.guides.remove(id) };
  }
}
