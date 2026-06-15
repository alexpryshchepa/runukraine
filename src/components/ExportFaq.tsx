export function ExportFaq() {
  return (
    <details className="faq">
      <summary>How do I export a .tcx file?</summary>
      <p>
        You need a <strong>.tcx</strong> file — it carries the distance, heart-rate and
        cadence data the merge relies on. A plain GPX won't work, because its distance comes
        from the GPS, which is exactly what was broken.
      </p>

      <details>
        <summary>Garmin Connect</summary>
        <ol>
          <li>Open the activity on <code>connect.garmin.com</code> (web only).</li>
          <li>Click the gear icon (⚙) in the top-right.</li>
          <li>Choose <strong>Export to TCX</strong>.</li>
        </ol>
      </details>

      <details>
        <summary>Polar Flow</summary>
        <ol>
          <li>Open the session on <code>flow.polar.com</code> → Diary (web only).</li>
          <li>Click the <strong>Export</strong> menu in the top-right.</li>
          <li>Choose <strong>TCX</strong>.</li>
        </ol>
      </details>

      <details>
        <summary>COROS</summary>
        <ol>
          <li>In the COROS app: Activities → open the activity → tap ⋯ (top-right).</li>
          <li>Choose <strong>Export Data</strong> → <strong>TCX</strong>.</li>
          <li>(Or on the web: COROS Training Hub → Activity List → Export Data → TCX.)</li>
        </ol>
      </details>

      <details>
        <summary>Strava</summary>
        <ol>
          <li>Strava's own menu only exports GPX, which won't work here.</li>
          <li>
            For a real TCX, open the activity on <code>strava.com</code> and add{' '}
            <code>/export_tcx</code> to the URL — e.g.{' '}
            <code>strava.com/activities/1234567890/export_tcx</code>.
          </li>
        </ol>
      </details>

      <details>
        <summary>Suunto</summary>
        <ol>
          <li>The Suunto app exports FIT or GPX, not TCX.</li>
          <li>
            Export the <strong>FIT</strong> file (⋯ → download FIT) and convert it to TCX with
            a file converter — or use the Strava trick above if it's synced there.
          </li>
        </ol>
      </details>

      <details>
        <summary>Wahoo</summary>
        <ol>
          <li>Wahoo exports FIT, not TCX.</li>
          <li>
            Convert the FIT to TCX with a file converter — or, if it's synced to Strava, use
            the <code>/export_tcx</code> trick above.
          </li>
        </ol>
      </details>

      <details>
        <summary>Other apps</summary>
        <ol>
          <li>Look for an <strong>Export</strong> option (usually in the web version) and pick <strong>TCX</strong>.</li>
          <li>If only GPX is offered it won't work — export TCX, or export a FIT and convert it.</li>
        </ol>
      </details>
    </details>
  );
}
