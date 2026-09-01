import { Injectable } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { UpdateGuideDto } from './dto/update-guide.dto';

@Injectable()
export class GuidesService {
  constructor(private readonly data: DataService) {}

  findAll() {
    return this.data.guides();
  }

  findOne(id: string) {
    return this.data.findGuide(id);
  }

  create(dto: CreateGuideDto) {
    const guide = {
      id: `GUIDE-${Date.now()}`,
      name: dto.name,
      initials: dto.name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      languages: dto.languages,
      experience: dto.experience,
      rating: Number(dto.rating || 0),
      tours: 0,
      status: 'Available' as const,
    };
    this.data.guides().push(guide);
    return guide;
  }

  update(id: string, dto: UpdateGuideDto) {
    const guide = this.data.findGuide(id);
    Object.assign(guide, dto);
    return guide;
  }

  remove(id: string) {
    const guide = this.data.findGuide(id);
    this.data.guides().splice(this.data.guides().indexOf(guide), 1);
    return { id, deleted: true };
  }
}
