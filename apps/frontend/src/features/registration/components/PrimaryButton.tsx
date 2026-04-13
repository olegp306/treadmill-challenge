import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { reg } from '../registrationStyles';

type NextProps = {
  variant: 'next';
  /** Red “active” styling (Далее enabled). */
  active: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & { style?: CSSProperties };

type CtaProps = {
  variant: 'cta';
  /** Both consents checked and not loading — red ready state. */
  ready: boolean;
  loading?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> & { style?: CSSProperties };

export type PrimaryButtonProps = NextProps | CtaProps;

/**
 * Primary actions: `next` (Далее) and `cta` (Принять участие).
 * Visual specs stay in `registrationStyles`; interaction in `index.css`.
 */
export function PrimaryButton(props: PrimaryButtonProps) {
  if (props.variant === 'next') {
    const { variant: _v, active, className, style, type = 'button', ...rest } = props;
    return (
      <button
        type={type}
        className={['ar-reg-wizard-name-next', className].filter(Boolean).join(' ')}
        style={{
          ...reg.nameNextBtn,
          ...(active ? reg.nameNextBtnActive : {}),
          ...style,
        }}
        {...rest}
      />
    );
  }

  const { variant: _v, ready, loading, className, style, children, ...rest } = props;
  const disabled = rest.disabled ?? false;
  return (
    <button
      type="button"
      className={['ar-reg-wizard-consent-submit', className].filter(Boolean).join(' ')}
      style={{
        ...reg.consentSubmitBtn,
        ...(ready && !disabled ? reg.consentSubmitBtnReady : reg.consentSubmitBtnDisabled),
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Отправка…' : children}
    </button>
  );
}
