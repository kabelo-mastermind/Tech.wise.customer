import { MessageAction, ADD_MESSAGE, CLEAR_MESSAGES, MessageData } from '../actions/messageAction';

export interface MessageState {
  messages: MessageData[];
}

const initialState: MessageState = { messages: [] };

const messageReducer = (
  state: MessageState = initialState,
  action: MessageAction
): MessageState => {
  console.log('Reducer called with action:', action);
  switch (action.type) {
    case ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case CLEAR_MESSAGES:
      return { ...state, messages: [] };
    default:
      return state;
  }
};

export default messageReducer;
