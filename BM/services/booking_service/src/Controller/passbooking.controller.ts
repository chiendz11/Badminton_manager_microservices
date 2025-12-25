import { Param, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PassPostService } from '../Service/pass-booking.service';
import { GatewayAuthGuard } from '../gateway-auth.guard';

// Simple DTO definition to match the Service input
export class CreatePassPostDto {
  bookingId: string;
  resalePrice: number;
  description: string;
}

@Controller('api/pass-booking')
export class PassPostController {
  constructor(private readonly passBookingService: PassPostService) {}

  // 1. Create Pass Post (Resell Booking)
  // Matches: POST /pass-booking/create
  @Post('create')
  @UseGuards(GatewayAuthGuard)
  async createPassPost(@Body() createDto: CreatePassPostDto, @Req() req: any) {
    const userId = req.user?.userId;

    return this.passBookingService.createPassPost(userId, createDto);
  }

  @Get('list')
  @UseGuards(GatewayAuthGuard)
  async getAllPassPosts(@Req() req:any) {
    const userId = req.user?.userId;
    return this.passBookingService.getAllPassPosts(userId);
  }

  @Get('my-posts')
  @UseGuards(GatewayAuthGuard)
  async getMyPassPosts(@Req() req: any) {
    // Lấy userId từ token của người đang đăng nhập
    const userId = req.user?.userId;

    return this.passBookingService.getPassPostsBySellerId(userId);
  }

  @Post('interest/:postId')
  @UseGuards(GatewayAuthGuard)
  async toggleInterest(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user?.userId; // Lấy ID người đang login
    return this.passBookingService.toggleInterest(userId, postId);
  }

  /**
   * 2. Đếm số lượng người quan tâm
   * Method: GET
   * URL: /api/.../interest/count/:postId
   * Note: API này có thể để Public (không cần Guard) nếu muốn khách vãng lai cũng thấy số lượng like.
   */
  @Get('interest/count/:postId')
  // @UseGuards(GatewayAuthGuard) // 👈 Bỏ comment nếu muốn bắt buộc login mới xem được số lượng
  async countInterestedUsers(@Param('postId') postId: string) {
    const count = await this.passBookingService.countInterestedUsers(postId);
    return { count }; // Trả về dạng Object JSON: { "count": 5 }
  }

  /**
   * 3. Lấy danh sách chi tiết người quan tâm (Cho chủ sân xem)
   * Method: GET
   * URL: /api/.../interest/users/:postId
   */
  @Get('interest/users/:postId')
  @UseGuards(GatewayAuthGuard)
  async getInterestedUsers(@Param('postId') postId: string) {
    return this.passBookingService.getInterestedUsersByPostId(postId);
  }

  @Get('interest/check/:postId')
  @UseGuards(GatewayAuthGuard)
  async checkInterest(@Param('postId') postId: string, @Req() req: any) {
    const userId = req.user?.userId;
    return this.passBookingService.checkInterest(userId, postId);
  }
}