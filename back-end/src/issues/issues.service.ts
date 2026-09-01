import { Injectable, NotFoundException } from '@nestjs/common';
import { DataService } from '../data/data.service';
import { IssueEntity } from '../data/entities';
import { CreateIssueDto } from './dto/create-issue.dto';
import { ResolveIssueDto } from './dto/resolve-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssuesService {
  constructor(private readonly data: DataService) {}

  findAll() {
    return this.data.issues();
  }

  findOne(id: string) {
    const issue = this.data.issues().find((item) => item.id === id);
    if (!issue) throw new NotFoundException(`Issue ${id} was not found.`);
    return issue;
  }

  create(dto: CreateIssueDto) {
    const trip = this.data.findTrip(dto.tripId);
    const issue: IssueEntity = {
      id: this.data.nextIssueId(),
      tripId: trip.id,
      tripTitle: trip.title,
      title: dto.title,
      description: dto.description,
      type: dto.type || 'General',
      priority: dto.priority || 'Medium',
      reportedBy: dto.reportedBy || 'Member',
      reporterRole: dto.reporterRole || 'Traveler',
      attachmentUrl: dto.attachmentUrl || '',
      status: 'Open',
      resolution: '',
      createdAt: this.data.now(),
    };
    this.data.issues().unshift(issue);
    this.data.addUpdate(trip, issue.reporterRole, 'Issue Reported', `${issue.title}: ${issue.description}`, issue.priority);
    this.data.notify(trip, 'Issue Reported', `${issue.reporterRole} reported ${issue.title}. Support has been notified.`, issue.priority, ['traveler', 'partner', 'guide', 'vendor', 'support']);
    return issue;
  }

  update(id: string, dto: UpdateIssueDto) {
    const issue = this.findOne(id);
    Object.assign(issue, dto);
    return issue;
  }

  resolve(id: string, dto: ResolveIssueDto) {
    const issue = this.findOne(id);
    issue.status = 'Resolved';
    issue.resolution = dto.resolution;
    issue.resolvedAt = this.data.now();
    const trip = this.data.findTrip(issue.tripId);
    this.data.addUpdate(trip, 'Support', 'Issue Resolved', `${issue.id} resolved: ${dto.resolution}`, 'Resolved');
    this.data.notify(trip, 'Issue Resolved', `${issue.id} for ${trip.title} has been resolved: ${dto.resolution}`, 'Resolved', ['traveler', 'partner', 'guide', 'vendor', 'support']);
    return issue;
  }

  remove(id: string) {
    const issue = this.findOne(id);
    this.data.issues().splice(this.data.issues().indexOf(issue), 1);
    return { id, deleted: true };
  }
}
