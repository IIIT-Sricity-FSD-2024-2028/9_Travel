import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly data: DataService) {}

  findAll() {
    return this.data.vendors();
  }

  findOne(id: string) {
    return this.data.findVendor(id);
  }

  create(dto: CreateVendorDto) {
    const vendor = {
      id: `VENDOR-${Date.now()}`,
      name: dto.name,
      type: dto.type,
      location: dto.location,
      rating: Number(dto.rating || 0),
      trips: 0,
      status: 'Available' as const,
    };
    this.data.vendors().push(vendor);
    return vendor;
  }

  update(id: string, dto: UpdateVendorDto) {
    const vendor = this.data.findVendor(id);
    Object.assign(vendor, dto);
    return vendor;
  }

  remove(id: string) {
    const vendor = this.data.findVendor(id);
    this.data.vendors().splice(this.data.vendors().indexOf(vendor), 1);
    return { id, deleted: true };
  }
}
