
"use client"

import { useToast, toast as toastFn } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Button } from "./button";
import { Copy } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function Toaster() {
  const { toasts } = useToast()
  const { t } = useLocale()

  const handleCopy = (title: React.ReactNode, description: React.ReactNode) => {
    let textToCopy = `${title}\n`;
    if (typeof description === 'string') {
        textToCopy += description;
    } else {
        // Fallback for non-string descriptions, though we try to avoid this.
        textToCopy += '[Contenido no copiable]';
    }
    navigator.clipboard.writeText(textToCopy);
    toastFn({
      title: t('toast.copied.title'),
      description: t('toast.copied.description'),
    });
  };


  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, copyable, ...props }) {
        const isJsonString = typeof description === 'string' && description.trim().startsWith('{');
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1 overflow-auto">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                 isJsonString ? (
                    <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4 text-white text-xs"><code className="text-white">{description}</code></pre>
                 ) : (
                    <ToastDescription>{description}</ToastDescription>
                 )
              )}
            </div>
             <div className="flex items-center gap-2">
                {action}
                {copyable && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 group-[.destructive]:border-destructive-foreground/20 group-[.destructive]:hover:bg-destructive-foreground/10 group-[.destructive]:text-destructive-foreground"
                      onClick={() => handleCopy(title, description)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                )}
                <ToastClose />
            </div>
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
