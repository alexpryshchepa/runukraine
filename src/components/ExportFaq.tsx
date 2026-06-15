import type { ReactNode } from 'react';
import { useLang } from '../i18n/languageContext';
import type { Lang } from '../i18n/messages';

type DeviceFaq = { name: string; steps: ReactNode[] };
type FaqContent = { question: string; intro: ReactNode; devices: DeviceFaq[] };

const FAQ: Record<Lang, FaqContent> = {
  en: {
    question: 'How do I export a .tcx file?',
    intro: (
      <>
        You need a <strong>.tcx</strong> file — it carries the distance, heart-rate and cadence
        data the merge relies on. A plain GPX won't work, because its distance comes from the GPS,
        which is exactly what was broken.
      </>
    ),
    devices: [
      {
        name: 'Garmin Connect',
        steps: [
          <>
            Open the activity on <code>connect.garmin.com</code> (web only).
          </>,
          <>Click the gear icon (⚙) in the top-right.</>,
          <>
            Choose <strong>Export to TCX</strong>.
          </>,
        ],
      },
      {
        name: 'Polar Flow',
        steps: [
          <>
            Open the session on <code>flow.polar.com</code> → Diary (web only).
          </>,
          <>
            Click the <strong>Export</strong> menu in the top-right.
          </>,
          <>
            Choose <strong>TCX</strong>.
          </>,
        ],
      },
      {
        name: 'COROS',
        steps: [
          <>In the COROS app: Activities → open the activity → tap ⋯ (top-right).</>,
          <>
            Choose <strong>Export Data</strong> → <strong>TCX</strong>.
          </>,
          <>(Or on the web: COROS Training Hub → Activity List → Export Data → TCX.)</>,
        ],
      },
      {
        name: 'Strava',
        steps: [
          <>Strava's own menu only exports GPX, which won't work here.</>,
          <>
            For a real TCX, open the activity on <code>strava.com</code> and add{' '}
            <code>/export_tcx</code> to the URL — e.g.{' '}
            <code>strava.com/activities/1234567890/export_tcx</code>.
          </>,
        ],
      },
      {
        name: 'Suunto',
        steps: [
          <>The Suunto app exports FIT or GPX, not TCX.</>,
          <>
            Export the <strong>FIT</strong> file (⋯ → download FIT) and convert it to TCX with a
            file converter — or use the Strava trick above if it's synced there.
          </>,
        ],
      },
      {
        name: 'Wahoo',
        steps: [
          <>Wahoo exports FIT, not TCX.</>,
          <>
            Convert the FIT to TCX with a file converter — or, if it's synced to Strava, use the{' '}
            <code>/export_tcx</code> trick above.
          </>,
        ],
      },
      {
        name: 'Other apps',
        steps: [
          <>
            Look for an <strong>Export</strong> option (usually in the web version) and pick{' '}
            <strong>TCX</strong>.
          </>,
          <>If only GPX is offered it won't work — export TCX, or export a FIT and convert it.</>,
        ],
      },
    ],
  },
  uk: {
    question: 'Як експортувати файл .tcx?',
    intro: (
      <>
        Вам потрібен файл <strong>.tcx</strong> — він містить дані про дистанцію, пульс і каденс,
        на які спирається об'єднання. Звичайний GPX не підійде, бо його дистанція береться з GPS,
        а саме він і був несправний.
      </>
    ),
    devices: [
      {
        name: 'Garmin Connect',
        steps: [
          <>
            Відкрийте тренування на <code>connect.garmin.com</code> (лише веб).
          </>,
          <>Натисніть значок шестерні (⚙) у верхньому правому куті.</>,
          <>
            Оберіть <strong>Export to TCX</strong>.
          </>,
        ],
      },
      {
        name: 'Polar Flow',
        steps: [
          <>
            Відкрийте сесію на <code>flow.polar.com</code> → Diary (лише веб).
          </>,
          <>
            Натисніть меню <strong>Export</strong> у верхньому правому куті.
          </>,
          <>
            Оберіть <strong>TCX</strong>.
          </>,
        ],
      },
      {
        name: 'COROS',
        steps: [
          <>У застосунку COROS: Activities → відкрийте тренування → натисніть ⋯ (вгорі праворуч).</>,
          <>
            Оберіть <strong>Export Data</strong> → <strong>TCX</strong>.
          </>,
          <>(Або у веб-версії: COROS Training Hub → Activity List → Export Data → TCX.)</>,
        ],
      },
      {
        name: 'Strava',
        steps: [
          <>Власне меню Strava експортує лише GPX, який тут не підійде.</>,
          <>
            Щоб отримати справжній TCX, відкрийте тренування на <code>strava.com</code> і додайте{' '}
            <code>/export_tcx</code> до URL — напр.{' '}
            <code>strava.com/activities/1234567890/export_tcx</code>.
          </>,
        ],
      },
      {
        name: 'Suunto',
        steps: [
          <>Застосунок Suunto експортує FIT або GPX, але не TCX.</>,
          <>
            Експортуйте файл <strong>FIT</strong> (⋯ → download FIT) і конвертуйте його в TCX за
            допомогою конвертера файлів — або скористайтеся трюком зі Strava вище, якщо тренування
            синхронізоване туди.
          </>,
        ],
      },
      {
        name: 'Wahoo',
        steps: [
          <>Wahoo експортує FIT, а не TCX.</>,
          <>
            Конвертуйте FIT у TCX за допомогою конвертера файлів — або, якщо воно синхронізоване зі
            Strava, скористайтеся трюком <code>/export_tcx</code> вище.
          </>,
        ],
      },
      {
        name: 'Інші застосунки',
        steps: [
          <>
            Знайдіть опцію <strong>Export</strong> (зазвичай у веб-версії) і оберіть{' '}
            <strong>TCX</strong>.
          </>,
          <>
            Якщо доступний лише GPX, він не підійде — експортуйте TCX або експортуйте FIT і
            конвертуйте його.
          </>,
        ],
      },
    ],
  },
};

export function ExportFaq() {
  const { lang } = useLang();
  const faq = FAQ[lang];
  return (
    <details className="faq">
      <summary>{faq.question}</summary>
      <p>{faq.intro}</p>

      {faq.devices.map((device) => (
        <details key={device.name}>
          <summary>{device.name}</summary>
          <ol>
            {device.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>
      ))}
    </details>
  );
}
