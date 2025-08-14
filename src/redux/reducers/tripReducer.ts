import { TripData, TripAction, SET_TRIP_DATA } from '../actions/tripActions';

// State interface
export interface TripState {
  tripData: TripData;
}

// Initial state
const initialState: TripState = {
  tripData: {},
};

// Reducer
const tripReducer = (state: TripState = initialState, action: TripAction): TripState => {
  switch (action.type) {
    case SET_TRIP_DATA:
      return {
        ...state,
        tripData: {
          ...state.tripData,   // Keep existing data
          ...action.payload,   // Merge new data
        },
      };
    default:
      return state;
  }
};

export default tripReducer;
