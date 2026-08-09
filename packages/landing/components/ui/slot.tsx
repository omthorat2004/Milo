import { Children, cloneElement, isValidElement, type ReactElement } from "react";

import { cn } from "@/lib/utils";

type SlotProps = React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode };

type ChildProps = { className?: string } & React.HTMLAttributes<HTMLElement>;

/**
 * Minimal `asChild` implementation — merges props onto a single child element.
 *
 * A four-line dependency-free stand-in for @radix-ui/react-slot, which is the
 * only piece of Radix this marketing page would otherwise need.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  const child = Children.only(children);

  if (!isValidElement<ChildProps>(child)) {
    throw new Error("<Slot> expects a single React element child.");
  }

  const element = child as ReactElement<ChildProps>;

  return cloneElement(element, {
    ...props,
    ...element.props,
    className: cn(className, element.props.className),
  });
}
