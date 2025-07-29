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
    React.HTMLAttributes<HTMLParagraphElement> & { variant?: VariantProps<typeof alertVariants>["variant"] }
>(({ className, children, variant, ...props }, ref) => {
    const { t } = useLocale();
    const { toast } = useToast();
    const [hasCopied, setHasCopied] = React.useState(false);
    const descriptionRef = React.useRef<HTMLDivElement>(null);


    const onCopy = () => {
        const textToCopy = descriptionRef.current?.textContent;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setHasCopied(true);
            toast({
                title: t('toast.copied.title'),
                description: t('toast.copied.description'),
            });
            setTimeout(() => setHasCopied(false), 2000);
        }
    };

    return (
        <div
            ref={ref}
            className={cn("text-sm [&_p]:leading-relaxed relative", className)}
            {...props}
        >
            <div ref={descriptionRef}>{children}</div>
            {variant === 'destructive' && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-[-8px] right-[-8px] h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={onCopy}
                >
                    {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
            )}
        </div>
    );
});
AlertDescription.displayName = "AlertDescription"


export { Alert, AlertTitle, AlertDescription }

    
