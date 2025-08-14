import { Dispatch } from 'redux';

// Card data shape
export interface CardData {
  [key: string]: any;
}

// Action type constant
export const SET_CARD = 'SET_CARD' as const;

// Action creator
export const setCard = (card: CardData | null) => ({
  type: SET_CARD,
  payload: card,
});

// Optional thunk
// export const setCardThunk = (card: CardData | null) => (dispatch: Dispatch) => {
//   dispatch(setCard(card));
// };

// Action type
export type CardAction = { type: typeof SET_CARD; payload: CardData | null };
