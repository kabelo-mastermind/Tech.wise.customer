import 'react-native-get-random-values';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigations/RootNavigator';
import { DestinationContextProvider, OriginContextProvider } from './src/contexts/contexts';
import { DriverDestinationContextProvider, DriverOriginContextProvider } from './src/contexts/driverContexts';
import { Provider } from 'react-redux'; // Import Redux provider
import { PersistGate } from 'redux-persist/integration/react'; // Import PersistGate
import { store, persistor } from './src/redux/store'; // Import the store and persistor
import { LogBox } from "react-native";
import 'react-native-gesture-handler';
import 'react-native-reanimated';

LogBox.ignoreLogs([
  "Text strings must be rendered within a <Text> component", // Ignores this specific warning
]);
// console.error = console.warn = (message) => alert(message); // Show errors as alerts
export default function App() {
  return (
    <Provider store={store}> {/* Wrap the app with Redux provider */}
      <PersistGate loading={null} persistor={persistor}> {/* Wrap the app with PersistGate to wait for state rehydration */}
        <GestureHandlerRootView style={styles.container}>
          {/* Driver contexts */}
          <DriverOriginContextProvider>
            <DriverDestinationContextProvider>
              {/* Customer contexts */}
              <DestinationContextProvider>
                <OriginContextProvider>
                  <RootNavigator />
                </OriginContextProvider>
              </DestinationContextProvider>
            </DriverDestinationContextProvider>
          </DriverOriginContextProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
