/** TouchDesigner / integration informational banner phases (operator-visible only when enabled in admin). */
export type IntegrationPhase =
  | 'idle'
  | 'treadmill_check'
  | 'sending_to_touchdesigner'
  | 'sent_to_touchdesigner'
  | 'waiting_for_touchdesigner'
  | 'result_received'
  | 'integration_error';

const MESSAGES: Record<Exclude<IntegrationPhase, 'idle'>, string> = {
  treadmill_check: 'ПРОВЕРЯЕМ СОСТОЯНИЕ ДОРОЖКИ',
  sending_to_touchdesigner: 'ОТПРАВЛЯЕМ ДАННЫЕ В TOUCHDESIGNER',
  sent_to_touchdesigner: 'ДАННЫЕ ОТПРАВЛЕНЫ В TOUCHDESIGNER',
  waiting_for_touchdesigner: 'ОЖИДАЕМ СИГНАЛ ОТ TOUCHDESIGNER',
  result_received: 'РЕЗУЛЬТАТ ПОЛУЧЕН ОТ TOUCHDESIGNER',
  integration_error: 'ОШИБКА СВЯЗИ С TOUCHDESIGNER',
};

export function integrationPhaseMessage(phase: IntegrationPhase): string | null {
  if (phase === 'idle') return null;
  return MESSAGES[phase] ?? null;
}

export function defaultAutoHideMs(phase: IntegrationPhase): number | null {
  switch (phase) {
    case 'sent_to_touchdesigner':
      return 3500;
    case 'result_received':
      return 4000;
    case 'integration_error':
      return 5500;
    default:
      return null;
  }
}
