import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module';
import { TripRequestsController } from './trip-requests.controller';

@Module({
  imports: [TripsModule],
  controllers: [TripRequestsController],
})
export class TripRequestsModule {}
