import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Notification, NotificationDocument } from '../Schema/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notiModel: Model<NotificationDocument>,
  ) {}

  // 🔥 LẮNG NGHE SỰ KIỆN TỪ RABBITMQ
  @RabbitSubscribe({
    exchange: 'notification_exchange',    // Tên Exchange muốn nghe 
    routingKey: 'create_notification', // Key định tuyến 
    queue: 'notification_queue',     // Tên hàng đợi riêng cho service này
  })
  public async handleBookingNotification(msg: any) {
    console.log(`📩 Nhận thông báo: ${JSON.stringify(msg)}`);

    try {
      // Mapping dữ liệu từ tin nhắn sang Schema
      // Giả sử msg nhận được là: { userId: '...', notiMessage: '...', notiType: '...' }
      const newNoti = new this.notiModel({
        userId: msg.userId,
        notiMessage: msg.notiMessage,
        notiType: msg.notiType,
        isRead: false, // Mặc định chưa đọc
      });

      await newNoti.save();
      console.log('✅ Đã lưu thông báo vào MongoDB');
    } catch (error) {
      console.error('❌ Lỗi khi lưu thông báo:', error);
      // Có thể implement logic Retry hoặc Dead Letter Queue ở đây nếu cần
    }
  }
  async getNotifications(userId: string) {
    return this.notiModel
      .find({ userId })
      .sort({ createdAt: -1 }) // Mới nhất lên đầu
      .limit(50) // Giới hạn 50 tin gần nhất để đỡ lag
      .exec();
  }

  // 🟢 2. API: Đánh dấu đã đọc (khi user mở bảng thông báo lên)
  async markAsRead(userId: string) {
    return this.notiModel.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
    );
  }
  
  // 🟢 3. API: Đếm số thông báo chưa đọc (để hiện số đỏ trên quả chuông)
  async countUnread(userId: string) {
      const count = await this.notiModel.countDocuments({ userId, isRead: false });
      return { unreadCount: count };
  }
}