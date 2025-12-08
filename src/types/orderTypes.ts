export interface CartItem {
  id: number;
  name: string;
  description: string;
  price: string;
  image: any;
  restaurant: string;
  restaurantId?: number;
  quantity: number;
  selectedSize?: string;
  cartId: string;
  isSpecial?: boolean;
  specialDetails?: {
    originalPrice: string;
    discount: string;
  };
}

export interface OrderState {
  cart: CartItem[];
}

export const ADD_TO_CART = "ADD_TO_CART";
export const REMOVE_FROM_CART = "REMOVE_FROM_CART";
export const CLEAR_CART = "CLEAR_CART";

interface AddToCartAction {
  type: typeof ADD_TO_CART;
  payload: CartItem;
}

interface RemoveFromCartAction {
  type: typeof REMOVE_FROM_CART;
  payload: string; // cartId
}

interface ClearCartAction {
  type: typeof CLEAR_CART;
}

export type OrderActionTypes = 
  | AddToCartAction 
  | RemoveFromCartAction 
  | ClearCartAction;