// redux/reducers/tripReducer.js
const initialState = {
    tripData: null, // Store trip data in this object
  };
  
  const tripReducer = (state = initialState, action) => {
    switch (action.type) {
      case 'SET_TRIP_DATA':
        return {
          ...state,
          tripData: action.payload,
        };
      default:
        return state;
    }
  };
  
  export default tripReducer;
  