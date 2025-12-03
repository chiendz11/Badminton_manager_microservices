import { gql } from 'graphql-tag';

export const typeDefs = gql`
    extend type Query {
        centers: [Center!]! 
        center(centerId: String!): Center
    }

    input TimeSlotInput {
        startTime: String
        endTime: String
        price: Float
    }

    input PricingInput {
        weekday: [TimeSlotInput]
        weekend: [TimeSlotInput]
    }

    # Input Update
    input UpdateCenterInput {
        name: String
        address: String
        phone: String
        description: String
        totalCourts: Int
        facilities: [String]
        googleMapUrl: String
        isActive: Boolean
        logoFileId: String
        imageFileIds: [String] 
        pricing: PricingInput
        centerManagerId: String # ✅ ĐÃ THÊM TRƯỜNG NÀY ĐỂ FIX LỖI
    }

    extend type Mutation {
        createCenter(
            name: String!, 
            address: String!, 
            phone: String!,
            description: String,
            totalCourts: Int,
            facilities: [String],
            logoFileId: String,
            imageFileIds: [String], 
            googleMapUrl: String,
            pricing: PricingInput,
            centerManagerId: String # Cho phép truyền manager ngay lúc tạo (nếu cần)
        ): Center!

        updateCenter(centerId: String!, data: UpdateCenterInput!): Center!

        deleteCenter(centerId: String!): Boolean!
    }

    # 1. Định nghĩa Type Court
    type Court {
        id: ID
        courtId: String!
        name: String!
        type: String
        isActive: Boolean
    }

    type Center @key(fields: "centerId") {
        id: ID!
        centerId: String!
        name: String!
        address: String!
        phone: String
        description: String
        googleMapUrl: String
        totalCourts: Int
        facilities: [String]
        
        logoFileId: String
        logoUrl: String 
        imageFileIds: [String]
        imageUrlList: [String]
        
        avgRating: Float
        bookingCount: Int
        isActive: Boolean
        centerManagerId: String
        pricing: Pricing

        # 2. THÊM DÒNG NÀY: Mối quan hệ 1-n
        courts: [Court] 
    }
    
    type Pricing { weekday: [TimeSlot], weekend: [TimeSlot] }
    type TimeSlot { startTime: String, endTime: String, price: Float }
`;