import { NavigationAction, SET_LAST_SCREEN } from '../actions/navigationActions';

export interface NavigationState {
  lastScreen: string | null;
}

const initialState: NavigationState = {
  lastScreen: null,
};

const navigationReducer = (
  state: NavigationState = initialState,
  action: NavigationAction
): NavigationState => {
  switch (action.type) {
    case SET_LAST_SCREEN:
      return { ...state, lastScreen: action.payload };
    default:
      return state;
  }
};

export default navigationReducer;
