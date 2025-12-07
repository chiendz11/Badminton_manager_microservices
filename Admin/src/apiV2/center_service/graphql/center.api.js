import axiosInstance from '../../../config/axiosConfig';

const GRAPHQL_ENDPOINT = "/graphql";

// ✅ CẬP NHẬT: Thêm $centerManagerId vào mutation tạo mới
const CREATE_CENTER_MUTATION = `
  mutation CreateCenter(
    $name: String!, 
    $address: String!, 
    $phone: String!, 
    $description: String, 
    $totalCourts: Int, 
    $facilities: [String], 
    $googleMapUrl: String, 
    $logoFileId: String, 
    $imageFileIds: [String], 
    $pricing: PricingInput,
    $centerManagerId: String
  ) {
    createCenter(
      name: $name, 
      address: $address, 
      phone: $phone, 
      description: $description, 
      totalCourts: $totalCourts, 
      facilities: $facilities, 
      googleMapUrl: $googleMapUrl, 
      logoFileId: $logoFileId, 
      imageFileIds: $imageFileIds, 
      pricing: $pricing,
      centerManagerId: $centerManagerId
    ) {
      centerId
      name
    }
  }
`;

export const createCenterGQL = async (variables) => {
    const gqlVariables = {
        ...variables,
        imageFileIds: variables.image_file_ids,
        // centerManagerId đã có sẵn trong variables
    };
    
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
        query: CREATE_CENTER_MUTATION,
        variables: gqlVariables,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.createCenter;
};

// ... Các phần còn lại của file giữ nguyên như cũ ...
// (Phần UpdateCenterMutation dùng $data nên không cần sửa gì ở đây, 
// nó tự động nhận field mới từ Schema)

const UPDATE_CENTER_MUTATION = `
  mutation UpdateCenter($centerId: String!, $data: UpdateCenterInput!) {
    updateCenter(centerId: $centerId, data: $data) {
      centerId
      name
    }
  }
`;

export const updateCenterGQL = async (centerId, data) => {
    const gqlData = {
        ...data,
        imageFileIds: data.image_file_ids, 
    };
    delete gqlData.image_file_ids; 

    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
        query: UPDATE_CENTER_MUTATION,
        variables: { centerId, data: gqlData },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateCenter;
};

const CENTER_SUMMARY_FRAGMENT = `
  fragment CenterSummary on Center {
    phone
    centerId
    name
    address
    logoUrl 
    imageUrlList # 💡 THÊM: Cần lấy danh sách ảnh để chọn làm ảnh bìa (cover)
    avgRating
    totalCourts
    isActive
    centerManagerId
  }
`;

// Fragment cho thông tin chi tiết (dùng trong modal)
const CENTER_DETAIL_FRAGMENT = `
  fragment CenterDetail on Center {
    ...CenterSummary 
    phone 
    description
    googleMapUrl
    facilities
    bookingCount

    courts {
       courtId
       name
       type
       isActive
    }
    
    pricing {
      weekday {
        startTime
        endTime
        price
      }
      weekend {
        startTime
        endTime
        price
      }
    }
  }
  ${CENTER_SUMMARY_FRAGMENT}
`;

// -----------------------------------------------------------
// 💡 II. QUERIES VÀ FUNCTIONS
// -----------------------------------------------------------

const GET_ALL_CENTERS_QUERY = `
  query GetCenters {
    centers {
      ...CenterSummary
    }
  }
  ${CENTER_SUMMARY_FRAGMENT}
`;

export const getAllCentersGQL = async () => {
    try {
        const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
            query: GET_ALL_CENTERS_QUERY,
        });

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(response.data.errors[0].message || "GraphQL query failed.");
        }

        return response.data.data.centers;
    } catch (error) {
        console.error("Error fetching all centers via GraphQL:", error);
        throw error;
    }
};

const GET_CENTER_DETAIL_QUERY = `
  query GetCenterDetail($centerId: String!) {
    center(centerId: $centerId) {
      ...CenterDetail
    }
  }
  ${CENTER_DETAIL_FRAGMENT}
`;

export const getCenterInfoByIdGQL = async (centerId) => {
    try {
        const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
            query: GET_CENTER_DETAIL_QUERY,
            variables: {
                centerId: centerId,
            },
        });

        if (response.data.errors) {
            console.error("GraphQL Errors:", response.data.errors);
            throw new Error(response.data.errors[0].message || "GraphQL query failed.");
        }

        return response.data.data.center;
    } catch (error) {
        console.error(`Error fetching center info for ID ${centerId} via GraphQL:`, error);
        throw error;
    }
};

export const deleteCenterGQL = async (centerId) => {
    const query = `mutation Delete($id: String!) { deleteCenter(centerId: $id) }`;
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, { query, variables: { id: centerId } });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.deleteCenter;
};