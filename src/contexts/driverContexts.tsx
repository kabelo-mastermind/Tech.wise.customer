// ContextFile.js
import React, { createContext, useEffect, useReducer } from 'react';
import {DriverOriginReducer, DriverDestinationReducer} from '../reducers/DriverReducers';

export const DriverOriginContext = createContext();
export const DriverDestinationContext = createContext();

export const DriverOriginContextProvider = (props) => {
    const [originDriver, dispatchOrigin] = useReducer(DriverOriginReducer, {
        latitude: null,
        longitude: null,
        address: "",
        name: "",
        id: null
    });
    // useEffect(() => {
    //     console.log('DriverOriginContext State:', originDriver);
    //   }, [originDriver]);
    return (
        <DriverOriginContext.Provider value={{ originDriver, dispatchOrigin }}>
            {props.children}
        </DriverOriginContext.Provider>
    );
};

export const DriverDestinationContextProvider = (props) => {
    const [destination, dispatchDestination] = useReducer(DriverDestinationReducer, {
        latitude: null,
        longitude: null,
        address: "",
        name: "",
        id: null
    });

    return (
        <DriverDestinationContext.Provider value={{ destination, dispatchDestination }}>
            {props.children}
        </DriverDestinationContext.Provider>
    );
};
