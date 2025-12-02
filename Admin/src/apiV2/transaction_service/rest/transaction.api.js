import axiosInstance from '../../../config/axiosConfig';

const SELL_ENDPOINT = '/api/transactions/sell';

export async function getSellHistories(params = {}) {
  try {
    const response = await axiosInstance.get(SELL_ENDPOINT, { params });
    return response;
  } catch (error) {
    console.error('Error fetching sell histories:', error);
    throw error;
  }
}

export async function createSellHistory(payload) {
  try {
    const response = await axiosInstance.post(SELL_ENDPOINT, payload);
    return response;
  } catch (error) {
    console.error('Error creating sell history:', error);
    throw error;
  }
}
