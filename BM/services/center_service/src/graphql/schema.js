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
        imageFileIds: [String] # Đã sửa từ image_file_ids
        pricing: PricingInput
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
            imageFileIds: [String], # Đã sửa từ image_file_ids
            googleMapUrl: String,
            pricing: PricingInput
        ): Center!

        updateCenter(centerId: String!, data: UpdateCenterInput!): Center!

        deleteCenter(centerId: String!): Boolean!
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
        imageFileIds: [String] # Đã sửa từ image_file_ids
        imageUrlList: [String]
        
        avgRating: Float
        bookingCount: Int
        isActive: Boolean
        centerManagerId: String
        pricing: Pricing
    }
    
    type Pricing { weekday: [TimeSlot], weekend: [TimeSlot] }
    type TimeSlot { startTime: String, endTime: String, price: Float }
`;