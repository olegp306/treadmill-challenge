/** Wizard + API payload shape */
export type RegistrationFormData = {
  isAdult: boolean;
  sex: 'male' | 'female' | null;
  /** Combined «Имя Фамилия» for API (filled when leaving name step / submit). */
  name: string;
  firstName: string;
  lastName: string;
  /** Phone step: digits only (no +). After phone «Далее» / API: E.164 string (+…). */
  phone: string;
  consentParticipation: boolean;
  consentPersonalData: boolean;
};

export const INITIAL_FORM: RegistrationFormData = {
  isAdult: false,
  sex: null,
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
