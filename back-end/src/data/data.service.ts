import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Role } from '../common/role.enum';
import {
  GuideEntity,
  IssueEntity,
  MessageEntity,
  NotificationEntity,
  PackageEntity,
  ScheduleItemEntity,
  TripEntity,
  UpdateEntity,
  UserEntity,
  VendorEntity,
  WorkflowState,
} from './entities';

const STAKEHOLDER_ROLES = ['traveler', 'partner', 'guide', 'vendor'];

const PACKAGE_SCHEDULES: Record<string, [string, string, 'guide' | 'vendor', string][]> = {
  maldives: [
    ['09:00', 'Airport pickup and speedboat transfer', 'vendor', 'Male Airport'],
    ['13:00', 'Resort check-in and welcome briefing', 'vendor', 'Island Resort'],
    ['10:00', 'Snorkeling lagoon tour', 'guide', 'House Reef'],
    ['15:00', 'Water sports session', 'vendor', 'Water Sports Center'],
    ['11:00', 'Island culture walk', 'guide', 'Local Island'],
    ['18:00', 'Sunset cruise', 'vendor', 'Resort Jetty'],
    ['10:00', 'Spa and leisure day', 'vendor', 'Resort Spa'],
    ['09:00', 'Checkout and airport transfer', 'vendor', 'Male Airport'],
  ],
  goa: [
    ['09:00', 'Traveler pickup and hotel check-in', 'vendor', 'Goa Airport'],
    ['11:00', 'North Goa beach tour', 'guide', 'Calangute'],
    ['15:00', 'Water sports coordination', 'vendor', 'Baga Beach'],
    ['10:00', 'Old Goa heritage walk', 'guide', 'Old Goa'],
    ['18:00', 'Sunset cruise and dinner', 'vendor', 'Mandovi River'],
  ],
  paris: [
    ['08:00', 'Trip kickoff and airport pickup', 'vendor', 'Charles de Gaulle Airport'],
    ['12:00', 'Hotel check-in', 'vendor', 'Paris Hotel'],
    ['10:00', 'Eiffel Tower guided tour', 'guide', 'Eiffel Tower'],
    ['14:00', 'Louvre Museum visit', 'guide', 'Louvre Museum'],
    ['18:00', 'Seine River cruise', 'vendor', 'Seine River'],
    ['10:00', 'Versailles Palace tour', 'guide', 'Versailles'],
    ['11:00', 'Checkout and airport transfer', 'vendor', 'Paris Airport'],
  ],
  rome: [
    ['09:00', 'Airport transfer and hotel check-in', 'vendor', 'Rome Airport'],
    ['10:00', 'Colosseum and Forum guided tour', 'guide', 'Colosseum'],
    ['15:00', 'Vatican Museum guided visit', 'guide', 'Vatican City'],
    ['18:00', 'Food walk and restaurant booking', 'vendor', 'Trastevere'],
    ['09:00', 'Checkout and departure transfer', 'vendor', 'Rome Airport'],
  ],
  default: [
    ['09:00', 'Arrival pickup and hotel check-in', 'vendor', 'Arrival Point'],
    ['10:00', 'Destination orientation tour', 'guide', 'City Center'],
    ['14:00', 'Featured package activity', 'guide', 'Main Attraction'],
    ['17:00', 'Vendor service coordination', 'vendor', 'Service Location'],
    ['09:00', 'Checkout and departure transfer', 'vendor', 'Departure Point'],
  ],
};

@Injectable()
export class DataService {
  private readonly stateFilePath = path.join(process.cwd(), 'state.json');
  private state: WorkflowState;
  private lastSerializedState = '';
  private deletedTripIds = new Set<string>();

  markTripDeleted(id: string) {
    this.deletedTripIds.add(id);
  }

  constructor() {
    this.state = this.loadStateFromFile();
    // Auto-save loop to persist mutations made to array references by other services
    setInterval(() => {
      this.checkAndSaveState();
    }, 1000);
  }

  private loadStateFromFile(): WorkflowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const fileContent = fs.readFileSync(this.stateFilePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.trips)) {
          this.lastSerializedState = fileContent;
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading state from file, falling back to seed:', err);
    }
    const seed = this.seedState();
    this.saveStateToFile(seed);
    return seed;
  }

  private checkAndSaveState() {
    try {
      const current = JSON.stringify(this.state);
      if (current !== this.lastSerializedState) {
        fs.writeFileSync(this.stateFilePath, current, 'utf8');
        this.lastSerializedState = current;
      }
    } catch (err) {
      console.error('Error in auto-saving state:', err);
    }
  }

  private saveStateToFile(state: WorkflowState) {
    try {
      const serialized = JSON.stringify(state, null, 2);
      if (serialized === this.lastSerializedState) return;
      fs.writeFileSync(this.stateFilePath, serialized, 'utf8');
      this.lastSerializedState = serialized;
    } catch (err) {
      console.error('Error saving state to file:', err);
    }
  }

  getState(): WorkflowState {
    return this.clone(this.state);
  }

  replaceState(state: Partial<WorkflowState>): WorkflowState {
    // Merge incoming users with the current state.
    // IMPORTANT: The frontend sync must NOT override admin deletions.
    // We use the CURRENT backend state (this.state.users) as the source of truth for the
    // user list, and only update fields from the incoming state for users that still exist.
    const superAdminSeed = this.seedState().users.find((u) => u.id === 'USER-1');
    const rawUsers = Array.isArray(state.users) ? state.users : this.state.users;

    // Filter out legacy placeholder emails that were replaced
    const incomingUsers = rawUsers.filter(
      (u) => !['vendor@gmail.com', 'guide@gmail.com'].includes(String(u.email || '').toLowerCase()),
    );

    // Backend this.state.users is the authoritative source for existing users' status, role, password, etc.
    const backendUserMap = new Map(this.state.users.map((u) => [u.id, u]));
    const backendUserEmails = new Set(this.state.users.map((u) => (u.email || '').toLowerCase()));

    // Merge: start with current backend users (keeping all recent updates like status changes and merging availability updates)
    const mergedUsers = this.state.users.map((user) => {
      const incUser = incomingUsers.find(
        (u) => u && (u.id === user.id || (u.email && u.email.toLowerCase() === (user.email || '').toLowerCase()))
      );
      if (superAdminSeed && (user.id === 'USER-1' || user.email === superAdminSeed.email)) {
        return { ...user, ...incUser, status: 'Active' as const, password: superAdminSeed.password, role: Role.SuperUser };
      }
      if (incUser) {
        return {
          ...user,
          ...incUser,
          password: user.password || incUser.password,
        };
      }
      return { ...user };
    });

    // If incomingUsers contains any new user that does not exist on the backend, append them
    incomingUsers.forEach((inc) => {
      if (inc && inc.id && !backendUserMap.has(inc.id) && inc.email && !backendUserEmails.has(inc.email.toLowerCase())) {
        mergedUsers.push(inc);
        backendUserMap.set(inc.id, inc);
        backendUserEmails.add(inc.email.toLowerCase());
      }
    });

    // Ensure the root Super Admin always exists
    if (superAdminSeed && !mergedUsers.find((u) => u.id === 'USER-1')) {
      mergedUsers.unshift(superAdminSeed);
    }

    this.state = {
      ...this.state,
      ...this.clone(state),
      users: mergedUsers,
      guides: Array.isArray(state.guides) ? state.guides : this.state.guides,
      vendors: Array.isArray(state.vendors) ? state.vendors : this.state.vendors,
      // For trips: only keep incoming trips that were NOT explicitly deleted by admin
      // This allows new traveler trip requests to persist while preventing deleted trips from reviving.
      trips: (() => {
        if (!Array.isArray(state.trips)) return this.state.trips;
        return state.trips.filter((t) => !t.id || !this.deletedTripIds.has(t.id));
      })(),
      notifications: Array.isArray(state.notifications)
        ? state.notifications
        : this.state.notifications,
      deletedNotifIds: Array.isArray(state.deletedNotifIds)
        ? Array.from(new Set([...(this.state.deletedNotifIds || []), ...state.deletedNotifIds]))
        : this.state.deletedNotifIds || [],
      issues: Array.isArray(state.issues) ? state.issues : this.state.issues,
      messages: Array.isArray(state.messages) ? state.messages : this.state.messages,
      packages: Array.isArray(state.packages) ? state.packages : this.state.packages,
      partnerReadItems: Array.isArray(state.partnerReadItems) ? state.partnerReadItems : this.state.partnerReadItems || [],
    };
    this.saveStateToFile(this.state);
    return this.getState();
  }

  persist(): void {
    this.saveStateToFile(this.state);
  }

  reset(): WorkflowState {
    this.state = this.seedState();
    this.saveStateToFile(this.state);
    return this.getState();
  }

  addUser(user: UserEntity): UserEntity {
    this.state.users = Array.isArray(this.state.users) ? this.state.users : [];
    this.state.users.push(user);
    this.saveStateToFile(this.state);
    return user;
  }

  users(): UserEntity[] {
    return this.state.users;
  }

  guides(): GuideEntity[] {
    return this.state.guides;
  }

  vendors(): VendorEntity[] {
    return this.state.vendors;
  }

  packages(): PackageEntity[] {
    return this.state.packages;
  }

  trips(): TripEntity[] {
    return this.state.trips;
  }

  issues(): IssueEntity[] {
    return this.state.issues;
  }

  messages(): MessageEntity[] {
    return this.state.messages;
  }

  notifications(): NotificationEntity[] {
    return this.state.notifications;
  }

  findTrip(id: string): TripEntity {
    const trip = this.state.trips.find((item) => item.id === id || item.requestId === id);
    if (!trip) throw new NotFoundException(`Trip ${id} was not found.`);
    return trip;
  }

  findUser(id: string): UserEntity {
    const user = this.state.users.find((item) => item.id === id || item.email === id);
    if (!user) throw new NotFoundException(`User ${id} was not found.`);
    return user;
  }

  findGuide(idOrName: string): GuideEntity {
    const guide = this.state.guides.find(
      (item) => item.id === idOrName || item.name === idOrName,
    );
    if (!guide) throw new NotFoundException(`Guide ${idOrName} was not found.`);
    return guide;
  }

  findVendor(idOrName: string): VendorEntity {
    const vendor = this.state.vendors.find(
      (item) => item.id === idOrName || item.name === idOrName,
    );
    if (!vendor) throw new NotFoundException(`Vendor ${idOrName} was not found.`);
    return vendor;
  }

  nextTripId(): string {
    const id = `TRIP-${this.state.nextTripNumber}`;
    this.state.nextTripNumber += 1;
    return id;
  }

  nextIssueId(): string {
    const id = `ISS-${this.state.nextIssueNumber}`;
    this.state.nextIssueNumber += 1;
    return id;
  }

  makeUpdate(source: string, title: string, message: string, status = 'Info'): UpdateEntity {
    return {
      id: `UPD-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      source,
      title,
      message,
      status,
      createdAt: this.now(),
    };
  }

  addUpdate(trip: TripEntity, source: string, title: string, message: string, status = 'Info') {
    trip.updates = trip.updates || [];
    trip.updates.unshift(this.makeUpdate(source, title, message, status));
    trip.updates = trip.updates.slice(0, 30);
    trip.updatedAt = this.now();
  }

  notify(
    trip: TripEntity | null,
    title: string,
    message: string,
    type = 'Info',
    roles: string[] = STAKEHOLDER_ROLES,
  ) {
    this.state.notifications.unshift({
      id: `NTF-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      roles,
      tripId: trip?.id || '',
      tripTitle: trip?.title || '',
      title,
      message,
      type,
      readBy: [],
      createdAt: this.now(),
    });
    this.state.notifications = this.state.notifications.slice(0, 150);
  }

  ensureSchedule(trip: TripEntity): ScheduleItemEntity[] {
    if (!Array.isArray(trip.schedule) || !trip.schedule.length) {
      trip.schedule = this.buildSchedule(trip);
    }
    return trip.schedule;
  }

  updateScheduleProgress(
    trip: TripEntity,
    scheduleItemId: string,
    status: string,
    notes: string,
    location: string,
    updatedBy: string,
  ): ScheduleItemEntity {
    const item = this.ensureSchedule(trip).find((entry) => entry.id === scheduleItemId);
    if (!item) throw new NotFoundException(`Schedule item ${scheduleItemId} was not found.`);
    const complete = status === 'completed';
    item.status = complete ? 'completed' : 'in-progress';
    item.notes = notes || item.notes;
    item.location = location || item.location;
    item.updatedBy = updatedBy;
    item.updatedAt = this.now();
    item.lastStatus = status;

    if (!complete) {
      trip.schedule.forEach((entry) => {
        if (entry.id !== item.id && entry.status === 'in-progress') entry.status = 'upcoming';
      });
    } else if (!trip.schedule.some((entry) => entry.status === 'in-progress')) {
      const next = trip.schedule.find((entry) => entry.status === 'upcoming');
      if (next) next.status = 'in-progress';
    }

    this.updateTripCompletion(trip);
    return item;
  }

  updateTripCompletion(trip: TripEntity): void {
    const schedule = this.ensureSchedule(trip);
    const completed = schedule.filter((item) => item.status === 'completed').length;
    const total = schedule.length || 1;
    trip.progress = Math.min(100, Math.round((completed / total) * 100));
    const current =
      schedule.find((item) => item.status === 'in-progress') ||
      schedule.find((item) => item.status === 'upcoming');
    if (current) {
      trip.currentActivity = current.title;
      trip.currentLocation = current.location;
    }
    if (completed === total) {
      trip.status = 'completed';
      trip.stage = 'Completed';
      trip.progress = 100;
      trip.currentActivity = 'Tour completed';
      trip.completedAt = trip.completedAt || this.now();
    }
  }

  ownerCompleted(trip: TripEntity, owner: 'guide' | 'vendor'): boolean {
    const items = this.ensureSchedule(trip).filter((item) => item.owner === owner);
    return Boolean(items.length) && items.every((item) => item.status === 'completed');
  }

  stageLabel(trip: TripEntity): string {
    if (trip.status === 'requested') return 'New Request';
    if (trip.status === 'cancelled') return 'Cancelled';
    if (trip.status === 'completed') return 'Completed';
    if (trip.status === 'ongoing') return 'Ongoing';
    if (
      trip.guideStatus === 'Accepted' &&
      ['Accepted', 'In Progress', 'Completed'].includes(trip.vendorStatus)
    ) {
      return 'Ready';
    }
    if (trip.guideStatus === 'Assigned' || trip.vendorStatus === 'Requested') {
      return 'Assignments Pending';
    }
    return 'Planning';
  }

  stripPassword(user: UserEntity) {
    const { password, ...safe } = user;
    return safe;
  }

  now(): string {
    return new Date().toISOString();
  }

  private seedState(): WorkflowState {
    const users: UserEntity[] = [
      this.user('USER-1', 'Super Admin', 'superadmin@gmail.com', 'admin123', Role.SuperUser),
      this.user('USER-2', 'N Bharath', 'traveler@gmail.com', '123456', Role.Traveler),
      this.user('USER-3', 'Dileep', 'dileep@gmail.com', '123456', Role.Partner),
      this.user('USER-4', 'Mahendra', 'mahendra@gmail.com', '123456', Role.Support),
      this.user('USER-5', 'Lokesh', 'lokesh@gmail.com', '123456', Role.Vendor),
      this.user('USER-6', 'Koushik', 'koushik@gmail.com', '123456', Role.Guide),
    ];

    return {
      version: 5,
      nextTripNumber: 1,
      nextIssueNumber: 1,
      users,
      guides: [],
      vendors: [],
      trips: [],
      notifications: [],
      issues: [],
      messages: [],
      packages: [
        {
          id: 'PKG-1',
          title: 'Maldives Escape',
          destination: 'Male, Maldives',
          description: 'A beautiful escape to the Maldives.',
          durationDays: 7,
          budget: 5000,
          highlights: ['7 Days Premium Resort stay', 'Snorkeling & Water Sports', 'Daily breakfast & spa included'],
          imageUrl: '../../images/maldives_package.png',
          schedule: [
            { day: 1, time: '09:00', title: 'Airport pickup and speedboat transfer', owner: 'vendor', location: 'Male Airport', notes: '' },
            { day: 1, time: '13:00', title: 'Resort check-in and welcome briefing', owner: 'vendor', location: 'Island Resort', notes: '' },
            { day: 2, time: '10:00', title: 'Snorkeling lagoon tour', owner: 'guide', location: 'House Reef', notes: '' },
            { day: 3, time: '15:00', title: 'Water sports session', owner: 'vendor', location: 'Water Sports Center', notes: '' },
            { day: 4, time: '11:00', title: 'Island culture walk', owner: 'guide', location: 'Local Island', notes: '' },
            { day: 5, time: '18:00', title: 'Sunset cruise', owner: 'vendor', location: 'Resort Jetty', notes: '' },
            { day: 6, time: '10:00', title: 'Spa and leisure day', owner: 'vendor', location: 'Resort Spa', notes: '' },
            { day: 7, time: '09:00', title: 'Checkout and airport transfer', owner: 'vendor', location: 'Male Airport', notes: '' }
          ]
        },
        {
          id: 'PKG-2',
          title: 'Swiss Alps Adventure',
          destination: 'Zurich, Switzerland',
          description: 'An adventurous trip to the Swiss Alps.',
          durationDays: 5,
          budget: 4000,
          highlights: ['5 Days Alpine Lodge stay', 'Skiing & Snowboarding passes', 'Glacier Express train ride'],
          imageUrl: '../../images/swiss_alps_package.png',
          schedule: [
            { day: 1, time: '09:00', title: 'Arrival and Lodge check-in', owner: 'vendor', location: 'Zurich Airport', notes: '' },
            { day: 2, time: '10:00', title: 'Skiing Adventure', owner: 'guide', location: 'Swiss Alps', notes: '' },
            { day: 3, time: '14:00', title: 'Snowboarding coordination', owner: 'vendor', location: 'Ski Slopes', notes: '' },
            { day: 4, time: '11:00', title: 'Glacier Express scenic ride', owner: 'guide', location: 'Train Station', notes: '' },
            { day: 5, time: '12:00', title: 'Checkout and departure transfer', owner: 'vendor', location: 'Zurich Airport', notes: '' }
          ]
        },
        {
          id: 'PKG-3',
          title: 'Japan Expedition',
          destination: 'Tokyo, Japan',
          description: 'Explore the wonders of Japan.',
          durationDays: 9,
          budget: 6000,
          highlights: ['9 Days Multi-city Tour', 'Shinkansen (Bullet Train) passes', 'Historic Temples & Modern Cities'],
          imageUrl: '../../images/japan_package.png',
          schedule: [
            { day: 1, time: '09:00', title: 'Airport transfer & hotel check-in', owner: 'vendor', location: 'Tokyo Airport', notes: '' },
            { day: 2, time: '10:00', title: 'Temple Tour & Cultural Walk', owner: 'guide', location: 'Senso-ji Temple', notes: '' },
            { day: 3, time: '13:00', title: 'Akihabara tech exploration', owner: 'guide', location: 'Tokyo', notes: '' },
            { day: 4, time: '09:00', title: 'Bullet train to Kyoto & check-in', owner: 'vendor', location: 'Kyoto Station', notes: '' },
            { day: 5, time: '10:00', title: 'Kinkaku-ji (Golden Pavilion) tour', owner: 'guide', location: 'Kyoto', notes: '' },
            { day: 6, time: '14:00', title: 'Arashiyama Bamboo Grove walk', owner: 'guide', location: 'Kyoto', notes: '' },
            { day: 7, time: '09:00', title: 'Bullet train to Osaka & food walk', owner: 'vendor', location: 'Dotonbori', notes: '' },
            { day: 8, time: '10:00', title: 'Osaka Castle guided tour', owner: 'guide', location: 'Osaka Castle', notes: '' },
            { day: 9, time: '09:00', title: 'Checkout & Kansai Airport transfer', owner: 'vendor', location: 'Kansai Airport', notes: '' }
          ]
        }
      ],
    };
  }

  private normalizeTrip(partial: Partial<TripEntity>): TripEntity {
    const now = this.now();
    const id = partial.id || `TRIP-${Date.now()}`;
    const adults = Number(partial.adults || 1);
    const children = Number(partial.children || 0);
    const trip: TripEntity = {
      id,
      requestId: partial.requestId || id.replace('TRIP', 'REQ'),
      title: partial.title || `${partial.destination || 'Custom'} Trip`,
      destination: partial.destination || 'Custom destination',
      travelerName: partial.travelerName || 'Traveler',
      travelerEmail: partial.travelerEmail || '',
      startDate: partial.startDate || '',
      endDate: partial.endDate || '',
      adults,
      children,
      travelersCount: Number(partial.travelersCount || adults + children || 1),
      budget: Number(partial.budget || 0),
      status: partial.status || 'requested',
      requestStatus: partial.requestStatus || 'Requested',
      stage: partial.stage || 'New Request',
      guide: partial.guide,
      guideStatus: partial.guideStatus || (partial.guide ? 'Assigned' : 'Pending'),
      vendor: partial.vendor,
      vendorStatus: partial.vendorStatus || (partial.vendor ? 'Requested' : 'Pending'),
      serviceStatus: partial.serviceStatus || 'Pending',
      progress: Number(partial.progress || 0),
      currentLocation: partial.currentLocation || partial.destination || 'Custom destination',
      currentActivity: partial.currentActivity || 'Awaiting trip coordination',
      scheduleStarted: Boolean(
        partial.scheduleStarted ||
          partial.status === 'ongoing' ||
          partial.status === 'completed',
      ),
      schedule: partial.schedule || [],
      updates: partial.updates || [],
      notes: partial.notes || '',
      accommodationType: partial.accommodationType || 'standard',
      tripPace: partial.tripPace || 'moderate',
      interests: partial.interests || [],
      createdAt: partial.createdAt || now,
      updatedAt: partial.updatedAt || now,
      startedAt: partial.startedAt,
      completedAt: partial.completedAt,
    };
    trip.stage = this.stageLabel(trip);
    if (trip.scheduleStarted) this.ensureSchedule(trip);
    return trip;
  }

  private buildSchedule(trip: TripEntity): ScheduleItemEntity[] {
    const template = PACKAGE_SCHEDULES[this.packageKey(trip)] || PACKAGE_SCHEDULES.default;
    return template.map((item, index) => ({
      id: `SCH-${trip.id}-${index + 1}`,
      day: index + 1,
      date: this.addDays(trip.startDate || this.now(), index),
      time: item[0],
      title: item[1],
      owner: item[2],
      location: item[3] || trip.destination,
      status: index === 0 ? 'in-progress' : 'upcoming',
      updatedBy: 'Travel Partner',
      updatedAt: this.now(),
      notes: '',
    }));
  }

  private packageKey(trip: TripEntity): string {
    const text = `${trip.title} ${trip.destination}`.toLowerCase();
    if (text.includes('maldives') || text.includes('male')) return 'maldives';
    if (text.includes('goa')) return 'goa';
    if (text.includes('paris') || text.includes('france')) return 'paris';
    if (text.includes('rome') || text.includes('italy')) return 'rome';
    return 'default';
  }

  private addDays(value: string, days: number): string {
    const date = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return this.now().slice(0, 10);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private user(
    id: string,
    name: string,
    email: string,
    password: string,
    role: Role,
  ): UserEntity {
    return {
      id,
      name,
      email,
      password,
      role,
      status: 'Active',
      joined: this.now(),
    };
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}
