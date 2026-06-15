import { ERROR_MESSAGES_EN, type ErrorCode } from '../lib/errors';

export type Lang = 'uk' | 'en';

export const LANGS: Lang[] = ['uk', 'en'];

type Messages = {
  htmlTitle: string;
  title: string;
  lede: string;
  chooseFile: string;
  loaded: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  download: string;
  uploadPrefix: string;
  uploadSuffix: string;
  activityName: string;
  activityNamePlaceholder: string;
  startTime: string;
  noRoutes: string;
  distance: string;
  time: string;
  avgHr: string;
  maxHr: string;
  avgCadence: string;
  langLabel: string;
  units: { km: string; bpm: string; spm: string };
  errors: Record<ErrorCode, string>;
};

/** Simple, nested string tables. `errors.*` are resolved by error code. */
const en: Messages = {
  htmlTitle: 'RunUkraine — track merger',
  title: 'RunUkraine — track merger',
  lede: "Paint your watch's telemetry onto an official event route when GPS was jammed.",
  chooseFile: 'Choose a .tcx file',
  loaded: 'Loaded {n} points.',
  step1: '1. Your activity file',
  step2: '2. Adjust start time & name',
  step3: '3. Pick the official route',
  step4: '4. Preview & download',
  download: 'Download merged .tcx',
  uploadPrefix: 'Then upload it at ',
  uploadSuffix: '.',
  activityName: 'Activity name',
  activityNamePlaceholder: 'My activity',
  startTime: 'Start time',
  noRoutes: 'No routes available yet. Add .gpx files to src/routes/.',
  distance: 'Distance',
  time: 'Time',
  avgHr: 'Avg HR',
  maxHr: 'Max HR',
  avgCadence: 'Avg cadence',
  langLabel: 'Language',
  units: {
    km: 'km',
    bpm: 'bpm',
    spm: 'spm',
  },
  errors: ERROR_MESSAGES_EN,
};

const uk: Messages = {
  htmlTitle: "RunUkraine — об'єднувач треків",
  title: "RunUkraine — об'єднувач треків",
  lede: 'Накладіть телеметрію годинника на офіційний маршрут забігу, коли GPS глушили.',
  chooseFile: 'Оберіть файл .tcx',
  loaded: 'Завантажено точок: {n}.',
  step1: '1. Файл вашого тренування',
  step2: '2. Скоригуйте час старту та назву',
  step3: '3. Оберіть офіційний маршрут',
  step4: '4. Перегляд і завантаження',
  download: "Завантажити об'єднаний .tcx",
  uploadPrefix: 'Потім завантажте його на ',
  uploadSuffix: '.',
  activityName: 'Назва тренування',
  activityNamePlaceholder: 'Моє тренування',
  startTime: 'Час старту',
  noRoutes: 'Поки що немає маршрутів. Додайте файли .gpx до src/routes/.',
  distance: 'Дистанція',
  time: 'Час',
  avgHr: 'Сер. пульс',
  maxHr: 'Макс. пульс',
  avgCadence: 'Сер. каденс',
  langLabel: 'Мова',
  units: {
    km: 'км',
    bpm: 'уд/хв',
    spm: 'кр/хв',
  },
  errors: {
    tcxInvalidXml: 'Не вдалося прочитати файл як TCX (некоректний XML).',
    tcxNoTrackpoints: 'У цьому TCX-файлі не знайдено точок треку.',
    tcxNoDistance: 'У цьому TCX-файлі немає даних про дистанцію, тому його не можна об’єднати.',
    gpxInvalidXml: 'Не вдалося прочитати файл як GPX (некоректний XML).',
    gpxTooFewPoints: 'Цей GPX-маршрут має містити щонайменше 2 точки.',
    mergeNoSamples: 'У цьому тренуванні немає даних для об’єднання.',
    mergeRouteTooFewPoints: 'Маршрут має містити щонайменше 2 точки.',
    mergeNoDistance: 'У цьому тренуванні немає придатної дистанції для накладання на маршрут.',
    exportEmpty: 'Не можна експортувати порожнє тренування.',
  },
};

export const messages: Record<Lang, Messages> = { en, uk };
