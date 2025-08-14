// Action type constants
export const ADD_MESSAGE = 'ADD_MESSAGE' as const;
export const CLEAR_MESSAGES = 'CLEAR_MESSAGES' as const;

// Message data interface
export interface MessageData {
  [key: string]: any; // Dynamic fields for messages
}

// Action creators
export const addMessage = (messageData: MessageData) => ({
  type: ADD_MESSAGE,
  payload: messageData,
});

export const clearMessages = () => ({
  type: CLEAR_MESSAGES,
});

// Action types
export type MessageAction =
  | { type: typeof ADD_MESSAGE; payload: MessageData }
  | { type: typeof CLEAR_MESSAGES };
