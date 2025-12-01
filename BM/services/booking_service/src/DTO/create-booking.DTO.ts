import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsNumber, IsMongoId, IsArray, ValidateNested } from 'class-validator';

class CourtBookingDetailDTO {
    @IsMongoId()
    @IsNotEmpty()
    courtId: string;

    @IsArray()
    @IsNotEmpty({ each: true })
    @IsInt({ each: true })
    @Min(0, { each: true })
    timeslots: number[];
}

export class CreateBookingDTO {
    @IsString()
    @IsNotEmpty()
    centerId: string;

    @IsString()
    @IsNotEmpty()
    userName: string;
    
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CourtBookingDetailDTO)
    courtBookingDetails: CourtBookingDetailDTO[];

    @IsDateString()
    @IsNotEmpty()
    bookDate : string;
}
