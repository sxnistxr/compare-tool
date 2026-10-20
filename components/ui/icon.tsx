import { cn } from "@/lib/utils"

// Iconify icons via the Tailwind plugin: pass the icon as a class, e.g. "icon-[ph--x]".
function Icon({ className, ...props }: React.ComponentProps<"span">) {
  return <span aria-hidden data-slot="icon" className={cn("inline-block size-4 shrink-0", className)} {...props} />
}

export { Icon }
