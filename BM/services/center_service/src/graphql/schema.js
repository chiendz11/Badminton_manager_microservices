import { gql } from 'graphql-tag';

export const typeDefs = gql`
    # --- INPUT TYPES ---
    input TimeSlotInput {
        startTime: String! # Bắt buộc "HH:mm"
        endTime: String!   # Bắt buộc "HH:mm"
        price: Float       # Giá tiền
    }

    input PricingInput {
        weekday: [TimeSlotInput]
        weekend: [TimeSlotInput]
    }

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
        
        pricing: PricingInput # 🟢 Quan trọng cho tính tiền
        centerManagerId: String
    }

    # --- OBJECT TYPES ---
    type TimeSlot { 
        startTime: String
        endTime: String
        price: Float 
    }
    
    type Pricing { 
        weekday: [TimeSlot]
        weekend: [TimeSlot] 
    }

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
        
        # 🟢 2 Field quan trọng frontend cần
        pricing: Pricing 
        courts: [Court] 
    }

    # --- QUERY & MUTATION ---
    extend type Query {
        centers: [Center!]! 
        center(centerId: String!): Center
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
            
            pricing: PricingInput, # 🟢 Input lúc tạo
            centerManagerId: String
        ): Center!

        updateCenter(centerId: String!, data: UpdateCenterInput!): Center!

        deleteCenter(centerId: String!): Boolean!
    }
`;