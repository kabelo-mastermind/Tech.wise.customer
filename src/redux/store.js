import { createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer from './reducers'; // Import your root reducer

const persistConfig = {
  key: 'root', // This key will be used to store the state in AsyncStorage
  storage: AsyncStorage, // Using AsyncStorage to persist the state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = createStore(persistedReducer);
const persistor = persistStore(store);

export { store, persistor };
