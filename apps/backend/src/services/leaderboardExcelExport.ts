import { utils, write } from 'xlsx';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { competitions, getDb } from '../db/index.js';
import { ensureActiveCompetitionsForAllSlots } from './competitionService.js';
import { getRankedRuns } from './rankingService.js';

type ResultType = 'time' | 'distance';

type ExportRow = {
  leaderboard: string;
  rank: number;
  lastName: string;
  firstName: string;
  phone: string;
  resultDisplay: string;
  resultType: ResultType;
  sortValue: number;
  runDateTime: string;
  runSessionId: string;
  participantId: string;
  runTypeId: RunTypeId;
  gender: Gender;
};

const HEADER_MAP: Record<keyof ExportRow, string> = {
  leaderboard: 'Лидерборд',
  rank: 'Место',
  lastName: 'Фамилия',
  firstName: 'Имя',
  phone: 'Телефон',
  resultDisplay: 'Результат',
  resultType: 'Тип результата',
  sortValue: 'Значение для сортировки',
  runDateTime: 'Дата и время забега',
  runSessionId: 'ID сессии',
  participantId: 'ID участника',
  runTypeId: 'ID типа забега',
  gender: 'Пол',
};

function two(n: number): string {
  return String(n).padStart(2, '0');
}

function formatForFileName(d: Date): string {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}-${two(d.getMinutes())}`;
}

function formatRunDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

function formatResultSeconds(resultTimeSeconds: number): string {
  if (!Number.isFinite(resultTimeSeconds) || resultTimeSeconds < 0) return '';
  const minutes = Math.floor(resultTimeSeconds / 60);
  const seconds = resultTimeSeconds - minutes * 60;
  return `${two(minutes)}:${seconds.toFixed(2).padStart(5, '0')}`;
}

function formatRunResult(runTypeId: RunTypeId, resultTime: number, resultDistance: number): string {
  return runTypeId === 0 ? `${Math.round(resultDistance)} м` : formatResultSeconds(resultTime);
}

function metricTypeForRunType(runTypeId: RunTypeId): ResultType {
  return runTypeId === 0 ? 'distance' : 'time';
}

function resultTypeLabel(v: ResultType): string {
  return v === 'time' ? 'time (asc)' : 'distance (desc)';
}

function sortValueForEntry(runTypeId: RunTypeId, resultTime: number, distance: number): number {
  return metricTypeForRunType(runTypeId) === 'time' ? resultTime : distance;
}

function sheetNameForSlot(runTypeId: RunTypeId, sex: Gender): string {
  const sexLabel = sex === 'male' ? 'Мужчины' : 'Женщины';
  const runLabel =
    runTypeId === 0 ? '5мин_дистанция' : runTypeId === 1 ? '1км_время' : '5км_время';
  return `${sexLabel}_${runLabel}`;
}

function buildSheetRows(runTypeId: RunTypeId, sex: Gender): ExportRow[] {
  const db = getDb();
  const rows = getRankedRuns(db, { runTypeId, sex, sortMode: 'best' });
  return rows.map((entry) => {
    const resultType = metricTypeForRunType(entry.runTypeId);
    const sortValue = sortValueForEntry(entry.runTypeId, entry.resultTime, entry.resultDistance);
    const leaderboard = `${getRunTypeName(entry.runTypeId)} / ${entry.sex === 'male' ? 'М' : 'Ж'}`;
    return {
      leaderboard,
      rank: entry.rank,
      lastName: entry.participantLastName,
      firstName: entry.participantFirstName,
      phone: entry.participantPhone,
      resultDisplay: formatRunResult(entry.runTypeId, entry.resultTime, entry.resultDistance),
      resultType,
      sortValue,
      runDateTime: formatRunDateTime(entry.displayTime),
      runSessionId: entry.runSessionId,
      participantId: entry.participantId,
      runTypeId: entry.runTypeId,
      gender: entry.sex,
    };
  });
}

export function buildLeaderboardsExportFilename(): string {
  return `treadmill-leaderboards-${formatForFileName(new Date())}.xlsx`;
}

export function buildLeaderboardsWorkbookXlsxBuffer(): { buffer: Buffer; sheetCount: number } {
  ensureActiveCompetitionsForAllSlots();
  const db = getDb();
  const workbook = utils.book_new();
  let sheetCount = 0;

  for (const runTypeId of [0, 1, 2] as const) {
    for (const sex of ['male', 'female'] as const) {
      const activeCompetition = competitions.getActiveCompetition(db, runTypeId, sex);
      if (!activeCompetition) continue;

      const dataRows = buildSheetRows(runTypeId, sex);
      const rowsForSheet = dataRows.map((row) => ({
        [HEADER_MAP.leaderboard]: row.leaderboard,
        [HEADER_MAP.rank]: row.rank,
        [HEADER_MAP.lastName]: row.lastName,
        [HEADER_MAP.firstName]: row.firstName,
        [HEADER_MAP.phone]: row.phone,
        [HEADER_MAP.resultDisplay]: row.resultDisplay,
        [HEADER_MAP.resultType]: resultTypeLabel(row.resultType),
        [HEADER_MAP.sortValue]: row.sortValue,
        [HEADER_MAP.runDateTime]: row.runDateTime,
        [HEADER_MAP.runSessionId]: row.runSessionId,
        [HEADER_MAP.participantId]: row.participantId,
        [HEADER_MAP.runTypeId]: row.runTypeId,
        [HEADER_MAP.gender]: row.gender,
      }));

      const sheet = utils.json_to_sheet(rowsForSheet);
      sheet['!autofilter'] = {
        ref: `A1:${String.fromCharCode('A'.charCodeAt(0) + Object.keys(HEADER_MAP).length - 1)}1`,
      };
      sheet['!cols'] = [
        { wch: 18 },
        { wch: 8 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 22 },
        { wch: 40 },
        { wch: 40 },
        { wch: 14 },
        { wch: 10 },
      ];

      const sheetName = `${sheetNameForSlot(runTypeId, sex)}_${getRunTypeName(runTypeId)}`.slice(0, 31);
      utils.book_append_sheet(workbook, sheet, sheetName);
      sheetCount += 1;
    }
  }

  if (sheetCount === 0) {
    const emptySheet = utils.json_to_sheet([
      {
        message: 'Нет активных лидербордов для экспорта',
        createdAt: formatRunDateTime(new Date().toISOString()),
      },
    ]);
    utils.book_append_sheet(workbook, emptySheet, 'Нет данных');
    sheetCount = 1;
  }

  const buffer = Buffer.from(
    write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    })
  );
  return { buffer, sheetCount };
}
