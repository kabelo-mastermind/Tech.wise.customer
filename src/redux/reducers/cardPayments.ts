import { CardAction, SET_CARD, CardData } from '../actions/cardsAction';

export interface CardState {
  card: CardData | null;
}

const initialState: CardState = { card: null };

const cardPayments = (
  state: CardState = initialState,
  action: CardAction
): CardState => {
  switch (action.type) {
    case SET_CARD:
      return { ...state, card: action.payload };
    default:
      return state;
  }
};

export default cardPayments;
