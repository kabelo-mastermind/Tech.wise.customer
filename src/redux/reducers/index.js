// redux/reducers/rootReducer.js
import { combineReducers } from 'redux';
import authReducer from './authReducer';
import locationReducer from './locationReducer';
import tripReducer from './tripReducer'; // Import tripReducer
import messageReducer from './messageReducer';
import cardPayments from './cardPayments';

const rootReducer = combineReducers({
  auth: authReducer,
  location: locationReducer,
  trip: tripReducer, // Add trip reducer
  message: messageReducer,
  cardPayments: cardPayments,
});

export default rootReducer;
