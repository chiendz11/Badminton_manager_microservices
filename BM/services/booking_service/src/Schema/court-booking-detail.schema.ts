import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class CourtBookingDetail {
  @Prop({ type: String, required: true })
  courtId: string;

  @Prop({ type: [Number], required: true })
  timeslots: number[];
}

export const CourtBookingDetailSchema = SchemaFactory.createForClass(CourtBookingDetail);