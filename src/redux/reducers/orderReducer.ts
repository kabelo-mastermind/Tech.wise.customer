import { 
  OrderState, 
  OrderActionTypes, 
  ADD_TO_CART, 
  REMOVE_FROM_CART, 
  CLEAR_CART 
} from '../../types/orderTypes';

const initialState: OrderState = {
  cart: [],
};

const orderReducer = (state = initialState, action: OrderActionTypes): OrderState => {
  switch (action.type) {
    case ADD_TO_CART: {
      const item = action.payload;
      const existing = state.cart.find((i) => i.cartId === item.cartId);

      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.cartId === item.cartId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }

      return { ...state, cart: [...state.cart, item] };
    }

    case REMOVE_FROM_CART: {
      const id = action.payload;
      const item = state.cart.find((i) => i.cartId === id);

      if (item && item.quantity > 1) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.cartId === id ? { ...i, quantity: i.quantity - 1 } : i
          ),
        };
      }

      return {
        ...state,
        cart: state.cart.filter((i) => i.cartId !== id),
      };
    }

    case CLEAR_CART:
      return { ...state, cart: [] };

    default:
      return state;
  }
};

export default orderReducer;