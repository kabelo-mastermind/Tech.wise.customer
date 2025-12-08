// orderDetailsReducer.ts
import {
  ORDER_DETAILS_UPDATE,
  ORDER_DETAILS_CLEAR,
  ORDER_DETAILS_UPDATE_DRIVER_ID,
  ORDER_DETAILS_UPDATE_STATUS,
  OrderDetailsType
} from '../actions/orderDetailsAction';

export interface OrderDetailsState {
  orders: {
    [orderId: string]: OrderDetailsType;
  };
  recentUpdates: OrderDetailsType[];
}

const initialState: OrderDetailsState = {
  orders: {},
  recentUpdates: [],
};

const orderDetailsReducer = (state = initialState, action: any): OrderDetailsState => {
  switch (action.type) {
    case ORDER_DETAILS_UPDATE: {
      const orderDetails: OrderDetailsType = {
        ...action.payload,
        timestamp: Date.now(),
      };
      
      return {
        ...state,
        orders: {
          ...state.orders,
          [orderDetails.orderId]: orderDetails,
        },
        recentUpdates: [
          orderDetails,
          ...state.recentUpdates.slice(0, 9), // Keep only last 10 updates
        ],
      };
    }

    case ORDER_DETAILS_UPDATE_DRIVER_ID: {
      const { orderId, driverId } = action.payload;
      const existingOrder = state.orders[orderId];
      
      if (!existingOrder) {
        return state;
      }
      
      return {
        ...state,
        orders: {
          ...state.orders,
          [orderId]: {
            ...existingOrder,
            driverId,
            timestamp: Date.now(),
          },
        },
      };
    }

    case ORDER_DETAILS_UPDATE_STATUS: {
      const { orderId, status } = action.payload;
      const existingOrder = state.orders[orderId];
      
      if (!existingOrder) {
        return state;
      }
      
      const updatedOrder: OrderDetailsType = {
        ...existingOrder,
        status,
        timestamp: Date.now(),
      };
      
      return {
        ...state,
        orders: {
          ...state.orders,
          [orderId]: updatedOrder,
        },
        recentUpdates: [
          updatedOrder,
          ...state.recentUpdates.filter(update => update.orderId !== orderId).slice(0, 9),
        ],
      };
    }

    case ORDER_DETAILS_CLEAR:
      return initialState;

    default:
      return state;
  }
};

export default orderDetailsReducer;