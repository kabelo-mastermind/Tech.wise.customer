const initialState = {
  origin: null,
  destination: null,
  location: null,
  distance: null, // Store the distance
  duration: null, // Store the duration
};

export default function locationReducer(state = initialState, action) {
  switch (action.type) {
    case 'SET_ORIGIN':
      return {
        ...state,
        origin: action.payload,
      };
    case 'SET_DESTINATION':
      return {
        ...state,
        destination: action.payload,
      };
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.payload,
      };
    case 'SET_DISTANCE':
      return {
        ...state,
        distance: action.payload,
      };
    case 'SET_DURATION':
      return {
        ...state,
        duration: action.payload,
      };
    default:
      return state;
  }
}
