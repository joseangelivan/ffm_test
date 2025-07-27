import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Copy, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils"
import { Button } from "./button";
import { useLocale } from "@/lib/i18n";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"


const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { isCopyable?: boolean }
>(({ className, children, isCopyable = false, ...props }, ref) => {
    const [isCopied, setIsCopied] = React.useState(false);
    const { toast } = useToast();
    const { t } = useLocale();
    const textToCopy = React.useRef<HTMLDivElement>(null);

    const handleCopy = () => {
        if (textToCopy.current) {
            navigator.clipboard.writeText(textToCopy.current.innerText);
            toast({ title: t('toast.copied.title'), description: t('toast.copied.description') });
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };
    
    return (
        <div className="flex items-start justify-between gap-4">
            <div
                ref={ref}
                className={cn("text-sm [&_p]:leading-relaxed flex-grow", className)}
                {...props}
            >
             <div ref={textToCopy}>{children}</div>
            </div>
            {isCopyable && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleCopy}
                >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copiar error</span>
                </Button>
            )}
        </div>
    );
});
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
