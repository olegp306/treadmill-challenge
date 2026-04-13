/** Wizard + API payload shape */
export type RegistrationFormData = {
  isAdult: boolean;
  gender: 'male' | 'female' | null;
  /** Combined «Имя Фамилия» for API (filled when leaving name step / submit). */
  name: string;
  firstName: string;
  lastName: string;
  /** National mobile digits (9XXXXXXXXX), up to 10; +7 added on submit. */
  phone: string;
  consentParticipation: boolean;
  consentPersonalData: boolean;
};

export const INITIAL_FORM: RegistrationFormData = {
  isAdult: false,
  gender: null,
  name: '',
  firstName: '',
  lastName: '',
  phone: '',
  consentParticipation: false,
  consentPersonalData: false,
};

/** Internal wizard steps — single route (landing «Принять участие» goes straight to Age). */
export enum RegistrationStep {
  Age = 0,
  Gender = 1,
  Name = 2,
  Phone = 3,
  Consent = 4,
}

/** Age step needs three states: unanswered / adult / minor */
export type AgeChoice = 'unset' | 'yes' | 'no';
