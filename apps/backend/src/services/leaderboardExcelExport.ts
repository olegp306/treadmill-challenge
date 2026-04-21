import { utils, write } from 'xlsx';
import type { Gender, RunTypeId } from '@treadmill-challenge/shared';
import { getRunTypeName } from '@treadmill-challenge/shared';
import { competitions, getDb, participants, runs } from '../db/index.js';
import { ensureActiveCompetitionsForAllSlots } from './competitionService.js';

type ResultType = 'time' | 'distance';

type ExportRow = {
  rank: number;
  lastName: string;
  firstName: string;
  middleName: string;
  resultDisplay: string;
  resultType: ResultType;
  sortValue: number;
  runDateTime: string;
  runId: string;
  runSessionId: string;
  participantId: string;
  competitionId: string;
  runTypeId: RunTypeId;
  gender: Gender;
};

const HEADER_MAP: Record<keyof ExportRow, string> = {
  rank: 'Место',
  lastName: 'Фамилия',
  firstName: 'Имя',
  middleName: 'Отчество',
  resultDisplay: 'Результат',
  resultType: 'Тип результата',
  sortValue: 'Значение для сортировки',
  runDateTime: 'Дата и время забега',
  runId: 'ID забега',
  runSessionId: 'ID сессии',
  participantId: 'ID участника',
  competitionId: 'ID соревнования',
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

function buildSheetRows(competitionId: string, runTypeId: RunTypeId, sex: Gender): ExportRow[] {
  const db = getDb();
  const rows = runs.getLeaderboardForCompetition(db, competitionId, runTypeId, 500);
  return rows.map((entry, index) => {
    const participant = participants.getParticipantById(db, entry.run.participantId);
    const resultType = metricTypeForRunType(runTypeId);
    const sortValue = sortValueForEntry(runTypeId, entry.run.resultTime, entry.run.distance);
    return {
      rank: index + 1,
      lastName: participant?.lastName ?? '',
      firstName: participant?.firstName ?? '',
      middleName: '',
      resultDisplay:
        resultType === 'time'
          ? formatResultSeconds(entry.run.resultTime)
          : String(Math.round(entry.run.distance)),
      resultType,
      sortValue,
      runDateTime: formatRunDateTime(entry.run.createdAt),
      runId: String(entry.run.id),
      runSessionId: entry.run.runSessionId ?? '',
      participantId: entry.run.participantId,
      competitionId,
      runTypeId,
      gender: sex,
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

      const dataRows = buildSheetRows(activeCompetition.id, runTypeId, sex);
      const rowsForSheet = dataRows.map((row) => ({
        [HEADER_MAP.rank]: row.rank,
        [HEADER_MAP.lastName]: row.lastName,
        [HEADER_MAP.firstName]: row.firstName,
        [HEADER_MAP.middleName]: row.middleName,
        [HEADER_MAP.resultDisplay]: row.resultDisplay,
        [HEADER_MAP.resultType]: resultTypeLabel(row.resultType),
        [HEADER_MAP.sortValue]: row.sortValue,
        [HEADER_MAP.runDateTime]: row.runDateTime,
        [HEADER_MAP.runId]: row.runId,
        [HEADER_MAP.runSessionId]: row.runSessionId,
        [HEADER_MAP.participantId]: row.participantId,
        [HEADER_MAP.competitionId]: row.competitionId,
        [HEADER_MAP.runTypeId]: row.runTypeId,
        [HEADER_MAP.gender]: row.gender,
      }));

      const sheet = utils.json_to_sheet(rowsForSheet);
      sheet['!autofilter'] = {
        ref: `A1:${String.fromCharCode('A'.charCodeAt(0) + Object.keys(HEADER_MAP).length - 1)}1`,
      };
      sheet['!cols'] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 22 },
        { wch: 40 },
        { wch: 40 },
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
