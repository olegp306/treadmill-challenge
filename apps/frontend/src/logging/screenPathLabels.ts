/** Human-readable Russian labels for route paths (screen_view). */
export function getScreenReadableMessage(pathname: string, search: string): string {
  const qs = search && search.length > 1 ? search : '';
  if (pathname === '/') return 'Пользователь на главной странице (hero)';
  if (pathname === '/welcome') return 'Пользователь открыл экран приветствия';
  if (pathname === '/register') return 'Пользователь на экране регистрации';
  if (pathname === '/register/queue-full') {
    return 'Пользователь на экране «Очередь переполнена» (главная → Принять участие)';
  }
  if (pathname === '/start') return 'Пользователь на экране «Начать забег»';
  if (pathname === '/leaderboard') {
    return qs
      ? 'Пользователь открыл лидерборд (с фильтром)'
      : 'Пользователь открыл лидерборд';
  }
  if (pathname === '/result') return 'Пользователь на экране результата';
  if (pathname === '/run-select') return 'Пользователь на экране выбора формата забега (hero)';
  if (pathname === '/run/queue') return 'Пользователь на экране очереди';
  if (pathname === '/run/queue-busy') return 'Пользователь увидел экран «Очередь заполнена»';
  if (pathname === '/run/leave-queue') return 'Пользователь на экране подтверждения выхода из очереди';
  if (pathname === '/run/demo') return 'Пользователь на экране демо-забега';
  if (pathname.startsWith('/admin')) return 'Пользователь в админ-панели';
  return `Пользователь перешёл на экран ${pathname}`;
}
