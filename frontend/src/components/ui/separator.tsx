import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // Divergência consciente do registry ds.adila.co: ele usa data-horizontal:/data-vertical:,
        // mas o Base UI emite data-orientation="horizontal|vertical". As classes do registry nunca
        // casam e o separador colapsa para 0px. Reverter para o registry quando o DS for corrigido.
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
