import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { logEvent, setLoggedParticipantId } from '../../logging/logEvent';
import { RegistrationLayout } from './RegistrationLayout';
import { validateNamePart } from './nameValidation';
import { validatePhoneForSubmit } from './phoneValidation';
import {
  INITIAL_FORM,
  RegistrationStep,
  type AgeChoice,
  type RegistrationFormData,
} from './types';
import { AgeStep } from './steps/AgeStep';
import { GenderStep } from './steps/GenderStep';
import { NameStep } from './steps/NameStep';
import { PhoneStep } from './steps/PhoneStep';
import { ConsentStep } from './steps/ConsentStep';

export function RegistrationFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(RegistrationStep.Age);
  const [form, setForm] = useState<RegistrationFormData>(INITIAL_FORM);
  const [ageChoice, setAgeChoice] = useState<AgeChoice>('unset');
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const patchForm = useCallback((p: Partial<RegistrationFormData>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const clearErrors = useCallback(() => {
    setStepError(null);
    setFieldError(false);
    setSubmitError(null);
  }, []);

  const handleBack = useCallback(() => {
    clearErrors();
    if (step === RegistrationStep.Age) {
      setAgeChoice('unset');
      patchForm({ isAdult: false });
      navigate('/');
      return;
    }
    setStep((s) => s - 1);
  }, [step, clearErrors, patchForm, navigate]);

  const handleAgeChoice = useCallback(
    (choice: AgeChoice) => {
      setAgeChoice(choice);
      setStepError(null);
      if (choice === 'yes') {
        patchForm({ isAdult: true });
        setStep(RegistrationStep.Gender);
        return;
      }
      if (choice === 'no') {
        patchForm({ isAdult: false });
      }
    },
    [patchForm]
  );

  const handleGenderSelect = useCallback(
    (gender: 'male' | 'female') => {
      patchForm({ gender });
      clearErrors();
      setStep(RegistrationStep.Name);
    },
    [patchForm, clearErrors]
  );

  const goNextFromName = useCallback(() => {
    const firstResult = validateNamePart(form.firstName, 'first');
    const lastResult = validateNamePart(form.lastName, 'last');
    if (!firstResult.ok) {
      setStepError(firstResult.message);
      setFieldError(true);
      return;
    }
    if (!lastResult.ok) {
      setStepError(lastResult.message);
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setStepError(null);
    logEvent('form_submit_name', { firstLen: firstResult.normalized.length, lastLen: lastResult.normalized.length });
    patchForm({
      firstName: firstResult.normalized,
      lastName: lastResult.normalized,
      name: `${firstResult.normalized} ${lastResult.normalized}`.trim(),
      phone: '7',
    });
    setStep(RegistrationStep.Phone);
  }, [form.firstName, form.lastName, patchForm]);

  const goNextFromPhone = useCallback(() => {
    const result = validatePhoneForSubmit(form.phone);
    if (!result.ok) {
      setStepError(result.message);
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setStepError(null);
    logEvent('form_submit_phone', { phoneDigitsLen: result.normalized.length });
    patchForm({ phone: result.normalized });
    setStep(RegistrationStep.Consent);
  }, [form.phone, patchForm]);

  const handleSubmit = useCallback(async () => {
    setSubmitError(null);
    setStepError(null);

    if (!form.consentParticipation || !form.consentPersonalData) {
      setStepError('Необходимо подтвердить оба согласия');
      return;
    }

    const phoneResult = validatePhoneForSubmit(form.phone);
    if (!phoneResult.ok) {
      setStepError(phoneResult.message);
      return;
    }

    const nameFirst = validateNamePart(form.firstName, 'first');
    const nameLast = validateNamePart(form.lastName, 'last');
    if (!nameFirst.ok) {
      setStepError(nameFirst.message);
      return;
    }
    if (!nameLast.ok) {
      setStepError(nameLast.message);
      return;
    }
    const name = `${nameFirst.normalized} ${nameLast.normalized}`.trim();

    if (!form.isAdult || form.gender === null) {
      setStepError('Не все данные заполнены');
      return;
    }

    setLoading(true);
    try {
      const created = await api.register({
        name,
        phone: phoneResult.normalized,
        sex: form.gender,
        runMode: 'time',
        runName: 'Регистрация',
      });
      setLoggedParticipantId(created.id);
      logEvent('registration_completed', { participantId: created.id, sex: form.gender });
      navigate('/run-select', {
        replace: true,
        state: {
          participantId: created.id,
          participantFirstName: created.firstName,
          participantSex: form.gender,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка регистрации';
      logEvent('error_event', { context: 'registration_submit', message: msg });
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  }, [form, navigate]);

  return (
    <RegistrationLayout chrome="wizard">
      {step === RegistrationStep.Age && (
        <AgeStep ageChoice={ageChoice} onAgeChoice={handleAgeChoice} onBack={handleBack} />
      )}

      {step === RegistrationStep.Gender && (
        <GenderStep onSelectGender={handleGenderSelect} onBack={handleBack} />
      )}

      {step === RegistrationStep.Name && (
        <NameStep
          form={form}
          onChange={patchForm}
          onNext={goNextFromName}
          onBack={handleBack}
          stepError={stepError}
          fieldError={fieldError}
        />
      )}

      {step === RegistrationStep.Phone && (
        <PhoneStep
          form={form}
          onChange={patchForm}
          onNext={goNextFromPhone}
          onBack={handleBack}
          stepError={stepError}
          fieldError={fieldError}
        />
      )}

      {step === RegistrationStep.Consent && (
        <ConsentStep
          form={form}
          onChange={patchForm}
          onSubmit={handleSubmit}
          onBack={handleBack}
          loading={loading}
          stepError={stepError}
          submitError={submitError}
        />
      )}
    </RegistrationLayout>
  );
}
