import { AuthAction, SET_USER } from '../actions/authActions';

export interface AuthState {
  user: Record<string, any> | null;
}

const initialState: AuthState = { user: null };

const authReducer = (state: AuthState = initialState, action: AuthAction): AuthState => {
  switch (action.type) {
    case SET_USER:
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

export default authReducer;
