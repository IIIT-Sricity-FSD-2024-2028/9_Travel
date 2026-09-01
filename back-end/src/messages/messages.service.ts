import { Injectable, NotFoundException } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { MessageEntity } from '../data/entities';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly data: DataService) {}

  findAll(tripId?: string, userEmail?: string, userRole?: string) {
    const messages = this.data.messages();
    if (tripId) {
      return messages.filter((message) => message.tripId === tripId);
    }

    const role = (userRole || '').toLowerCase();
    const email = (userEmail || '').toLowerCase();

    if (role === 'traveler' && email) {
      const userTrips = this.data.trips().filter(
        (t) => (t.travelerEmail || '').toLowerCase() === email
      );
      const userTripIds = new Set(userTrips.map((t) => t.id));
      return messages.filter((m) => userTripIds.has(m.tripId));
    }

    return messages;
  }

  findOne(id: string) {
    const message = this.data.messages().find((item) => item.id === id);
    if (!message) throw new NotFoundException(`Message ${id} was not found.`);
    return message;
  }

  create(dto: CreateMessageDto) {
    const trip = this.data.findTrip(dto.tripId);
    const message: MessageEntity = {
      id: `MSG-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tripId: trip.id,
      tripTitle: trip.title,
      fromRole: dto.fromRole,
      fromName: dto.fromName,
      toRoles: dto.toRoles?.length ? dto.toRoles : ['all'],
      body: dto.body,
      createdAt: this.data.now(),
    };
    this.data.messages().unshift(message);
    this.data.addUpdate(trip, dto.fromName, 'Message Sent', `${dto.fromName}: ${dto.body}`, 'Message');
    this.data.notify(
      trip,
      `Message from ${dto.fromName}`,
      `${dto.fromName} sent a message on ${trip.id}: ${dto.body}`,
      'Message',
      message.toRoles.includes('all') ? ['traveler', 'partner', 'guide', 'vendor', 'support'] : message.toRoles,
    );
    return message;
  }

  update(id: string, dto: UpdateMessageDto) {
    const message = this.findOne(id);
    Object.assign(message, dto);
    return message;
  }

  remove(id: string) {
    const message = this.findOne(id);
    this.data.messages().splice(this.data.messages().indexOf(message), 1);
    return { id, deleted: true };
  }
}
