import 'react-native-get-random-values';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigations/RootNavigator';
import { DestinationContextProvider, OriginContextProvider } from './src/contexts/contexts';
import { DriverDestinationContextProvider, DriverOriginContextProvider } from './src/contexts/driverContexts';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/redux/store';
import { LogBox } from "react-native";
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import NetworkBanner from './src/components/NetworkBanner';
import Toast from "react-native-toast-message";
import { toastConfig } from "./src/components/CustomToast"; // ✅ if you created custom config

LogBox.ignoreLogs([
  "Text strings must be rendered within a <Text> component",
]);

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GestureHandlerRootView style={styles.container}>
          {/* Network Banner */}
          <NetworkBanner />
          {/* Driver contexts */}
          <DriverOriginContextProvider>
            <DriverDestinationContextProvider>
              {/* Customer contexts */}
              <DestinationContextProvider>
                <OriginContextProvider>
                  <RootNavigator />
                  {/* ✅ Add Toast here */}
                  <Toast config={toastConfig} /> 
                  {/* if you don’t want custom config, just use <Toast /> */}
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
