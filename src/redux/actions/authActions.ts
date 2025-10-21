// Define your User type (expand as needed)
export interface User {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

// Action Types
export const SET_USER = 'SET_USER';

// Action creator
export const setUser = (user: User) => ({
  type: SET_USER as typeof SET_USER,
  payload: user,
});
