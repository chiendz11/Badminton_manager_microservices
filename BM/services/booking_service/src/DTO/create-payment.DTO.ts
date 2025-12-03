  import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, MaxLength, IsUrl } from 'class-validator';

  export class CreatePaymentDto {
    @IsString()
    @IsNotEmpty()
    bookingId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1000, { message: 'Số tiền phải lớn hơn 1.000 VNĐ' })
    amount: number;  

    @IsString()
    @MaxLength(255)
    description: string;

    @IsUrl()
    @IsNotEmpty()
    returnUrl: string;

    @IsNotEmpty()
    @IsUrl()
    @IsString()
    cancelUrl: string;
    
    @IsOptional()
    items?: any[];
  }