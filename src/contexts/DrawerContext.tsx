// DrawerContext.js
import React, { createContext, useContext, useState } from 'react';

const DrawerContext = createContext();

export const DrawerProvider = ({ children }) => {
  const [drawer, setDrawer] = useState(null);

  const openDrawer = () => {
    if (drawer) {
      drawer.openDrawer();
    }
  };

  const closeDrawer = () => {
    if (drawer) {
      drawer.closeDrawer();
    }
  };

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, setDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
