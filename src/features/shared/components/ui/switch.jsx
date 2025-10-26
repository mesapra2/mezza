// src/features/shared/components/ui/switch.jsx
import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import PropTypes from 'prop-types';

// 👇 --- CORREÇÃO AQUI --- 👇
import { cn } from "@/utils" // Remove '/lib' do caminho
// 👆 --- FIM DA CORREÇÃO --- 👆

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-input",
      // Ajuste de cores para o tema escuro (opcional, pode ajustar conforme seu design system)
      "data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-700",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // Ajuste de cores para o tema escuro
        "bg-white"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

Switch.propTypes = {
  className: PropTypes.string,
};

export { Switch }