import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { CourtBookingDetailSchema, CourtBookingDetail } from './court-booking-detail.schema';

@Schema()
export class PricingSlot {
    @Prop({required: true})
    startTime: string;
    
    @Prop({required: true})
    endTime: string;

    @Prop({required: true})
    price: number;
}

export const PricingSlotSchema = SchemaFactory.createForClass(PricingSlot);

@Schema({_id: false})
export class CenterPricing {
    @Prop({type: [PricingSlotSchema], required: true})
    weekday: PricingSlot[];

    @Prop({type: [PricingSlotSchema], required: true})
    weekend: PricingSlot[];
}

export const CenterPricingSchema = SchemaFactory.createForClass(CenterPricing);