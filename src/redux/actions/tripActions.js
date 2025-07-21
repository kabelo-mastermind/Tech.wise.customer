// redux/actions/tripActions.js
export const setTripData = (tripData) => {
    return {
      type: 'SET_TRIP_DATA',
      payload: tripData,
    };
  };
  