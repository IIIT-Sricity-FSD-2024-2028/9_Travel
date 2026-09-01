import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ALL_ROLES } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Roles(...ALL_ROLES)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiQuery({ name: 'tripId', required: false, description: 'Filter messages by trip id.' })
  @ApiQuery({ name: 'email', required: false, description: 'Filter messages for user email.' })
  @ApiOkResponse({ description: 'List messages.' })
  findAll(
    @Query('tripId') tripId?: string,
    @Query('email') email?: string,
    @Headers('x-user-email') userEmailHeader?: string,
    @Headers('x-role') roleHeader?: string,
  ) {
    const userEmail = email || userEmailHeader;
    return { success: true, data: this.messages.findAll(tripId, userEmail, roleHeader) };
  }

  @Post()
  @ApiCreatedResponse({ description: 'Send a message and notify recipients.' })
  create(@Body() dto: CreateMessageDto) {
    return { success: true, data: this.messages.create(dto) };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { success: true, data: this.messages.findOne(id) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return { success: true, data: this.messages.update(id, dto) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { success: true, data: this.messages.remove(id) };
  }
}
