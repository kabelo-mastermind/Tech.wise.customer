// redux/reducers/authReducer.js
const initialState = {
  card: null,
};

const cardPayments = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_CARD':
      return { ...state, card: action.payload };
    default:
      return state;
  }
};

export default cardPayments;