// redux/actions/tripActions.js
export const setMessageData = (messageData) => {
    return {
      type: 'SET_MESSAGE_DATA',
      payload: messageData,
    };
  };