import { 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Req, 
  NotFoundException, 
  UseGuards
} from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { BookingService } from '../Service/booking.service';
import { CreateBookingDTO } from '../DTO/create-booking.DTO';
import { BookingStatus } from '../Schema/booking.schema';
import { GatewayAuthGuard } from '../gateway-auth.guard';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';


@Controller()
export class BookingController {
  // this is like declaring variable in a class in java
  constructor(
    private readonly bookingService: BookingService
  ) {}

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
    @Body('centerId') centerId: string,
    @Body('date') date: string,
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

  @Get()
  async findAll() {
    return this.bookingService.findAllBookings();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const booking = await this.bookingService.findBookingById(id);
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  @Get(':userId')
  async findByUser(@Param('userId') userId: string) {
    return this.bookingService.findAllBookingsByUserId(userId);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string, 
    @Body('status') status: BookingStatus
  ) {
    switch (status) {
      case BookingStatus.PROCESSING:
        const updated = await this.bookingService.updateBookingStatusToProcessing(id);
        if (!updated) throw new NotFoundException('Booking not found');
        return updated;
      case BookingStatus.CONFIRMED:
      case BookingStatus.CANCELLED:
      case BookingStatus.FAILED:
      case BookingStatus.PENDING:
      default:
        throw new NotFoundException('Status update not supported');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.bookingService.deleteBooking(id);
    if (!deleted) throw new NotFoundException('Booking not found');
    return { message: 'Booking deleted successfully', id };
  }
}
