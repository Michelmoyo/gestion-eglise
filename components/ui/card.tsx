import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // rounded-lg (pas rounded-xl, qui est une valeur Tailwind statique
        // non liee a --radius) pour suivre le rayon genereux du theme (20px,
        // aligne sur les maquettes d'origine). Ombre douce et diffuse --
        // le theme est desormais clair, elle se voit vraiment (contrairement
        // au theme sombre precedent ou elle se fondait dans le fond).
        // transition-all pour que les hover: deja presents un peu partout
        // (hover:border-primary/30, hover:bg-primary/5...) s'animent au
        // lieu de basculer brutalement.
        "rounded-lg border border-border/60 bg-card text-card-foreground shadow-[0_1px_2px_rgba(20,10,15,0.04),0_8px_24px_-12px_rgba(20,10,15,0.12)] transition-all duration-150",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    // Doubleplus est deja visuellement grasse par nature : pas de
    // font-semibold (double-gras moche) ni de tracking-tight (le serre
    // excessivement) -- tracking-normal pour lui laisser de l'air.
    <h3 ref={ref} className={cn("font-display leading-none tracking-normal", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
