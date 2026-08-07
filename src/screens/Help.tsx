interface Props {
  onDone: () => void
}

export function Help({ onDone }: Props) {
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="icon-back" onClick={onDone} aria-label="Back">‹</button>
        <h1 className="screen-title">How it works</h1>
      </div>

      <div className="help-card">
        <h3>What this is</h3>
        <p>
          A private workout tracker that lives entirely on this device — there's no account
          and no server. Everything you log (weights, metrics, photos) is stored locally, so
          it's fast and works offline. Since nothing leaves your device automatically, it's
          worth setting up a backup — see "Backing up" below.
        </p>
      </div>

      <div className="help-card">
        <h3>The basics</h3>
        <p>
          Your training is organized as a <strong>split</strong> — a set of days (like "Chest
          &amp; Back" or "Legs"), each with a list of exercises. Set yours up (or edit it
          anytime) from Settings.
        </p>
        <ul>
          <li><strong>Workout tab:</strong> pick a day, then tap an exercise to log today's weight.</li>
          <li><strong>Progress tab:</strong> see trends for exercises, custom metrics, and progress photos.</li>
        </ul>
      </div>

      <div className="help-card">
        <h3>Logging a weight</h3>
        <p>
          Tap an exercise to open the log sheet. Use <strong>Weight</strong> mode to type a
          number directly, or <strong>Plates</strong> mode to build it up from what's actually
          on the bar. The ±2.5/±5 buttons nudge the current value; the <strong>±</strong> button
          flips the sign, for tracking assisted exercises (like assisted pull-ups or dips) as
          negative assistance instead of positive load.
        </p>
        <p>
          Already logged today? Tap the exercise again to update or clear it. A gold
          <strong> PR</strong> badge means today's weight beats your previous best for that
          exercise.
        </p>
      </div>

      <div className="help-card">
        <h3>Skipping an exercise</h3>
        <p>
          Swipe an exercise left to skip it for the day — it comes back automatically once the
          day resets. If you skip a few, a "Restore" button appears to bring them all back
          early.
        </p>
      </div>

      <div className="help-card">
        <h3>Plateau highlight</h3>
        <p>
          If an exercise's weight holds steady for a while, its "Last" weight is highlighted in
          amber as a nudge to try going heavier. It only lights up once you've genuinely
          plateaued — steady for a configurable number of sessions <em>and</em> a configurable
          number of weeks, whichever takes longer — and clears itself the moment you log a new
          personal best. Tune the thresholds, or turn it off entirely, in Settings.
        </p>
      </div>

      <div className="help-card">
        <h3>Tracking more than weight</h3>
        <p>
          Under Progress &gt; Metrics you can track anything else that matters to you —
          bodyweight, a max lift, even a rep count like max consecutive push-ups (choose
          "Reps" when adding it so it displays without a weight unit). Progress &gt; Photos
          holds your progress pictures, with a share button for sending a set of them
          elsewhere.
        </p>
      </div>

      <div className="help-card">
        <h3>Settings worth knowing</h3>
        <ul>
          <li><strong>Day resets at:</strong> a workout still going after midnight counts as the day before until this hour, so a late session doesn't get split across two days.</li>
          <li><strong>Flip exercise sign:</strong> retroactively multiplies every logged weight for one exercise by -1 — handy if you've been logging an assisted exercise as positive and want to switch it to negative without re-entering history.</li>
        </ul>
      </div>

      <div className="help-card">
        <h3>Backing up your data</h3>
        <p>
          Since everything lives only on this device, back it up before you lose or replace
          your phone. <strong>Back up now</strong> in Settings bundles everything — logs,
          metrics, custom exercises, your split, and photos — into one file and opens your
          share sheet, so you can save it straight to Files (iCloud), Google Drive, Dropbox, or
          wherever you keep backups. <strong>Restore from backup</strong> reads that file back
          in on a new device. There's also a smaller "Export data as JSON" for pasting your
          numbers into an AI chat for analysis.
        </p>
      </div>

      <div className="help-card">
        <h3>Questions or feedback?</h3>
        <p>
          You'll find a text link and a tip jar under Settings &gt; Support.
        </p>
      </div>
    </div>
  )
}
