import { InputHTMLAttributes } from "react";

/**
 * 48px field, 8px radius, #e0e5eb hairline — shared by /sign-in and /sign-up.
 * The frame ships leading/trailing icon slots on this component but hides
 * them on both screens, so they are not rendered. Values are prefilled
 * because the frame shows a filled state.
 */
export default function AuthField({
  id,
  label,
  "aria-invalid": ariaInvalid,
  ...props
}: { id: string; label: string; "aria-invalid"?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-base font-medium leading-[22px] text-white"
      >
        {label}
        <span className="text-[#f53a1d]">*</span>
      </label>
      <input
        id={id}
        name={id}
        required
        aria-invalid={ariaInvalid || undefined}
        {...props}
        className={
          "h-12 w-full rounded-lg border bg-transparent px-4 text-base leading-6 text-white focus:outline-none " +
          (ariaInvalid
            ? "border-[#f53a1d] focus:border-[#f53a1d]"
            : "border-[#e0e5eb] focus:border-coral")
        }
      />
    </div>
  );
}
