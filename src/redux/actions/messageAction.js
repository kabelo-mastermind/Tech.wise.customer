// redux/actions/tripActions.js

// Add a new message
export const addMessage = (messageData) => {
  return {
    type: 'ADD_MESSAGE',
    payload: messageData,
  };
};

// Optional: clear messages (e.g. on trip end)
export const clearMessages = () => {
  return {
    type: 'CLEAR_MESSAGES',
  };
};