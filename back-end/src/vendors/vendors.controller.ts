import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../common/role.enum';
import { ApiRoleHeader, Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorsService } from './vendors.service';

@ApiTags('vendors')
@ApiRoleHeader()
@UseGuards(RolesGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendors: VendorsService) {}

  @Get()
  @Roles(Role.SuperUser, Role.Partner, Role.Vendor, Role.Support)
  @ApiOkResponse({ description: 'List vendors.' })
  findAll() {
    return { success: true, data: this.vendors.findAll() };
  }

  @Post()
  @Roles(Role.SuperUser)
  @ApiCreatedResponse({ description: 'Create vendor.' })
  create(@Body() dto: CreateVendorDto) {
    return { success: true, data: this.vendors.create(dto) };
  }

  @Get(':id')
  @Roles(Role.SuperUser, Role.Partner, Role.Vendor, Role.Support)
  @ApiOkResponse({ description: 'Find vendor.' })
  findOne(@Param('id') id: string) {
    return { success: true, data: this.vendors.findOne(id) };
  }

  @Patch(':id')
  @Roles(Role.SuperUser, Role.Vendor)
  @ApiOkResponse({ description: 'Update vendor.' })
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return { success: true, data: this.vendors.update(id, dto) };
  }

  @Delete(':id')
  @Roles(Role.SuperUser)
  @ApiOkResponse({ description: 'Delete vendor.' })
  remove(@Param('id') id: string) {
    return { success: true, data: this.vendors.remove(id) };
  }
}
