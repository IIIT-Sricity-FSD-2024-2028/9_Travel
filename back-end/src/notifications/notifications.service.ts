import { Injectable, NotFoundException } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { ReadNotificationDto } from './dto/read-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly data: DataService) {}

  findAll(role?: string, userEmail?: string) {
    const notifications = this.data.notifications();
    if (!role) return notifications;

    const email = (userEmail || '').trim().toLowerCase();

    if (role === 'traveler') {
      if (!email) return [];
      const userTrips = this.data.trips().filter(
        (t) => (t.travelerEmail || '').toLowerCase() === email
      );
      const userTripIds = new Set(
        userTrips.map((t) => t.id).concat(userTrips.map((t) => t.requestId).filter(Boolean) as string[])
      );

      return notifications.filter((item) => {
        const matchesRole = item.roles.includes('traveler') || item.roles.includes('all');
        if (!matchesRole) return false;
        if (item.tripId) {
          return userTripIds.has(item.tripId);
        }
        return false;
      });
    }

    return notifications.filter(
      (item) => item.roles.includes(role) || item.roles.includes('all'),
    );
  }

  markRead(id: string, dto: ReadNotificationDto) {
    const notification = this.data.notifications().find((item) => item.id === id);
    if (!notification) throw new NotFoundException(`Notification ${id} was not found.`);
    if (!notification.readBy.includes(dto.role)) notification.readBy.push(dto.role);
    return notification;
  }

  remove(id: string) {
    const notification = this.data.notifications().find((item) => item.id === id);
    if (!notification) throw new NotFoundException(`Notification ${id} was not found.`);
    this.data.notifications().splice(this.data.notifications().indexOf(notification), 1);
    return { id, deleted: true };
  }
}
