"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";

import { cn } from "@/lib/utils";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";

function Checkbox({ className, indeterminate, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      className={cn(
        // Divergência consciente do registry ds.adila.co: ele estiliza só data-checked, mas no
        // Base UI data-checked e data-indeterminate são mutuamente exclusivos — no estado
        // indeterminado o Root não emite data-checked, e o checkbox ficava sem preenchimento
        // nenhum, igual ao estado vazio. Reverter quando o DS for corrigido.
        "peer cursor-pointer relative flex size-6 shrink-0 items-center justify-center rounded-[4px] border border-input transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none active:scale-90 group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-[transform,opacity] duration-150 ease-out data-starting-style:scale-50 data-starting-style:opacity-0 data-ending-style:scale-50 data-ending-style:opacity-0 [&>svg]:size-3.5"
      >
        {indeterminate ? <MinusIcon weight="bold" /> : <CheckIcon weight="bold" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
