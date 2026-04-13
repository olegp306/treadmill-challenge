import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { reg } from '../registrationStyles';

type ChoiceProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> & {
  children: ReactNode;
  className?: string;
};

/** Large wizard choice control (Да / Нет / Мужской / Женский). */
export function OptionButton({ children, className, ...rest }: ChoiceProps) {
  return (
    <button
      type="button"
      className={['ar-reg-wizard-choice-btn', className].filter(Boolean).join(' ')}
      style={reg.ageFigmaChoiceBtn}
      {...rest}
    >
      {children}
    </button>
  );
}

type LinkProps = {
  to: string;
  children: ReactNode;
  className?: string;
};

/** Full-width outline choice (На главную). */
export function OptionChoiceLink({ to, children, className }: LinkProps) {
  return (
    <Link
      to={to}
      className={['ar-reg-wizard-choice-btn', 'ar-reg-wizard-choice-link', className].filter(Boolean).join(' ')}
      style={reg.ageFigmaChoiceBtnLink}
    >
      {children}
    </Link>
  );
}
