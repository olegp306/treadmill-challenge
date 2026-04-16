import { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import { reg } from '../../features/registration/registrationStyles';

export type InputFieldProps = {
  /** Show error color on underline. */
  hasError?: boolean;
  /** Optional validation hint; space is reserved when empty. */
  errorText?: string | null;
  wrapperStyle?: CSSProperties;
  /** Base input style (defaults to name-step input). */
  inputBaseStyle?: CSSProperties;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'style'> & {
    style?: CSSProperties;
  };

/**
 * Minimal reusable field for wizard steps:
 * underline-only input + reserved error slot to prevent layout shift.
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { hasError, errorText, style, wrapperStyle, inputBaseStyle, ...inputProps },
  ref
) {
  return (
    <div style={{ ...reg.nameFieldCol, ...wrapperStyle }}>
      <input
        ref={ref}
        style={{
          ...reg.wizardFieldUnderline,
          ...(inputBaseStyle ?? reg.nameFieldInput),
          ...(hasError ? reg.wizardFieldUnderlineError : {}),
          ...style,
        }}
        {...inputProps}
      />
      <p style={{ ...reg.nameFieldInlineError, visibility: errorText ? 'visible' : 'hidden' }}>{errorText ?? ' '}</p>
    </div>
  );
});

