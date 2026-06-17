import { ERROR_MESSAGES_EN, type ErrorCode } from '../lib/errors';

export type Lang = 'uk' | 'en';

export const LANGS: Lang[] = ['uk', 'en'];

type Messages = {
  htmlTitle: string;
  title: string;
  tagline: string;
  heroTitle: string;
  lede: string;
  chooseFile: string;
  dropTitle: string;
  dropHint: string;
  privacy: string;
  loaded: string;
  replace: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  mapRoute: string;
  routeSourceOfficial: string;
  routeSourceCustom: string;
  uploadRouteTitle: string;
  uploadRouteHint: string;
  uploadRouteLabel: string;
  legendMerged: string;
  legendOriginal: string;
  download: string;
  uploadPrefix: string;
  uploadSuffix: string;
  fileName: string;
  fileNamePlaceholder: string;
  startTime: string;
  futureStartError: string;
  invalidStartError: string;
  noRoutes: string;
  distance: string;
  time: string;
  pace: string;
  avgHr: string;
  maxHr: string;
  avgCadence: string;
  langLabel: string;
  disclaimer: string;
  units: { km: string; bpm: string; spm: string; minPerKm: string };
  errors: Record<ErrorCode, string>;
};

/** Simple, nested string tables. `errors.*` are resolved by error code. */
const en: Messages = {
  htmlTitle: 'Replot — track merger',
  title: 'Replot — track merger',
  tagline: 'Track merger',
  heroTitle: "Rescue the run GPS couldn't record.",
  lede: 'When the signal was jammed, your watch still kept the truth — your time, distance, heart rate and cadence. Replot paints that telemetry onto the real event route, so your run finally looks the way it felt.',
  chooseFile: 'Choose a .tcx file',
  dropTitle: 'Drop your .tcx file here',
  dropHint: 'or click to browse — nothing leaves your device',
  privacy: '100% in your browser. Your file is never uploaded anywhere.',
  loaded: '{n} points loaded',
  replace: 'Replace',
  step1: 'Add your activity file',
  step2: 'File name and start',
  step3: 'Choose the route',
  step4: 'Preview and download',
  mapRoute: 'Route',
  routeSourceOfficial: 'Official routes',
  routeSourceCustom: 'Upload your own',
  uploadRouteTitle: 'Upload your own .gpx route',
  uploadRouteHint: 'or click to browse — nothing leaves your device',
  uploadRouteLabel: 'Upload a .gpx route file',
  legendMerged: 'Merged route',
  legendOriginal: 'Original GPS (jammed)',
  download: 'Download merged .tcx',
  uploadPrefix: 'Then upload it to ',
  uploadSuffix: " — and you're done.",
  fileName: 'File name',
  fileNamePlaceholder: 'File name',
  startTime: 'Start time',
  futureStartError: "Start time can't be in the future.",
  invalidStartError: 'Enter a valid start time.',
  noRoutes: 'No routes available yet. Add .gpx files to src/routes/.',
  distance: 'Distance',
  time: 'Time',
  pace: 'Pace',
  avgHr: 'Avg HR',
  maxHr: 'Max HR',
  avgCadence: 'Avg cadence',
  langLabel: 'Language',
  disclaimer:
    'Independent, unofficial tool. Not affiliated with, endorsed by, or sponsored by RunUkraine or any race organizer. All trademarks are the property of their respective owners.',
  units: {
    km: 'km',
    bpm: 'bpm',
    spm: 'spm',
    minPerKm: '/km',
  },
  errors: ERROR_MESSAGES_EN,
};

const uk: Messages = {
  htmlTitle: "Replot — об'єднувач треків",
  title: "Replot — об'єднувач треків",
  tagline: "Об'єднувач треків",
  heroTitle: 'Поверніть забіг, який не зміг записати GPS.',
  lede: 'Коли сигнал глушили, годинник усе одно зберіг головне — ваш час, дистанцію, пульс і каденс. Replot накладає цю телеметрію на справжній маршрут забігу, щоб результат нарешті виглядав так, як відчувався.',
  chooseFile: 'Оберіть файл .tcx',
  dropTitle: 'Перетягніть файл .tcx сюди',
  dropHint: 'або натисніть, щоб обрати — нічого не залишає ваш пристрій',
  privacy: '100% у вашому браузері. Файл нікуди не завантажується.',
  loaded: 'Завантажено точок: {n}',
  replace: 'Замінити',
  step1: 'Додайте файл тренування',
  step2: 'Назва файлу та час старту',
  step3: 'Оберіть маршрут',
  step4: 'Перегляд і завантаження',
  mapRoute: 'Маршрут',
  routeSourceOfficial: 'Офіційні маршрути',
  routeSourceCustom: 'Власний файл',
  uploadRouteTitle: 'Завантажте власний маршрут .gpx',
  uploadRouteHint: 'або натисніть, щоб обрати — нічого не залишає ваш пристрій',
  uploadRouteLabel: 'Завантажте файл маршруту .gpx',
  legendMerged: "Об'єднаний маршрут",
  legendOriginal: 'Початковий GPS (заглушений)',
  download: "Завантажити об'єднаний .tcx",
  uploadPrefix: 'Потім завантажте його на ',
  uploadSuffix: ' — і готово.',
  fileName: 'Назва файлу',
  fileNamePlaceholder: 'Назва файлу',
  startTime: 'Час старту',
  futureStartError: 'Час початку не може бути в майбутньому.',
  invalidStartError: 'Вкажіть коректний час старту.',
  noRoutes: 'Поки що немає маршрутів. Додайте файли .gpx до src/routes/.',
  distance: 'Дистанція',
  time: 'Час',
  pace: 'Темп',
  avgHr: 'Сер. пульс',
  maxHr: 'Макс. пульс',
  avgCadence: 'Сер. каденс',
  langLabel: 'Мова',
  disclaimer:
    "Незалежний, неофіційний інструмент. Не пов'язаний із RunUkraine чи будь-яким організатором забігів, не схвалений і не спонсорований ними. Усі торгові марки належать їхнім власникам.",
  units: {
    km: 'км',
    bpm: 'уд/хв',
    spm: 'кр/хв',
    minPerKm: '/км',
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
