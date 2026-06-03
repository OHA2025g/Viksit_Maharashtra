import React, { createContext, useContext, useEffect, useState } from "react";

const A11yContext = createContext(null);

export function A11yProvider({ children }) {
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem("vm2047_high_contrast") === "1"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    localStorage.setItem("vm2047_high_contrast", highContrast ? "1" : "0");
  }, [highContrast]);

  return (
    <A11yContext.Provider value={{ highContrast, setHighContrast, toggleHighContrast: () => setHighContrast((v) => !v) }}>
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  return useContext(A11yContext);
}
