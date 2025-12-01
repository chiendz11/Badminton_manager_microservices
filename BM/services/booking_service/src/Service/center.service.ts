import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Center, SportCenterDocument } from "../Schema/center.schema";
import { CenterPricing } from "src/Schema/center-pricing.schema";
import { error } from "console";

@Injectable()
export class CenterService {
    constructor(
        @InjectModel(Center.name)
        private centerModel: Model<SportCenterDocument>,
    ) {}

    async findCenterPricingById(CenterID : string) : Promise<CenterPricing | null> {
        const center = await this.centerModel.findOne({centerId: CenterID}).exec();
        if (!center) {
            throw new error('Center not found');
        }
        return center.pricing;
    }
}