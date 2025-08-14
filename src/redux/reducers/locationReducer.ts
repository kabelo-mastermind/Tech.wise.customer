import { Coordinates, LocationAction, SET_ORIGIN, SET_DESTINATION, SET_LOCATION, SET_DISTANCE, SET_DURATION } from '../actions/locationActions';

export interface LocationState {
  origin: Coordinates | null;
  destination: Coordinates | null;
  location: Coordinates | null;
  distance: number | null;
  duration: number | null;
}

const initialState: LocationState = {
  origin: null,
  destination: null,
  location: null,
  distance: null,
  duration: null,
};

export default function locationReducer(
  state: LocationState = initialState,
  action: LocationAction
): LocationState {
  switch (action.type) {
    case SET_ORIGIN:
      return { ...state, origin: action.payload };
    case SET_DESTINATION:
      return { ...state, destination: action.payload };
    case SET_LOCATION:
      return { ...state, location: action.payload };
    case SET_DISTANCE:
      return { ...state, distance: action.payload };
    case SET_DURATION:
      return { ...state, duration: action.payload };
    default:
      return state;
  }
}
