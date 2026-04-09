import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type RunMode = 'time' | '1km' | '5km';
export type Sex = 'male' | 'female';

export type ParticipateFormValues = {
  name: string;
  phone: string;
  sex: Sex;
  runMode: RunMode;
};

const defaultValues: ParticipateFormValues = {
  name: '',
  phone: '',
  sex: 'male',
  runMode: 'time',
};

type Ctx = {
  values: ParticipateFormValues;
  setValues: React.Dispatch<React.SetStateAction<ParticipateFormValues>>;
  patch: (p: Partial<ParticipateFormValues>) => void;
  reset: () => void;
};

const ParticipateFormContext = createContext<Ctx | null>(null);

export function ParticipateFormProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<ParticipateFormValues>(defaultValues);
  const patch = useCallback((p: Partial<ParticipateFormValues>) => {
    setValues((v) => ({ ...v, ...p }));
  }, []);
  const reset = useCallback(() => setValues(defaultValues), []);
  const ctx = useMemo(
    () => ({ values, setValues, patch, reset }),
    [values, patch, reset]
  );
  return (
    <ParticipateFormContext.Provider value={ctx}>{children}</ParticipateFormContext.Provider>
  );
}

export function useParticipateForm() {
  const c = useContext(ParticipateFormContext);
  if (!c) throw new Error('useParticipateForm must be used within ParticipateFormProvider');
  return c;
}
