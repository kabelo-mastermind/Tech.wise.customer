export const SET_LAST_SCREEN = 'SET_LAST_SCREEN';

interface SetLastScreenAction {
  type: typeof SET_LAST_SCREEN;
  payload: string;
}

export type NavigationAction = SetLastScreenAction;

export const setLastScreen = (screenName: string): SetLastScreenAction => ({
  type: SET_LAST_SCREEN,
  payload: screenName,
});
