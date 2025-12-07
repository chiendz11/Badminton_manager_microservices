import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourtDocument = HydratedDocument<Court>;

@Schema({ collection: 'courts', timestamps: true }) // Tự động map vào collection 'courts'
export class Court {
  // Field: centerId (VD: "CENTER-a63e8f1c...")
  @Prop({ type: String, required: true, index: true }) 
  centerId: string;

  // Field: courtId (VD: "COURT-003c6g43...")
  @Prop({ type: String, required: true, unique: true })
  courtId: string;

  // Field: name (VD: "Sân 3")
  @Prop({ type: String, required: true })
  name: string;
}

export const CourtSchema = SchemaFactory.createForClass(Court);