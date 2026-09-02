import { Role } from '../common/role.enum';

export type TripStatus = 'requested' | 'planning' | 'ongoing' | 'completed' | 'cancelled';
export type ScheduleStatus = 'upcoming' | 'in-progress' | 'completed';
export type ScheduleOwner = 'guide' | 'vendor';

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: Role;
  status: 'Active' | 'Inactive' | 'Suspended';
  monthlySalary?: number;
  availabilityStatus?: string;
  availability?: string;
  profile?: Record<string, any>;
  joined: string;
}

export interface GuideEntity {
  id: string;
  name: string;
  initials: string;
  languages: string;
  experience: string;
  rating: number;
  tours: number;
  status: 'Available' | 'Assigned' | 'Inactive';
}

export interface VendorEntity {
  id: string;
  name: string;
  type: string;
  location: string;
  rating: number;
  trips: number;
  status: 'Available' | 'Requested' | 'Assigned' | 'Inactive';
}

export interface UpdateEntity {
  id: string;
  source: string;
  title: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface ScheduleItemEntity {
  id: string;
  day: number;
  date: string;
  time: string;
  title: string;
  owner: ScheduleOwner;
  location: string;
  status: ScheduleStatus;
  updatedBy: string;
  updatedAt: string;
  notes: string;
  lastStatus?: string;
}

export interface TripEntity {
  id: string;
  requestId: string;
  title: string;
  destination: string;
  travelerName: string;
  travelerEmail: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  travelersCount: number;
  budget: number;
  paymentStatus?: string;
  paidAt?: string;
  paymentMethod?: string;
  status: TripStatus;
  requestStatus: string;
  stage: string;
  guide?: Pick<GuideEntity, 'id' | 'name' | 'initials'>;
  guideStatus: string;
  vendor?: Pick<VendorEntity, 'id' | 'name' | 'type'>;
  vendorStatus: string;
  serviceStatus: string;
  progress: number;
  currentLocation: string;
  currentActivity: string;
  scheduleStarted: boolean;
  schedule: ScheduleItemEntity[];
  updates: UpdateEntity[];
  notes?: string;
  accommodationType?: string;
  tripPace?: string;
  interests: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface NotificationEntity {
  id: string;
  roles: string[];
  tripId: string;
  tripTitle: string;
  title: string;
  message: string;
  type: string;
  readBy: string[];
  createdAt: string;
}

export interface IssueEntity {
  id: string;
  tripId: string;
  tripTitle: string;
  reportedBy: string;
  reporterRole: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  attachmentUrl?: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  resolution: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface MessageEntity {
  id: string;
  tripId: string;
  tripTitle: string;
  fromRole: string;
  fromName: string;
  toRoles: string[];
  body: string;
  createdAt: string;
}

export interface PackageEntity {
  id: string;
  title: string;
  destination: string;
  description: string;
  durationDays: number;
  budget: number;
  highlights: string[];
  schedule: Omit<ScheduleItemEntity, 'id' | 'date' | 'status' | 'updatedBy' | 'updatedAt' | 'lastStatus'>[];
  imageUrl: string;
}

export interface WorkflowState {
  version: number;
  nextTripNumber: number;
  nextIssueNumber: number;
  users: UserEntity[];
  guides: GuideEntity[];
  vendors: VendorEntity[];
  trips: TripEntity[];
  notifications: NotificationEntity[];
  deletedNotifIds?: string[];
  issues: IssueEntity[];
  messages: MessageEntity[];
  packages: PackageEntity[];
  partnerReadItems?: string[];
}
