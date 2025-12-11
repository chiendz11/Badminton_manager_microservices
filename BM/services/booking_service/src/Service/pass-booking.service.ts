import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PassPost, PassPostDocument, PassPostStatus } from '../Schema/pass-booking.schema';
import { Booking, BookingDocument, BookingStatus } from '../Schema/booking.schema';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class Pass_bookingService {
    private readonly START_HOUR = 5; 

    constructor(
        @InjectModel(PassPost.name) private passPostModel: Model<PassPostDocument>,
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    ) {}

    async createPassPost(userId: string, createDto: { bookingId: string, resalePrice: number, description: string }) {
        const { bookingId, resalePrice, description } = createDto;

        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        if (booking.userId.toString() !== userId) {
            throw new ForbiddenException('You do not own this booking');
        }

        if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Booking status invalid for resale (Must be Confirmed/Pending).');
        }

        // Rule 3: Check if already posted
        const existingPost = await this.passPostModel.findOne({ 
            bookingId: new Types.ObjectId(bookingId),
            status: { $in: [PassPostStatus.ACTIVE, PassPostStatus.SOLD] } 
        });
        if (existingPost) {
            throw new BadRequestException('This booking is already listed on the marketplace.');
        }

        // Rule 4: Time Validation (Must be at least 1 hour before play time)
        // We need to calculate the *Earliest Start Time* from the booking details
        const earliestSlot = this.getEarliestSlot(booking.courtBookingDetails);
        const playTime = new Date(booking.bookDate);
        playTime.setHours(earliestSlot, 0, 0, 0); // Set hour based on slot

        const now = new Date();
        const ONE_HOUR = 60 * 60 * 1000;

        if (now.getTime() > playTime.getTime() - ONE_HOUR) {
             throw new BadRequestException('Too late to pass. Must post at least 1 hour before play time.');
        }

        // C. Create Post
        const newPost = new this.passPostModel({
            bookingId: new Types.ObjectId(bookingId),
            sellerId: userId,
            originalPrice: booking.price,
            resalePrice: resalePrice,
            description: description,
            status: PassPostStatus.ACTIVE,
            expiresAt: playTime // Expire exactly when the game starts
        });

        return await newPost.save();
    }

    // --- 2. GET MARKETPLACE LIST (SEARCH) ---
async getAllPassPosts() {
        const now = new Date();

        const pipeline: any[] = [
            // 1. FILTER: Only show Active posts that haven't expired
            { 
                $match: {
                    status: PassPostStatus.ACTIVE,
                    expiresAt: { $gt: now } 
                }
            },

            // 2. SORT: Newest posts appear first
            { $sort: { createdAt: -1 } },

            // 3. JOIN BOOKING: Get Court Name, Time, Center Info
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'bookingId',
                    foreignField: '_id',
                    as: 'booking'
                }
            },
            { $unwind: '$booking' },

            // 4. JOIN USER: Get Seller Name/Avatar
            {
                $lookup: {
                    from: 'users',
                    // Assuming sellerId in PassPost is a String matching userId in Users
                    localField: 'sellerId', 
                    foreignField: 'userId',
                    as: 'seller'
                }
            },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },

            // 5. FORMAT OUTPUT (Calculate Discount & Clean Data)
            {
                $project: {
                    _id: 1,
                    description: 1,
                    resalePrice: 1,
                    originalPrice: 1,
                    expiresAt: 1,
                    updatedAt: 1,
                    
                    // Seller Info for the Card UI
                    seller: {
                        userId: '$seller.userId',
                        name: '$seller.name',
                        avatar: '$seller.avatar_url'
                    },

                    // Booking Info
                    booking: {
                        _id: '$booking._id',
                        centerId: '$booking.centerId',
                        bookDate: '$booking.bookDate',
                        // We need details to calculate the time string (e.g., 17:00-19:00)
                        courtBookingDetails: '$booking.courtBookingDetails', 
                        courtName: { $arrayElemAt: ['$booking.courtBookingDetails.courtId', 0] } // Simple fallback
                    },

                    // Calculate Discount % on the fly
                    discountPercent: {
                        $cond: {
                            if: { $gt: ['$originalPrice', 0] },
                            then: {
                                $multiply: [
                                    { $divide: [{ $subtract: ['$originalPrice', '$resalePrice'] }, '$originalPrice'] },
                                    100
                                ]
                            },
                            else: 0
                        }
                    }
                }
            }
        ];

        const posts = await this.passPostModel.aggregate(pipeline).exec();

        // 6. Post-Process: Format Time Slots (Integers -> String)
        return posts.map(post => ({
            ...post,
            discountPercent: Math.round(post.discountPercent), // Round to whole number (e.g., 15%)
            timeDisplay: this.formatTimeDisplay(post.booking.courtBookingDetails)
        }));
    }

    // Helper: Convert court details [17, 18] to "17:00 - 19:00"
    private formatTimeDisplay(details: any[]): string {
        if (!details || details.length === 0) return 'N/A';
        
        // Take the first court's slots (assuming user sells the whole booking)
        const slots = details[0].timeslots || [];
        if (slots.length === 0) return 'N/A';

        const sorted = slots.sort((a, b) => a - b);
        const start = sorted[0];
        const end = sorted[sorted.length - 1] + 1; // Slot 17 covers 17:00 to 18:00

        return `${start}:00 - ${end}:00`;
    }

    // --- 3. HELPER: Get Earliest Slot ---
    // Used to determine expiration time
    private getEarliestSlot(details: any[]): number {
        let min = 24;
        details.forEach(d => {
            if (d.timeslots && d.timeslots.length > 0) {
                const localMin = Math.min(...d.timeslots);
                if (localMin < min) min = localMin;
            }
        });
        return min; // e.g., returns 17 (5 PM)
    }

    // --- 4. HELPER: Format Time Slots for UI ---
    // Converts DB structure to readable string "San 1: 17:00-19:00"
    private formatTimeSlotsForUI(courtDetails: any[]): string {
        if (!courtDetails || courtDetails.length === 0) return '';
        
        // Example logic: Just take the first court details for simplicity in list view
        // Or map all of them
        const firstCourt = courtDetails[0];
        const slots = firstCourt.timeslots.sort((a, b) => a - b);
        
        if (slots.length === 0) return '';

        const start = slots[0];
        const end = slots[slots.length - 1] + 1; // +1 because slot 17 means 17:00-18:00

        // You might want to map courtId to Court Name via another lookup if needed
        return `${start}:00 - ${end}:00`; 
    }
    
}