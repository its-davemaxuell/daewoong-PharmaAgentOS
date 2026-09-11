"use client";
import { createContext, useContext } from "react";
export const StartupReady = createContext(true);
export function useStartupReady() { return useContext(StartupReady); }
