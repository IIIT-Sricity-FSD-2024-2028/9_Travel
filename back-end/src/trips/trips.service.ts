import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from '../common/role.enum';
import { DataService } from '../data/data.service';
import { TripEntity, TripStatus } from '../data/entities';
import { AssignGuideDto } from './dto/assign-guide.dto';
import { AssignVendorDto } from './dto/assign-vendor.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { GuideUpdateDto } from './dto/guide-update.dto';
import { ScheduleProgressDto } from './dto/schedule-progress.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { VendorUpdateDto } from './dto/vendor-update.dto';

@Injectable()
export class TripsService {
  constructor(private readonly data: DataService) {}

  findAll(userEmail?: string, userRole?: Role) {
    const trips = this.data.trips();
    if (!userRole || userRole === Role.SuperUser || userRole === Role.Support || userRole === Role.Partner) {
      return trips;
    }
    if (userRole === Role.Traveler && userEmail) {
      const email = userEmail.toLowerCase();
      return trips.filter((t) => (t.travelerEmail || '').toLowerCase() === email);
    }
    if (userRole === Role.Guide && userEmail) {
      const email = userEmail.toLowerCase();
      // Look up the guide by matching the user email to a guide entity
      const guideUser = this.data.users().find((u) => u.email === email && u.role === Role.Guide);
      if (!guideUser) return [];
      return trips.filter((t) =>
        t.guide && (
          t.guide.id === guideUser.id ||
          t.guide.name === guideUser.name ||
          t.guide.id.toLowerCase().includes(email.split('@')[0])
        )
      );
    }
    if (userRole === Role.Vendor && userEmail) {
      const email = userEmail.toLowerCase();
      const vendorUser = this.data.users().find((u) => u.email === email && u.role === Role.Vendor);
      if (!vendorUser) return [];
      return trips.filter((t) =>
        t.vendor && (
          t.vendor.id === vendorUser.id ||
          t.vendor.name === vendorUser.name ||
          t.vendor.id.toLowerCase().includes(email.split('@')[0])
        )
      );
    }
    return trips;
  }

  findRequests() {
    return this.data.trips().filter((trip) => trip.status === 'requested');
  }

  findOne(id: string) {
    return this.data.findTrip(id);
  }

  create(dto: CreateTripDto, asRequest = false) {
    const id = this.data.nextTripId();
    const status = (asRequest ? 'requested' : dto.status || 'planning') as TripStatus;
    const adults = Number(dto.adults || 1);
    const children = Number(dto.children || 0);
    const trip: TripEntity = {
      id,
      requestId: id.replace('TRIP', 'REQ'),
      title: dto.title,
      destination: dto.destination,
      travelerName: dto.travelerName,
      travelerEmail: dto.travelerEmail || '',
      startDate: dto.startDate || '',
      endDate: dto.endDate || '',
      adults,
      children,
      travelersCount: adults + children || 1,
      budget: Number(dto.budget || 0),
      status,
      requestStatus: asRequest ? 'Requested' : 'Accepted',
      stage: asRequest ? 'New Request' : 'Planning',
      guideStatus: 'Pending',
      vendorStatus: 'Pending',
      serviceStatus: 'Pending',
      progress: asRequest ? 0 : 10,
      currentLocation: dto.destination,
      currentActivity: asRequest
        ? 'Waiting for travel partner approval'
        : 'Travel partner created trip',
      scheduleStarted: false,
      schedule: [],
      updates: [],
      notes: dto.notes || '',
      interests: dto.interests || [],
      createdAt: this.data.now(),
      updatedAt: this.data.now(),
    };
    this.data.addUpdate(
      trip,
      asRequest ? 'Traveler' : 'Travel Partner',
      asRequest ? 'Trip Requested' : 'Trip Created',
      `${trip.travelerName} ${asRequest ? 'requested' : 'created'} ${trip.title} for ${trip.destination}.`,
      asRequest ? 'Requested' : 'Planning',
    );
    this.data.trips().unshift(trip);
    this.data.notify(
      trip,
      asRequest ? 'New Trip Request' : 'Trip Created',
      `${trip.title} is ready for coordination.`,
      asRequest ? 'Requested' : 'Planning',
      asRequest ? ['partner'] : ['traveler', 'partner'],
    );
    return trip;
  }

  update(id: string, dto: UpdateTripDto) {
    const trip = this.data.findTrip(id);
    Object.assign(trip, dto, { updatedAt: this.data.now() });
    trip.stage = this.data.stageLabel(trip);
    return trip;
  }

  remove(id: string) {
    const trip = this.data.findTrip(id);
    this.data.markTripDeleted(id);
    this.data.trips().splice(this.data.trips().indexOf(trip), 1);
    return { id, deleted: true };
  }

  cancel(id: string) {
    const trip = this.data.findTrip(id);
    trip.status = 'cancelled';
    trip.requestStatus = 'Cancelled';
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Traveler', 'Trip Cancelled', `${trip.travelerName} cancelled ${trip.title}.`, 'Cancelled');
    this.data.notify(trip, 'Trip Cancelled', `${trip.title} has been cancelled.`, 'Cancelled');
    return trip;
  }

  acceptRequest(id: string) {
    const trip = this.data.findTrip(id);
    trip.status = 'planning';
    trip.requestStatus = 'Accepted';
    trip.progress = Math.max(trip.progress, 10);
    trip.currentActivity = 'Travel partner accepted the request';
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Travel Partner', 'Request Accepted', `Travel partner accepted ${trip.title}. Assign guide and vendor next.`, 'Accepted');
    this.data.notify(trip, 'Trip Request Accepted', `Travel partner accepted ${trip.title}. Guide and vendor assignment will follow.`, 'Accepted');
    return trip;
  }

  assignGuide(id: string, dto: AssignGuideDto) {
    const trip = this.data.findTrip(id);
    const guide = this.data.findGuide(dto.guideId || dto.guideName || '');
    trip.guide = { id: guide.id, name: guide.name, initials: guide.initials };
    trip.guideStatus = 'Assigned';
    trip.progress = Math.max(trip.progress, 15);
    trip.currentActivity = `${guide.name} assigned as tour guide`;
    trip.stage = this.data.stageLabel(trip);
    guide.status = 'Assigned';
    this.data.addUpdate(trip, 'Travel Partner', 'Guide Assigned', `${guide.name} was assigned to ${trip.id}.`, 'Assigned');
    this.data.notify(trip, 'Guide Assigned', `${guide.name} was assigned to ${trip.title}.`, 'Assigned', ['traveler', 'partner', 'guide']);
    return trip;
  }

  acceptGuide(id: string) {
    const trip = this.data.findTrip(id);
    trip.guideStatus = 'Accepted';
    trip.progress = Math.max(trip.progress, 20);
    trip.currentActivity = `${trip.guide?.name || 'Guide'} accepted assignment`;
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Guide', 'Assignment Accepted', `${trip.guide?.name || 'Guide'} accepted the guide assignment for ${trip.id}.`, 'Accepted');
    this.data.notify(trip, 'Guide Accepted Assignment', `${trip.guide?.name || 'Guide'} accepted ${trip.title}.`, 'Accepted');
    return trip;
  }

  rejectGuide(id: string) {
    const trip = this.data.findTrip(id);
    const name = trip.guide?.name || 'Guide';
    trip.guide = undefined;
    trip.guideStatus = 'Pending';
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Guide', 'Assignment Rejected', `${name} rejected ${trip.id}.`, 'Rejected');
    this.data.notify(trip, 'Guide Rejected Assignment', `${name} rejected ${trip.title}.`, 'Rejected');
    return trip;
  }

  assignVendor(id: string, dto: AssignVendorDto) {
    const trip = this.data.findTrip(id);
    const vendor = this.data.findVendor(dto.vendorId || dto.vendorName || '');
    trip.vendor = { id: vendor.id, name: vendor.name, type: dto.serviceType || vendor.type };
    trip.vendorStatus = 'Requested';
    trip.serviceStatus = 'Pending';
    trip.progress = Math.max(trip.progress, 15);
    trip.currentActivity = `${vendor.name} requested for ${trip.vendor.type}`;
    trip.stage = this.data.stageLabel(trip);
    vendor.status = 'Requested';
    this.data.addUpdate(trip, 'Travel Partner', 'Vendor Requested', `${vendor.name} was requested for ${trip.id}.`, 'Pending');
    this.data.notify(trip, 'Vendor Requested', `${vendor.name} was requested for ${trip.title}.`, 'Pending', ['traveler', 'partner', 'vendor']);
    return trip;
  }

  acceptVendor(id: string) {
    const trip = this.data.findTrip(id);
    trip.vendorStatus = 'Accepted';
    trip.serviceStatus = 'Accepted';
    trip.progress = Math.max(trip.progress, 25);
    trip.currentActivity = `${trip.vendor?.name || 'Vendor'} accepted the service request`;
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Vendor', 'Service Accepted', `${trip.vendor?.name || 'Vendor'} accepted service for ${trip.id}.`, 'Accepted');
    this.data.notify(trip, 'Vendor Accepted Service', `${trip.vendor?.name || 'Vendor'} accepted ${trip.title}.`, 'Accepted');
    return trip;
  }

  rejectVendor(id: string) {
    const trip = this.data.findTrip(id);
    const name = trip.vendor?.name || 'Vendor';
    trip.vendor = undefined;
    trip.vendorStatus = 'Pending';
    trip.serviceStatus = 'Pending';
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Vendor', 'Service Rejected', `${name} rejected service for ${trip.id}.`, 'Rejected');
    this.data.notify(trip, 'Vendor Rejected Service', `${name} rejected ${trip.title}.`, 'Rejected');
    return trip;
  }

  start(id: string) {
    const trip = this.data.findTrip(id);
    if (trip.guideStatus !== 'Accepted' || trip.vendorStatus !== 'Accepted') {
      throw new BadRequestException('Guide and vendor must accept before the trip can start.');
    }
    trip.status = 'ongoing';
    trip.scheduleStarted = true;
    trip.startedAt = this.data.now();
    this.data.ensureSchedule(trip).forEach((item, index) => {
      if (item.status !== 'completed') item.status = index === 0 ? 'in-progress' : 'upcoming';
    });
    this.data.updateTripCompletion(trip);
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Travel Partner', 'Trip Started', `${trip.title} started with the planned package schedule.`, 'Ongoing');
    this.data.notify(trip, 'Trip Started', `${trip.title} is now started. Schedule is visible to every member.`, 'Ongoing');
    return trip;
  }

  schedule(id: string) {
    return this.data.ensureSchedule(this.data.findTrip(id));
  }

  updateSchedule(id: string, scheduleItemId: string, dto: ScheduleProgressDto) {
    const trip = this.data.findTrip(id);
    const item = this.data.updateScheduleProgress(
      trip,
      scheduleItemId,
      dto.status,
      dto.notes || dto.status,
      dto.location || '',
      dto.updatedBy || 'Member',
    );
    this.data.addUpdate(trip, 'Schedule', 'Schedule Updated', `${item.title} marked ${item.status}.`, item.status);
    this.data.notify(trip, 'Schedule Updated', `${trip.title}: ${item.title} is ${item.status}.`, item.status);
    return item;
  }

  guideUpdate(id: string, dto: GuideUpdateDto) {
    const trip = this.data.findTrip(id);
    const wasCompleted = trip.status === 'completed';
    const item = this.data.updateScheduleProgress(
      trip,
      dto.scheduleItemId,
      dto.status === 'completed' ? 'completed' : 'in-progress',
      dto.notes || dto.statusText || 'Guide update',
      dto.location || '',
      trip.guide?.name || 'Tour Guide',
    );
    trip.guideStatus = this.data.ownerCompleted(trip, 'guide') ? 'Completed' : 'Accepted';
    trip.currentActivity = dto.notes || item.title;
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Guide', dto.statusText || 'Guide Update', `${item.title}: ${dto.notes || dto.statusText || dto.status}.`, dto.status === 'delay' ? 'Warning' : 'Active');
    this.data.notify(trip, 'Guide Update', `${trip.guide?.name || 'Guide'} updated ${trip.title}: ${item.title}.`, dto.status === 'delay' ? 'Warning' : 'Active');
    if (!wasCompleted && trip.status === 'completed') {
      this.data.addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
      this.data.notify(trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
    }
    return trip;
  }

  vendorUpdate(id: string, dto: VendorUpdateDto) {
    const trip = this.data.findTrip(id);
    const wasCompleted = trip.status === 'completed';
    const item = this.data.updateScheduleProgress(
      trip,
      dto.scheduleItemId,
      dto.status === 'completed' ? 'completed' : 'in-progress',
      dto.message,
      dto.location || '',
      trip.vendor?.name || 'Vendor',
    );
    const vendorDone = this.data.ownerCompleted(trip, 'vendor');
    trip.vendorStatus = vendorDone ? 'Completed' : dto.status === 'completed' ? 'In Progress' : dto.statusText || 'In Progress';
    trip.serviceStatus = trip.vendorStatus;
    trip.currentActivity = dto.message || item.title;
    trip.stage = this.data.stageLabel(trip);
    this.data.addUpdate(trip, 'Vendor', `${trip.vendor?.type || 'Service'} Update`, `${item.title}: ${dto.message}`, dto.statusText || dto.status);
    this.data.notify(trip, `${trip.vendor?.type || 'Service'} Update`, `${trip.vendor?.name || 'Vendor'} updated ${trip.title}: ${item.title}.`, dto.statusText || dto.status);
    if (!wasCompleted && trip.status === 'completed') {
      this.data.addUpdate(trip, 'System', 'Tour Completed', `${trip.title} schedule is fully completed.`, 'Completed');
      this.data.notify(trip, 'Tour Completed', `${trip.title} has been completed.`, 'Completed');
    }
    return trip;
  }
}
