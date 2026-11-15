"use client";

/** A submit button that asks for confirmation first; cancelling stops the form from submitting. */
export function ConfirmButton({
  message,
  className,
  formAction,
  children,
}: {
  message: string;
  className?: string;
  /** Optional server action to run instead of the form's own action. */
  formAction?: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
