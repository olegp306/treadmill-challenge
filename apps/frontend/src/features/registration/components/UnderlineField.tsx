import { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import { reg } from '../registrationStyles';

export type UnderlineFieldProps = {
  id: string;
  label: string;
  /** Show error color on label + underline. */
  hasError?: boolean;
  /** Optional validation hint (blur / submit); does not change layout when empty. */
  errorText?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'style'> & {
  style?: CSSProperties;
};

/** Name step: label + underline-only text input (Figma). */
export const UnderlineField = forwardRef<HTMLInputElement, UnderlineFieldProps>(
  function UnderlineField({ id, label, hasError, errorText, style, ...inputProps }, ref) {
    return (
      <div style={reg.nameFieldCol}>
        <label
          htmlFor={id}
          style={{
            ...reg.nameFieldLabel,
            cursor: 'pointer',
            ...(hasError ? { color: '#f85149' } : {}),
          }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          style={{
            ...reg.wizardFieldUnderline,
            ...reg.nameFieldInput,
            ...(hasError ? reg.wizardFieldUnderlineError : {}),
            ...style,
          }}
          {...inputProps}
        />
        {errorText ? <p style={reg.nameFieldInlineError}>{errorText}</p> : null}
      </div>
    );
  }
);
