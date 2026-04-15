import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { logEvent, setLoggedParticipantId } from '../../logging/logEvent';
import { RegistrationLayout } from './RegistrationLayout';
import { validateNamePart } from './nameValidation';
import { formatPhoneFromDigits } from './phoneFormat';
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

  useEffect(() => {
    const stepMessages: Record<RegistrationStep, string> = {
      [RegistrationStep.Age]: 'Пользователь на экране подтверждения возраста',
      [RegistrationStep.Gender]: 'Пользователь на экране выбора пола',
      [RegistrationStep.Name]: 'Пользователь на экране «Как тебя зовут?»',
      [RegistrationStep.Phone]: 'Пользователь на экране ввода номера телефона',
      [RegistrationStep.Consent]: 'Пользователь на экране согласий',
    };
    logEvent(
      'registration_step_view',
      { step: RegistrationStep[step] },
      { readableMessage: stepMessages[step] }
    );
  }, [step]);

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
        logEvent(
          'age_confirm',
          { choice: 'yes' },
          { readableMessage: 'Пользователь подтвердил возраст: Да' }
        );
        patchForm({ isAdult: true });
        setStep(RegistrationStep.Gender);
        return;
      }
      if (choice === 'no') {
        logEvent(
          'age_confirm',
          { choice: 'no' },
          { readableMessage: 'Пользователь подтвердил возраст: Нет' }
        );
        patchForm({ isAdult: false });
      }
    },
    [patchForm]
  );

  const handleGenderSelect = useCallback(
    (gender: 'male' | 'female') => {
      logEvent(
        'gender_select',
        { gender },
        {
          readableMessage:
            gender === 'male'
              ? 'Пользователь выбрал пол: Мужской'
              : 'Пользователь выбрал пол: Женский',
        }
      );
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
      logEvent(
        'validation_error',
        { step: 'name', field: 'firstName' },
        { readableMessage: `Ошибка проверки имени: ${firstResult.message}` }
      );
      setStepError(firstResult.message);
      setFieldError(true);
      return;
    }
    if (!lastResult.ok) {
      logEvent(
        'validation_error',
        { step: 'name', field: 'lastName' },
        { readableMessage: `Ошибка проверки фамилии: ${lastResult.message}` }
      );
      setStepError(lastResult.message);
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setStepError(null);
    logEvent(
      'form_submit_name',
      { firstLen: firstResult.normalized.length, lastLen: lastResult.normalized.length },
      {
        readableMessage: `Пользователь отправил форму «Как тебя зовут?»: ${firstResult.normalized} ${lastResult.normalized}`,
      }
    );
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
      logEvent(
        'validation_error',
        { step: 'phone' },
        { readableMessage: `Ошибка проверки телефона: ${result.message}` }
      );
      setStepError(result.message);
      setFieldError(true);
      return;
    }
    setFieldError(false);
    setStepError(null);
    logEvent(
      'form_submit_phone',
      { phoneDigitsLen: result.normalized.length },
      {
        readableMessage: `Пользователь отправил форму телефона: ${formatPhoneFromDigits(result.normalized)}`,
      }
    );
    patchForm({ phone: result.normalized });
    setStep(RegistrationStep.Consent);
  }, [form.phone, patchForm]);

  const handleSubmit = useCallback(async () => {
    logEvent(
      'consent_primary_click',
      {},
      { readableMessage: 'Пользователь нажал «Принять участие»' }
    );
    setSubmitError(null);
    setStepError(null);

    if (!form.consentParticipation || !form.consentPersonalData) {
      logEvent(
        'validation_error',
        { step: 'consent' },
        { readableMessage: 'Ошибка: не отмечены оба согласия' }
      );
      setStepError('Необходимо подтвердить оба согласия');
      return;
    }

    const phoneResult = validatePhoneForSubmit(form.phone);
    if (!phoneResult.ok) {
      logEvent(
        'validation_error',
        { step: 'consent', field: 'phone' },
        { readableMessage: `Ошибка перед отправкой: телефон — ${phoneResult.message}` }
      );
      setStepError(phoneResult.message);
      return;
    }

    const nameFirst = validateNamePart(form.firstName, 'first');
    const nameLast = validateNamePart(form.lastName, 'last');
    if (!nameFirst.ok) {
      logEvent(
        'validation_error',
        { step: 'consent', field: 'firstName' },
        { readableMessage: `Ошибка перед отправкой: имя — ${nameFirst.message}` }
      );
      setStepError(nameFirst.message);
      return;
    }
    if (!nameLast.ok) {
      logEvent(
        'validation_error',
        { step: 'consent', field: 'lastName' },
        { readableMessage: `Ошибка перед отправкой: фамилия — ${nameLast.message}` }
      );
      setStepError(nameLast.message);
      return;
    }
    const name = `${nameFirst.normalized} ${nameLast.normalized}`.trim();

    if (!form.isAdult || form.gender === null) {
      logEvent(
        'validation_error',
        { step: 'consent' },
        { readableMessage: 'Ошибка: не все данные анкеты заполнены' }
      );
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
      logEvent(
        'registration_completed',
        { participantId: created.id, sex: form.gender },
        {
          participantId: created.id,
          readableMessage: 'Регистрация успешно завершена, пользователь переходит к выбору забега',
        }
      );
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
      logEvent(
        'error_event',
        { context: 'registration_submit', message: msg },
        { readableMessage: `Ошибка при регистрации: ${msg}` }
      );
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
