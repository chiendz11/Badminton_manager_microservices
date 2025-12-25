import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq'; 
import { Queue } from 'bullmq';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'; // 👈 Import RabbitMQ
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs'

import {User, UserDocument} from '../Schema/user.schema'

import { PassPost, PassPostDocument, PassPostStatus } from '../Schema/pass-booking.schema';
import { Booking, BookingDocument, BookingStatus } from '../Schema/booking.schema';
import { InterestedUser, InterestedUserDocument} from '../Schema/interested_user.schema';

@Injectable()
export class PassPostService {
    private readonly logger = new Logger(PassPostService.name);
    private readonly CENTER_SERVICE_URL = 'http://center_service:5003/api/v1/centers';

    constructor(
        @InjectModel(PassPost.name) private passPostModel: Model<PassPostDocument>,
        @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
        @InjectQueue('booking-expiration') private readonly bookingQueue: Queue,
        @InjectModel(InterestedUser.name) private interestedUserModel: Model<InterestedUserDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly httpService: HttpService,
        
        // 👇 Inject RabbitMQ Connection
        private readonly amqpConnection: AmqpConnection,
    ) {}

    async checkInterest(userId: string, postId: string) {
        if (!Types.ObjectId.isValid(postId)) {
            return { isInterested: false }; // ID sai thì coi như chưa quan tâm
        }

        const interest = await this.interestedUserModel.findOne({
            userId: userId,
            postId: new Types.ObjectId(postId)
        }).exec();

        // Trả về true nếu tìm thấy, false nếu không
        return { isInterested: !!interest };
    }

    async getInterestedUsersByPostId(postId: string) {
        // 1. Validate xem string gửi lên có đúng format ObjectId không
        if (!Types.ObjectId.isValid(postId)) {
            throw new BadRequestException('Invalid Post ID format');
        }

        const pipeline: any[] = [
            { 
                $match: { 
                    // 👇 QUAN TRỌNG: Phải ép kiểu sang ObjectId thì MongoDB mới tìm thấy
                    postId: new Types.ObjectId(postId) 
                } 
            },
            { $sort: { createdAt: -1 } }, // Người quan tâm mới nhất lên đầu
            {
                $lookup: {
                    from: 'users',             // Tên collection User trong DB
                    localField: 'userId',      // userId trong bảng InterestedUser (đang là String)
                    foreignField: 'userId',    // userId trong bảng User (đang là String)
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,           
                    createdAt: 1,     
                    // Map data user ra cho gọn
                    user: {
                        userId: '$userInfo.userId',
                        name: '$userInfo.name',
                        avatar: '$userInfo.avatar_url',
                        phone: '$userInfo.phone_number',
                        email: '$userInfo.email' 
                    }
                }
            }
        ];

        return await this.interestedUserModel.aggregate(pipeline).exec();
    }

    async toggleInterest(userId: string, postId: string) {
        const pId = new Types.ObjectId(postId);

        // 1. Kiểm tra tồn tại
        const existingInterest = await this.interestedUserModel.findOne({
            userId: userId,
            postId: pId
        });

        if (existingInterest) {
            // A. Đã quan tâm -> Xóa
            await existingInterest.deleteOne();
            return { action: 'uninterested', message: 'Đã bỏ quan tâm' };
        } else {
            // B. Chưa quan tâm -> Tạo mới
            await this.interestedUserModel.create({
                userId: userId,
                postId: pId
            });

            // --- 🔔 BẮN NOTI VỚI TÊN USER ---
            try {
                // Chạy song song 2 query: 
                // 1. Lấy thông tin bài đăng (để biết sellerId là ai)
                // 2. Lấy thông tin user đang bấm quan tâm (để lấy name)
                const [post, user] = await Promise.all([
                    this.passPostModel.findById(pId).select('sellerId').exec(),
                    this.userModel.findOne({ userId: userId }).select('name').exec()
                ]);
                
                // Fallback: Nếu không tìm thấy tên thì ghi tạm là "Một thành viên"
                const interestedUserName = user ? user.name : 'Một thành viên';

                // Chỉ bắn noti nếu người quan tâm KHÔNG PHẢI là chủ bài đăng
                if (post && post.sellerId !== userId) {
                    this.amqpConnection.publish(
                        'notification_exchange', 
                        'create_notification',   
                        {
                            userId: post.sellerId, // Bắn cho chủ post
                            // 👇 MESSAGE ĐÃ CÓ TÊN CỤ THỂ
                            notiMessage: `${interestedUserName} đang quan tâm đến tin pass sân của bạn. Nhấn để liên hệ ngay!`,
                            notiType: 'PASS_INTERESTED',
                            isRead: false,
                            metadata: { 
                                postId: postId,
                                interestedUserId: userId
                            }
                        }
                    );
                }
            } catch (error) {
                this.logger.error(`Failed to publish interest notification: ${error.message}`);
            }
            // ------------------------------

            return { action: 'interested', message: 'Đã thêm vào danh sách quan tâm' };
        }
    }

    // Hàm đếm số lượng người quan tâm của 1 post (Dùng để hiển thị lên UI)
    async countInterestedUsers(postId: string) {
         return await this.interestedUserModel.countDocuments({ postId: new Types.ObjectId(postId) });
    }

    async getPassPostsBySellerId(sellerId: string) {
        // 1. Pipeline lấy dữ liệu (Bỏ filter status active để xem lịch sử)
        const pipeline: any[] = [
            { 
                $match: { sellerId: sellerId } // 👈 Lọc theo ID người bán
            },
            { $sort: { createdAt: -1 } }, // Bài mới nhất lên đầu
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'bookingId',
                    foreignField: '_id',
                    as: 'booking'
                }
            },
            { $unwind: '$booking' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sellerId', 
                    foreignField: 'userId', // Giả sử sellerId trong Post map với userId trong bảng User
                    as: 'seller'
                }
            },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    description: 1,
                    resalePrice: 1,
                    originalPrice: 1,
                    status: 1,       // 👈 Cần lấy Status để hiện thị (Đang bán/Đã bán)
                    expiresAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    seller: {
                        userId: '$seller.userId',
                        name: '$seller.name',
                        avatar: '$seller.avatar_url'
                    },
                    booking: {
                        _id: '$booking._id',
                        centerId: '$booking.centerId',
                        bookDate: '$booking.bookDate',
                        courtBookingDetails: '$booking.courtBookingDetails',
                        courtIdToCheck: { $arrayElemAt: ['$booking.courtBookingDetails.courtId', 0] } 
                    },
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

        // 2. Map qua từng bài đăng để gọi API bổ sung thông tin Center/Court
        // (Logic này tái sử dụng giống hệt hàm getAllPassPosts)
        const enrichedPosts = await Promise.all(posts.map(async (post) => {
            let centerName = 'Unknown Center';
            let courtName = 'Unknown Court';
            
            const centerId = post.booking.centerId;
            const courtIdToCheck = post.booking.courtIdToCheck;

            try {
                // Gọi API sang Center Service
                const response = await firstValueFrom(
                    this.httpService.get(`${this.CENTER_SERVICE_URL}/${centerId}`)
                );
                
                const centerData = response.data;
                
                if (centerData) {
                    centerName = centerData.name || 'Unknown Center';

                    if (centerData.courts && Array.isArray(centerData.courts)) {
                        const foundCourt = centerData.courts.find(c => 
                             String(c.courtId) === String(courtIdToCheck)
                        );
                        
                        if (foundCourt) {
                            courtName = foundCourt.name; 
                        }
                    }
                }
            } catch (error) {
                // Log warning nhẹ thôi để không spam log lỗi nếu service center die
                this.logger.warn(`Could not fetch center details for Post ${post._id}`);
            }

            return {
                ...post,
                discountPercent: Math.round(post.discountPercent),
                timeDisplay: this.formatTimeDisplay(post.booking.courtBookingDetails),
                booking: {
                    ...post.booking,
                    centerName: centerName,
                    courtName: courtName,
                }
            };
        }));

        return enrichedPosts;
    }

    async createPassPost(userId: string, createDto: { bookingId: string, resalePrice: number, description: string }) {
        const { bookingId, resalePrice, description } = createDto;

        const booking = await this.bookingModel.findById(bookingId).exec();
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // 1. Check Owner
        if (booking.userId.toString() !== userId) {
            throw new ForbiddenException('You do not own this booking');
        }

        // 2. Check Booking Status
        if (booking.bookingStatus !== BookingStatus.CONFIRMED) {
            throw new BadRequestException('Booking status invalid for resale (Must be Confirmed).');
        }

        // 3. Check Duplicate Post
        const existingPost = await this.passPostModel.findOne({ 
            bookingId: new Types.ObjectId(bookingId),
            status: { $in: [PassPostStatus.ACTIVE, PassPostStatus.SOLD] } 
        });
        if (existingPost) {
            throw new BadRequestException('This booking is already listed on the marketplace.');
        }

        // =========================================================
        // ⏰ 4. TÍNH PLAYTIME (Giờ bắt đầu đá)
        // =========================================================
        
        // A. Lấy giờ bắt đầu sớm nhất
        const earliestSlot = this.getEarliestSlot(booking.courtBookingDetails);
        
        // B. Kết hợp Ngày (bookDate) + Giờ (earliestSlot)
        const playTime = new Date(booking.bookDate);
        playTime.setHours(earliestSlot, 0, 0, 0); 

        // C. Kiểm tra quy tắc 1 giờ
        const now = new Date();
        const ONE_HOUR = 60 * 60 * 1000;
        
        // Thời điểm hết hạn đăng bài (PlayTime - 1 tiếng)
        const expirationTime = new Date(playTime.getTime() - ONE_HOUR);

        if (now > expirationTime) {
             throw new BadRequestException('Too late to pass. Must post at least 1 hour before play time.');
        }

        // 5. Create Post
        const newPost = new this.passPostModel({
            bookingId: new Types.ObjectId(bookingId),
            sellerId: userId,
            originalPrice: booking.price,
            resalePrice: resalePrice,
            description: description,
            status: PassPostStatus.ACTIVE,
            expiresAt: expirationTime 
        });

        const savedPost = await newPost.save();

        // 👇 [NOTI 1] BẮN NOTI KHI TẠO PASS POST THÀNH CÔNG
        try {
            this.amqpConnection.publish(
                'notification_exchange',
                'create_notification',
                {
                    userId: userId,
                    notiMessage: `Bạn đã đăng tin pass sân #${bookingId.slice(-4)} thành công!`,
                    notiType: 'PASS_POST_CREATED',
                    isRead: false,
                    metadata: { postId: savedPost._id.toString() }
                }
            );
        } catch (error) {
            this.logger.error("Failed to publish RabbitMQ notification", error);
        }

        // 6. Schedule Auto-Expire Job (BullMQ)
        const delay = expirationTime.getTime() - now.getTime(); // Tính thời gian còn lại

        if (delay > 0) {
            await this.bookingQueue.add(
                'expire-pass-post', 
                { 
                    postId: savedPost._id.toString(),
                    sellerId: userId,
                    bookingId: bookingId
                }, 
                { 
                    delay: delay, 
                    removeOnComplete: true 
                }
            );
            this.logger.log(`Scheduled expiration for Post ${savedPost._id} in ${Math.round(delay/60000)} minutes`);
        }

        return savedPost;
    }

    // --- HELPER FUNCTIONS ---

    private getEarliestSlot(details: any[]): number {
        let min = 24; 
        if (!details || details.length === 0) return 0;

        details.forEach(detail => {
            if (detail.timeslots && detail.timeslots.length > 0) {
                const localMin = Math.min(...detail.timeslots);
                if (localMin < min) min = localMin;
            }
        });
        return min === 24 ? 0 : min;
    }

    // Helper: Convert court details [17, 18] to "17:00 - 19:00"
    // Thêm tham số userId (có thể null nếu là guest, nhưng ở đây mình giả sử đã login)
    async getAllPassPosts(currentUserId?: string) {
        const now = new Date();

        // Tạo điều kiện lọc cơ bản
        const matchCondition: any = {
            status: PassPostStatus.ACTIVE,
            expiresAt: { $gt: now } 
        };

        // 👇 NẾU CÓ USER ID, LOẠI BỎ BÀI ĐĂNG CỦA USER ĐÓ
        if (currentUserId) {
            matchCondition.sellerId = { $ne: currentUserId }; 
        }

        // 1. Pipeline lấy dữ liệu gốc từ DB
        const pipeline: any[] = [
            { 
                $match: matchCondition // 👈 Sử dụng điều kiện đã tạo ở trên
            },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'bookings',
                    localField: 'bookingId',
                    foreignField: '_id',
                    as: 'booking'
                }
            },
            { $unwind: '$booking' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'sellerId', 
                    foreignField: 'userId',
                    as: 'seller'
                }
            },
            { $unwind: { path: '$seller', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    description: 1,
                    resalePrice: 1,
                    originalPrice: 1,
                    expiresAt: 1,
                    updatedAt: 1,
                    seller: {
                        userId: '$seller.userId',
                        name: '$seller.name',
                        avatar: '$seller.avatar_url'
                    },
                    booking: {
                        _id: '$booking._id',
                        centerId: '$booking.centerId',
                        bookDate: '$booking.bookDate',
                        courtBookingDetails: '$booking.courtBookingDetails',
                        courtIdToCheck: { $arrayElemAt: ['$booking.courtBookingDetails.courtId', 0] } 
                    },
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

        // 2. Map qua từng bài đăng để gọi API bổ sung thông tin (Logic giữ nguyên)
        const enrichedPosts = await Promise.all(posts.map(async (post) => {
            let centerName = 'Unknown Center';
            let courtName = 'Unknown Court';
            
            const centerId = post.booking.centerId;
            const courtIdToCheck = post.booking.courtIdToCheck;

            try {
                const response = await firstValueFrom(
                    this.httpService.get(`${this.CENTER_SERVICE_URL}/${centerId}`)
                );
                
                const centerData = response.data;
                
                if (centerData) {
                    centerName = centerData.name || 'Unknown Center';
                    if (centerData.courts && Array.isArray(centerData.courts)) {
                        const foundCourt = centerData.courts.find(c => 
                             String(c.courtId) === String(courtIdToCheck)
                        );
                        if (foundCourt) {
                            courtName = foundCourt.name; 
                        }
                    }
                }
            } catch (error) {
                // Silent error
            }

            return {
                ...post,
                discountPercent: Math.round(post.discountPercent),
                timeDisplay: this.formatTimeDisplay(post.booking.courtBookingDetails),
                booking: {
                    ...post.booking,
                    centerName: centerName,
                    courtName: courtName,
                }
            };
        }));

        return enrichedPosts;
    }
    private formatTimeDisplay(details: any[]): string {
        // Kiểm tra dữ liệu đầu vào
        if (!details || details.length === 0) return 'N/A';
        
        // Lấy danh sách khung giờ (timeslots) từ phần tử đầu tiên
        // Giả sử structure là: [{ courtId: '...', timeslots: [5, 6] }]
        const slots = details[0].timeslots || [];
        
        if (slots.length === 0) return 'N/A';

        // Sắp xếp giờ từ bé đến lớn để tìm giờ bắt đầu và kết thúc
        const sorted = slots.sort((a: number, b: number) => a - b);
        
        const start = sorted[0]; 
        const end = sorted[sorted.length - 1] + 1; // Giả sử mỗi slot là 1 tiếng, thì giờ kết thúc = slot cuối + 1

        return `${start}:00 - ${end}:00`;
    }
}