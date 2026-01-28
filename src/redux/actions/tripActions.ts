// Shape of the trip data
export interface TripData {
  [key: string]: any; // dynamic fields like status, coordinates, etc.
}

// Action type constants
export const SET_TRIP_DATA = 'SET_TRIP_DATA';
export const CLEAR_TRIP_DATA = 'CLEAR_TRIP_DATA';

// Action interfaces
interface SetTripDataAction {
  type: typeof SET_TRIP_DATA;
  payload: TripData;
}

interface ClearTripDataAction {
  type: typeof CLEAR_TRIP_DATA;
}

// Union type for future extensibility
export type TripAction = SetTripDataAction | ClearTripDataAction;

// Action creators
export const setTripData = (tripData: TripData): SetTripDataAction => ({
  type: SET_TRIP_DATA,
  payload: tripData,
});

export const clearTripData = (): ClearTripDataAction => ({
  type: CLEAR_TRIP_DATA,
});