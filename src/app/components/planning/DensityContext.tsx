import { createContext, useContext } from "react";

export type Density = "compact" | "comfortable";

export const DensityContext = createContext<Density>("comfortable");

export const useDensity = () => useContext(DensityContext);
