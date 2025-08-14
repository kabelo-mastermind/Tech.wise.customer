import { combineReducers } from 'redux';
import authReducer, { AuthState } from './authReducer';
import locationReducer, { LocationState } from './locationReducer';
import tripReducer, { TripState } from './tripReducer';
import navigationReducer, { NavigationState } from './navigationReducer';

export interface RootState {
  auth: AuthState;
  location: LocationState;
  trip: TripState;
  navigation: NavigationState;
}

const rootReducer = combineReducers<RootState>({
  auth: authReducer,
  location: locationReducer,
  trip: tripReducer,
  navigation: navigationReducer,
});

export default rootReducer;
