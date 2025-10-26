// src/features/shared/components/ui/Toaster.jsx
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/features/shared/components/ui/toast";
import { useToast } from "@/features/shared/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      {/* VIEWPORT NO CANTO SUPERIOR DIREITO */}
      <ToastViewport className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full p-4 pointer-events-none" />
    </ToastProvider>
  );
}