// redux/reducers/tripReducer.js
const initialState = {
    message: null, // Store trip data in this object
  };
  
  const messageReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'SET_MESSAGE_DATA':
        return {
          ...state,
          message: action.payload,
        };
      default:
        return state;
    }
  };
  
  export default messageReducer;