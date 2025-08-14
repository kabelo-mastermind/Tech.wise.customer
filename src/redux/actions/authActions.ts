export const SET_USER = 'SET_USER';

interface SetUserAction {
  type: typeof SET_USER;
  payload: Record<string, any> | null;
}

export type AuthAction = SetUserAction;

export const setUser = (user: Record<string, any> | null): SetUserAction => ({
  type: SET_USER,
  payload: user,
});
