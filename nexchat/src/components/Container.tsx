import { ReactNode } from "react";

/** The design lays every section on a 1320px content column inside a 1920px page. */
export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1320px] px-6 xl:px-0 ${className}`}>
      {children}
    </div>
  );
}
