import { 
  ADD_TO_CART, 
  REMOVE_FROM_CART, 
  CLEAR_CART, 
  CartItem 
} from '../../types/orderTypes';

export const addToCart = (item: CartItem) => ({
  type: ADD_TO_CART,
  payload: item,
});

export const removeFromCart = (cartId: string) => ({
  type: REMOVE_FROM_CART,
  payload: cartId,
});

export const clearCart = () => ({
  type: CLEAR_CART,
});