import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePassPostDto {
    @IsNotEmpty()
    @IsString()
    bookingId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    resalePrice: number;

    @IsOptional()
    @IsString()
    description: string;
}