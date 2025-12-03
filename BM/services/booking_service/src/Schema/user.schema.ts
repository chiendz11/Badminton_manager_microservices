import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Mongoose, Schema as MongooseSchema} from 'mongoose';
import { CenterPricing, CenterPricingSchema } from './center-pricing.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({type: String , required: true, unique: true })
  userId: string;

  @Prop({ type: Number, required: true })
  points: number;
}

export const UserSchema = SchemaFactory.createForClass(User);