// Action for setting the origin
export const setOrigin = (origin) => ({
  type: 'SET_ORIGIN',
  payload: origin,
});

// Action for setting the destination
export const setDestination = (destination) => ({
  type: 'SET_DESTINATION',
  payload: destination,
});

// Action for setting distance
export const setDistance = (distance) => ({
  type: 'SET_DISTANCE',
  payload: distance,
});

// Action for setting duration (time)
export const setDuration = (duration) => ({
  type: 'SET_DURATION',
  payload: duration,
});

// Asynchronous action for fetching location
export const fetchLocation = () => {
  return async (dispatch) => {
    try {
      // Replace 'someApiCall' with your actual API call or logic to get location
      const location = await someApiCall(); // Call your API or async function to get location

      // Dispatching the action with the fetched location
      dispatch({
        type: 'SET_LOCATION',
        payload: location,
      });
    } catch (error) {
      console.error("Error fetching location:", error);
      // You can dispatch a failure action if needed, like:
      // dispatch({ type: 'FETCH_LOCATION_ERROR', error: error.message });
    }
  };
};
