// Shape of the trip data
export interface TripData {
  [key: string]: any; // dynamic fields like status, coordinates, etc.
}

// Action type constant
export const SET_TRIP_DATA = 'SET_TRIP_DATA';

// Action interface
interface SetTripDataAction {
  type: typeof SET_TRIP_DATA;
  payload: TripData;
}

// Union type for future extensibility
export type TripAction = SetTripDataAction;

// Action creator
export const setTripData = (tripData: TripData): SetTripDataAction => ({
  type: SET_TRIP_DATA,
  payload: tripData,
});
