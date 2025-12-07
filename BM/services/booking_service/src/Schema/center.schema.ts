import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Mongoose, Schema as MongooseSchema} from 'mongoose';
import { CenterPricing, CenterPricingSchema } from './center-pricing.schema';

export type SportCenterDocument = HydratedDocument<Center>;

@Schema()
export class Center {
  @Prop({type: String , required: true, unique: true })
  centerId: string;

  @Prop({ type: CenterPricingSchema, required: true })
  pricing: CenterPricing;

  @Prop({type: String, required: true})
  name: string;
}

export const CenterSchema = SchemaFactory.createForClass(Center);