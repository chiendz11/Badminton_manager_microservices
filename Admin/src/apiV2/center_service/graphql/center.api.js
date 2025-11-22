import axiosInstance from '../../../config/axiosConfig';

const GRAPHQL_ENDPOINT = "/graphql";


// -----------------------------------------------------------
// 💡 CẬP NHẬT: Đổi image_file_ids -> imageFileIds
// -----------------------------------------------------------
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
    $pricing: PricingInput
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
      pricing: $pricing
    ) {
      centerId
      name
    }
  }
`;

export const createCenterGQL = async (variables) => {
    // Map biến từ JS sang đúng tên biến GraphQL
    const gqlVariables = {
        ...variables,
        imageFileIds: variables.image_file_ids // Map image_file_ids (từ UI) -> imageFileIds (GraphQL)
    };
    
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
        query: CREATE_CENTER_MUTATION,
        variables: gqlVariables,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.createCenter;
};

const UPDATE_CENTER_MUTATION = `
  mutation UpdateCenter($centerId: String!, $data: UpdateCenterInput!) {
    updateCenter(centerId: $centerId, data: $data) {
      centerId
      name
    }
  }
`;

export const updateCenterGQL = async (centerId, data) => {
    // Map biến từ JS sang đúng tên biến GraphQL cho input object
    const gqlData = {
        ...data,
        imageFileIds: data.image_file_ids, // Map image_file_ids -> imageFileIds
    };
    delete gqlData.image_file_ids; // Xóa field cũ để tránh lỗi "unknown field"

    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
        query: UPDATE_CENTER_MUTATION,
        variables: { centerId, data: gqlData },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateCenter;
};

// 💡 SỬA LỖI CHÍNH: Query dùng logoFileId và imageFileIds
const GET_ALL_CENTERS_QUERY = `
  query GetCenters {
    centers {
      centerId
      name
      address
      phone
      logoUrl 
      imageUrlList 
      imageFileIds # Đã sửa từ image_file_ids
      logoFileId   # Đã sửa từ logo_file_id
      avgRating
      totalCourts
      isActive
      centerManagerId
      googleMapUrl
    }
  }
`;

export const getAllCentersGQL = async () => {
    try {
        const response = await axiosInstance.post(GRAPHQL_ENDPOINT, { query: GET_ALL_CENTERS_QUERY });
        if (response.data.errors) throw new Error(response.data.errors[0].message);
        
        // Map lại data trả về để khớp với code UI (UI đang dùng image_file_ids)
        return response.data.data.centers.map(center => ({
            ...center,
            image_file_ids: center.imageFileIds,
            logo_file_id: center.logoFileId
        }));
    } catch (error) {
        throw error;
    }
};

const GET_CENTER_DETAIL_QUERY = `
  query GetCenterDetail($centerId: String!) {
    center(centerId: $centerId) {
      centerId
      name
      address
      phone
      description
      logoUrl
      imageUrlList
      imageFileIds # Đã sửa
      logoFileId   # Đã sửa
      facilities
      googleMapUrl
      totalCourts
      isActive
      pricing {
        weekday { startTime endTime price }
        weekend { startTime endTime price }
      }
    }
  }
`;

export const getCenterInfoByIdGQL = async (centerId) => {
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, {
        query: GET_CENTER_DETAIL_QUERY,
        variables: { centerId },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    
    const data = response.data.data.center;
    // Map lại data
    return {
        ...data,
        image_file_ids: data.imageFileIds,
        logo_file_id: data.logoFileId
    };
};

export const deleteCenterGQL = async (centerId) => {
    const query = `mutation Delete($id: String!) { deleteCenter(centerId: $id) }`;
    const response = await axiosInstance.post(GRAPHQL_ENDPOINT, { query, variables: { id: centerId } });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.deleteCenter;
};