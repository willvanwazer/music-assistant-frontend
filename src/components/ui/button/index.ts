import { cva, type VariantProps } from "class-variance-authority";

export { default as Button } from "./Button.vue";

// A button showing a spinner is busy, not unavailable, so it keeps full opacity
// while disabled - a half-transparent spinner is hard to make out.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 has-[.animate-spin]:disabled:opacity-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-[0_8px_20px_-12px_var(--primary)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        ghost:
          "hover:bg-secondary hover:text-foreground dark:hover:bg-secondary/80",
        "ghost-outline":
          "border border-foreground/25 bg-transparent hover:bg-background/40 hover:text-foreground hover:backdrop-blur-md",
        "ghost-icon": "hover:bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3.5 has-[>svg]:px-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-[>svg]:px-2",
        lg: "h-10 px-6 has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
