// Sử dụng cú pháp template literal #graphql giúp editor highlight (nếu có extension)
export const typeDefs = `#graphql
    # Kiểu dữ liệu Center, lấy dữ liệu gốc từ Center Service
    type Center {
        id: ID!
        centerId: String!
        name: String!
        address: String!
        
        # --- NHÓM ẢNH & MEDIA ---
        # Trường chứa ID file (raw field - dữ liệu thô từ DB)
        logoFileId: String
        image_file_ids: [String] 

        # Trường tổng hợp (Computed fields - Resolver sẽ xử lý)
        logoUrl: String 
        imageUrlList: [String]   
        # ------------------------
        
        # --- CÁC TRƯỜNG KHÁC (BẮT BUỘC PHẢI CÓ ĐỂ KHỚP VỚI FRONTEND) ---
        avgRating: Float
        totalCourts: Int
        isActive: Boolean
        phone: String
        description: String
        googleMapUrl: String
        facilities: [String]
        bookingCount: Int
        
        # Kiểu dữ liệu phức tạp (Nested Object)
        pricing: Pricing
    }

    # Định nghĩa kiểu dữ liệu giá (Pricing)
    type Pricing {
        weekday: [TimeSlot]
        weekend: [TimeSlot]
    }

    # Định nghĩa khung giờ (TimeSlot)
    type TimeSlot {
        startTime: String
        endTime: String
        price: Float
    }

    # Định nghĩa các truy vấn (Queries)
    type Query {
        # Lấy danh sách trung tâm
        centers: [Center!]! 
        
        # Lấy chi tiết trung tâm
        center(centerId: String!): Center
    }

    # Định nghĩa các thay đổi (Mutations)
    type Mutation {
        # Tạo mới một Center (cần nhận logoFileId nếu muốn set logo ngay lúc tạo)
        createCenter(name: String!, address: String!, logoFileId: String): Center!
    }
`;