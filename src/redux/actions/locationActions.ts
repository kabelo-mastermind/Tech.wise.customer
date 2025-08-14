export const SET_ORIGIN = 'SET_ORIGIN';
export const SET_DESTINATION = 'SET_DESTINATION';
export const SET_LOCATION = 'SET_LOCATION';
export const SET_DISTANCE = 'SET_DISTANCE';
export const SET_DURATION = 'SET_DURATION';

export interface Coordinates {
  latitude: number | null;
  longitude: number | null;
  address?: string;
}

interface SetOriginAction {
  type: typeof SET_ORIGIN;
  payload: Coordinates;
}

interface SetDestinationAction {
  type: typeof SET_DESTINATION;
  payload: Coordinates;
}

interface SetLocationAction {
  type: typeof SET_LOCATION;
  payload: Coordinates;
}

interface SetDistanceAction {
  type: typeof SET_DISTANCE;
  payload: number;
}

interface SetDurationAction {
  type: typeof SET_DURATION;
  payload: number;
}

export type LocationAction =
  | SetOriginAction
  | SetDestinationAction
  | SetLocationAction
  | SetDistanceAction
  | SetDurationAction;

export const setOrigin = (origin: Coordinates): SetOriginAction => ({
  type: SET_ORIGIN,
  payload: origin,
});

export const setDestination = (destination: Coordinates): SetDestinationAction => ({
  type: SET_DESTINATION,
  payload: destination,
});

export const setDistance = (distance: number): SetDistanceAction => ({
  type: SET_DISTANCE,
  payload: distance,
});

export const setDuration = (duration: number): SetDurationAction => ({
  type: SET_DURATION,
  payload: duration,
});
