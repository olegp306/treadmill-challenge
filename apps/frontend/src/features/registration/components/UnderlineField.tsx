import { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import type { InputFieldProps } from '../../../ui/components/InputField';
import { InputField } from '../../../ui/components/InputField';

export type UnderlineFieldProps = {
  id: string;
  /** Show error color on label + underline. */
  hasError?: boolean;
  /** Optional validation hint (blur / submit); does not change layout when empty. */
  errorText?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'style'> & {
  style?: CSSProperties;
};

/** Legacy alias for `InputField` (kept for minimal churn). */
export const UnderlineField = forwardRef<HTMLInputElement, UnderlineFieldProps>(
  function UnderlineField({ id, hasError, errorText, style, ...inputProps }, ref) {
    const props: InputFieldProps = {
      ...(inputProps as Omit<InputFieldProps, 'hasError' | 'errorText'>),
      id,
      hasError,
      errorText,
      style,
    };
    return <InputField ref={ref} {...props} />;
  }
);
