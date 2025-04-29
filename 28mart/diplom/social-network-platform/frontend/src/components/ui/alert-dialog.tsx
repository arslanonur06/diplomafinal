import * as React from "react";
import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Direct re-exports without any wrapping
export const AlertDialog = RadixAlertDialog.Root;
export const AlertDialogTrigger = RadixAlertDialog.Trigger; 
export const AlertDialogPortal = RadixAlertDialog.Portal;
export const AlertDialogOverlay = RadixAlertDialog.Overlay;
export const AlertDialogContent = RadixAlertDialog.Content;
export const AlertDialogTitle = RadixAlertDialog.Title;
export const AlertDialogDescription = RadixAlertDialog.Description;
export const AlertDialogAction = RadixAlertDialog.Action;
export const AlertDialogCancel = RadixAlertDialog.Cancel;

// CSS-only wrapper components with no prop forwarding issues
export const AlertDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',  // Add a default value to make it clear it's optional
  ...props
}) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
    {...props}
  />
);

export const AlertDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',  // Add a default value to make it clear it's optional
  ...props
}) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);

// Add default styling via composition pattern - consumer applies these in their code
export const alertDialogContentStyles = 
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";

export const alertDialogOverlayStyles = 
  "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const alertDialogTitleStyles = "text-lg font-semibold";

export const alertDialogDescriptionStyles = "text-sm text-muted-foreground";
