import {
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  NotFoundException,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { BookingService } from '../Service/booking.service';
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { BookingStatus } from '../Schema/booking.schema';
import { GatewayAuthGuard } from '../gateway-auth.guard';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GetHistoryDto } from 'src/DTO/get-history.DTO';  


@Controller()
export class BookingController {
  // this is like declaring variable in a class in java
  constructor(
    private readonly bookingService: BookingService
  ) { }

  @Post("api/pending/pendingBookingToDB")
  @UseGuards(GatewayAuthGuard)
  async create(@Body() createBookingDto: CreateBookingDTO, @Req() req: any) {
    const userId = req.user?.userId;

    return this.bookingService.createBooking({
      ...createBookingDto,
      userId,
    });
  }

  @Get('api/pending/mapping') // Final URL: GET /bookings/pending-mapping
  async getPendingMapping(
    @Query('centerId') centerId: string,
    @Query('date') date: string,
  ) {
    // 1. Basic Validation (Or use a DTO class for better validation)
    if (!centerId || !date) {
      throw new BadRequestException('centerId and date are required');
    }

    try {
      // 2. Call the Service (The logic we wrote in the previous step)
      const mapping = await this.bookingService.getPendingMappingDB(centerId, date);

      // 3. Return the response
      // NestJS automatically converts this object to JSON with status 200
      return {
        success: true,
        mapping: mapping
      };

    } catch (error) {
      // 4. Error Handling
      // In NestJS, you usually let the Global Exception Filter handle this,
      // but to match your logic explicitly:
      console.error("Error fetching pending mapping:", error);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get('/booking/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.bookingService.findAllBookingsByUserId(userId);
  }

  @Patch('/api/:bookingId')
  async updateStatus(
    @Param('bookingId') id: string,
    @Body('status') status: BookingStatus
  ) {
    const updated = await this.bookingService.updateBookingStatus(id, status);
    if (!updated) {
      throw new NotFoundException('Booking not found');
    } else {
      return updated;
    }
  }

  @Delete('/api/:bookingId')
  async remove(@Param('bookingId') id: string) {
    const deleted = await this.bookingService.deleteBooking(id);
    if (!deleted) throw new NotFoundException('Booking not found');
    return { message: 'Booking deleted successfully', id };
  }

  @Get('/api/user/:userId/booking-history') 
  async getUserBookingHistory(
    @Param('userId') userId: string,
    @Query() query: GetHistoryDto, // Hứng toàn bộ query params vào DTO
  ) {
    // Gọi sang Service với userId và object query đầy đủ
    return this.bookingService.getUserBookingHistory(userId, query);
  }

  @Get('/api/user/me/statistics')
  @UseGuards(GatewayAuthGuard)
  // @UseGuards(GatewayAuthGuard)
  async getMyStats(@Req() req: any, @Query('period') period: string) {
    // Nếu đi qua Gateway đã decode token, dùng userId từ req.user
    // Nếu test trực tiếp, dùng query param
    const userId = req.user?.userId;

    // Validate period
    const validPeriod = ['week', 'month', 'year'].includes(period) ? period : 'month';
    
    return await this.bookingService.getUserStatistics(userId, validPeriod as any);
  }

  @Get('/api/user/me/exists-pending-booking')
  @UseGuards(GatewayAuthGuard)
  async checkExistsPendingBooking(@Req() req: any) {
    const userId = req.user?.userId;
    const centerId = req.query?.centerId;
    return this.bookingService.checkExistsPendingBooking(userId, centerId);
  }

  @Get('/api/bookings')
  @UseGuards(GatewayAuthGuard) // Đảm bảo chỉ Admin/Manager gọi được (tùy role guard của bạn)
  async getAllBookings(@Query() query: any) {
    return this.bookingService.getAllBookingsForAdmin(query);
  }

  @Post('/api/create-fixed-bookings')
  @HttpCode(HttpStatus.CREATED)
  // @UseGuards(JwtAuthGuard) // Bật lại nếu cần bảo mật
  async createFixedBookings(@Body() payload: {
    userId: string;
    centerId: string;
    bookings: {
      date: string;
      courtId: string;
      timeslots: number[];
    }[];
  }) {
    // Gọi xuống service đã viết lúc nãy
    return this.bookingService.createFixedBookings(payload);
  } 

  @Post('/api/check-available-courts')
  @HttpCode(HttpStatus.OK)
  async checkAvailability(@Body() payload: {
    centerId: string;
    startDate: string;      // ISO String (Ngày bắt đầu)
    daysOfWeek: number[];   // [1, 3, 5] (Thứ 2, 4, 6)
    timeslots: string[];    // ["17:00", "18:00"] (Frontend gửi string)
  }) {
    return this.bookingService.checkAvailableCourtsForFixed(payload);
  }
}
