import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // rounded-full : "boutons pleins 999px (pilule)" du brief "Soft Cards".
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none",
  {
    variants: {
      variant: {
        // Effet "bouton physique" discret : une fine tranche semi-
        // transparente qui disparaît et se traduit en Y au clic. Ombres
        // teintees (jamais noires, brief §4) : violet pour le primaire,
        // rouge pour destructif, violet plus doux pour secondaire.
        default: "bg-primary text-primary-foreground shadow-[0_2px_0_0_rgba(108,60,240,0.25)] hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_3px_0_0_rgba(108,60,240,0.25)] active:translate-y-[2px] active:shadow-none",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_2px_0_0_rgba(220,38,38,0.25)] hover:bg-destructive/90 hover:-translate-y-0.5 hover:shadow-[0_3px_0_0_rgba(220,38,38,0.25)] active:translate-y-[2px] active:shadow-none",
        outline: "border border-input bg-background shadow-sm hover:bg-primary/10 hover:border-primary/30 hover:text-accent-foreground hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]",
        secondary: "bg-secondary text-secondary-foreground shadow-[0_2px_0_0_rgba(108,60,240,0.1)] hover:bg-secondary/80 hover:-translate-y-0.5 hover:shadow-[0_3px_0_0_rgba(108,60,240,0.1)] active:translate-y-[2px] active:shadow-none",
        ghost: "hover:bg-primary/10 hover:text-accent-foreground active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
