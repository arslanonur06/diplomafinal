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

// Düzeltilmiş SidebarBody
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  // key'i props'tan ayır
  const { key, ...restProps } = props;
  // MobileSidebar için de 'key'i ayır (div props kullanıyor)
  const { key: mobileKey, ...restMobileProps } = props as React.ComponentProps<"div">;

  return (
    <>
      {/* Sadece kalan props'ları yay */}
      <DesktopSidebar {...restProps} />
      {/* MobileSidebar için ayrılmış props'ları kullan */}
      <MobileSidebar {...restMobileProps} />
    </>
  );
};

// Düzeltilmiş DesktopSidebar
export const DesktopSidebar = ({
  className,
  children,
  ...props // props zaten className ve children hariç her şeyi içeriyor
}: React.ComponentProps<typeof motion.div>) => {

  // Burada da kalan props'lardan key'i ayır
  const { key, ...restProps } = props;

  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[240px] flex-shrink-0",
        className
      )}
      {...restProps} // Sadece geri kalanları motion.div'e yay
    >
      {children}
    </motion.div>
  );
};

// Düzeltilmiş MobileSidebar
export const MobileSidebar = ({
  className,
  children,
  ...props // props zaten className ve children hariç her şeyi içeriyor
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();

  // Burada da kalan props'lardan key'i ayır (dıştaki div için)
  const { key, ...restProps } = props;

  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...restProps} // Sadece geri kalanları dıştaki div'e yay
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn( // Buradaki className MobileSidebar'a verilen className olmalı
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-800 p-10 z-[100] flex flex-col justify-between",
                className // className'i buraya da ekliyoruz (opsiyonel olarak yukarıdaki cn'e de eklenebilir)
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

// SidebarLink değişmedi, olduğu gibi kalıyor
export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  [key: string]: any;
}) => {
  const { open, animate } = useSidebar();
  const [isActive, setIsActive] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkActive = () => {
      const pathname = window.location.pathname;

      if (link.href === '/profile' && pathname.startsWith('/profile/')) {
        setIsActive(true);
        return;
      }

      if (['/settings', '/discover', '/saved', '/favorites'].includes(link.href)) {
        setIsActive(pathname === link.href);
        return;
      }

      if (pathname === link.href ||
         (pathname.startsWith(`${link.href}/`) && link.href !== '/')) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    };

    checkActive();

    window.addEventListener('popstate', checkActive);

    const handleRouteChange = () => checkActive();
    window.addEventListener('routeChange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', checkActive);
      window.removeEventListener('routeChange', handleRouteChange);
    };
  }, [link.href]);

  return (
    <Link
      to={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-3 px-4 my-1 rounded-lg",
        isActive ? "bg-gradient-to-r from-gray-200 to-rose-200 dark:from-gray-800 dark:to-rose-900 text-gray-800 dark:text-rose-100 font-medium" :
        "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 hover:bg-gradient-to-r hover:from-gray-100 hover:to-rose-100 dark:hover:from-black dark:hover:to-rose-900/40",
        className
      )}
      {...props}
    >
      <div className={`text-lg ${isActive ? "text-rose-600 dark:text-rose-300" : ""}`}>
        {link.icon}
      </div>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {t(link.label)}
      </motion.span>
    </Link>
  );
};