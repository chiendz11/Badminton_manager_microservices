import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument,Schema as MongooseSchema, Types } from 'mongoose';

@Schema()
export class CourtBookingDetail {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  courtId: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  timeslots: number[];
}

export const CourtBookingDetailSchema = SchemaFactory.createForClass(CourtBookingDetail);