// orderDetailsAction.ts
export const ORDER_DETAILS_UPDATE = 'ORDER_DETAILS_UPDATE';
export const ORDER_DETAILS_CLEAR = 'ORDER_DETAILS_CLEAR';
export const ORDER_DETAILS_UPDATE_DRIVER_ID = 'ORDER_DETAILS_UPDATE_DRIVER_ID';
export const ORDER_DETAILS_UPDATE_STATUS = 'ORDER_DETAILS_UPDATE_STATUS';

export interface OrderDetailsType {
  orderId: string;
  status: string;
  customerId: string;
  driverId: string;
  orderNumber: string;
  timestamp?: number;
}

export const updateOrderDetails = (orderDetails: OrderDetailsType) => ({
  type: ORDER_DETAILS_UPDATE,
  payload: orderDetails,
});

export const updateOrderDriverId = (orderId: string, driverId: string) => ({
  type: ORDER_DETAILS_UPDATE_DRIVER_ID,
  payload: { orderId, driverId },
});

export const updateOrderStatus = (orderId: string, status: string) => ({
  type: ORDER_DETAILS_UPDATE_STATUS,
  payload: { orderId, status },
});

export const clearOrderDetails = () => ({
  type: ORDER_DETAILS_CLEAR,
});