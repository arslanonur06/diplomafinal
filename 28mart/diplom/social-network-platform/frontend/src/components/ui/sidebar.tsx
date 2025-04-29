"use client"; // Bu satır projeniz SPA ise gereksiz olabilir, sorun devam ederse kaldırılabilir.

import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import React, { useState, createContext, useContext, useEffect, LegacyRef, Key, TransitionEventHandler } from "react"; // Gerekli tipleri ekledik
import { AnimatePresence, motion, MotionValue, MotionStyle } from "framer-motion"; // Gerekli tipleri ekledik
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export default function Sidebar({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
}

// Define base props excluding 'key' for spreading
type MotionDivPropsWithoutKey = Omit<React.ComponentProps<typeof motion.div>, 'key'>;
type DivPropsWithoutKey = Omit<React.ComponentProps<'div'>, 'key'>;

// SafeChildren component with modified type to handle MotionValue types
// Accept both ReactNode and MotionValue types explicitly
const SafeChildren: React.FC<{
  children: React.ReactNode | MotionValue<number> | MotionValue<string> | Array<React.ReactNode | MotionValue<number> | MotionValue<string>>;
}> = ({ children }) => {
  // Helper function to safely render children that might include MotionValue<number/string>
  const renderSafeChildren = () => {
    // For arrays, render each child separately
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (
          typeof child === 'object' && 
          child !== null && 
          'get' in child && 
          'set' in child
        ) {
          // This is likely a MotionValue, render its current value
          return <React.Fragment key={index}>{String(child.get())}</React.Fragment>;
        }
        // Normal React child
        return <React.Fragment key={index}>{child as React.ReactNode}</React.Fragment>;
      });
    }
    
    // Single child that might be a MotionValue
    if (
      typeof children === 'object' && 
      children !== null && 
      'get' in children &&
      'set' in children
    ) {
      // This is likely a MotionValue, render its current value
      return String(children.get());
    }
    
    // Normal React child
    return children as React.ReactNode;
  };
  
  // Return the rendered children (this was missing)
  return <>{renderSafeChildren()}</>;
};