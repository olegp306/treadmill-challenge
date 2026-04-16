import { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import { reg } from '../registrationStyles';

export type UnderlineFieldProps = {
  id: string;
  /** Show error color on label + underline. */
  hasError?: boolean;
  /** Optional validation hint (blur / submit); does not change layout when empty. */
  errorText?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'style'> & {
  style?: CSSProperties;
};

/** Name step: label + underline-only text input (Figma). */
export const UnderlineField = forwardRef<HTMLInputElement, UnderlineFieldProps>(
  function UnderlineField({ id, hasError, errorText, style, ...inputProps }, ref) {
    return (
      <div style={reg.nameFieldCol}>
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
        <p style={{ ...reg.nameFieldInlineError, visibility: errorText ? 'visible' : 'hidden' }}>
          {errorText ?? ' '}
        </p>
      </div>
    );
  }
);
