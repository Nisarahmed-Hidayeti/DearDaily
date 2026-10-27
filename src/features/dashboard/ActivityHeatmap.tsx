import { sampleActivity } from '../../data/demo'
import { parseLocalDate } from '../../lib/dates'
import './activity.css'

export default function ActivityHeatmap() {
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
  const dayFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
  })
  const weeks = Array.from({ length: sampleActivity.length / 7 }, (_, week) =>
    sampleActivity.slice(week * 7, week * 7 + 7),
  )
  const start = parseLocalDate(sampleActivity[0].date)
  const end = parseLocalDate(sampleActivity[sampleActivity.length - 1].date)
  const rangeFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return (
    <section className="panel activity" aria-labelledby="activity-title">
      <div className="row spread">
        <div>
          <h2 id="activity-title">Your writing rhythm</h2>
          <p className="muted">A little consistency goes a long way.</p>
        </div>
        <span className="badge">Sample activity · 12 weeks</span>
      </div>
      <p className="sr-only" id="activity-description">
        Fictional writing activity. Weeks run left to right, with Monday through
        Sunday from top to bottom. Each square describes its date and minutes
        written. Scroll horizontally for more weeks on small screens.
      </p>
      <div
        className="activity-scroll"
        tabIndex={0}
        role="region"
        aria-label="Writing activity calendar"
        aria-describedby="activity-description"
      >
        <div className="activity-calendar">
          <div className="weekday-labels" aria-hidden="true">
            {weeks[0].map((day) => (
              <span key={day.date}>
                {weekdayFormatter.format(parseLocalDate(day.date))}
              </span>
            ))}
          </div>
          <div
            className="activity-weeks"
            role="list"
            aria-label="Weeks of sample writing activity"
          >
            {weeks.map((days, weekIndex) => {
              const monthDay = days.find(
                (day) => parseLocalDate(day.date).getDate() === 1,
              )
              const monthLabel =
                weekIndex === 0
                  ? monthFormatter.format(start)
                  : monthDay
                    ? monthFormatter.format(parseLocalDate(monthDay.date))
                    : ''
              return (
                <div
                  className="activity-week"
                  role="listitem"
                  key={days[0].date}
                  aria-label={`Week of ${dayFormatter.format(parseLocalDate(days[0].date))}`}
                >
                  <span className="month-label" aria-hidden="true">
                    {monthLabel}
                  </span>
                  <div className="heatmap">
                    {days.map((day) => {
                      const description = `${dayFormatter.format(parseLocalDate(day.date))}: ${day.minutes === 0 ? 'no writing' : `${day.minutes} minutes written`} (sample)`
                      return (
                        <span
                          className="activity-cell"
                          key={day.date}
                          data-date={day.date}
                          data-level={day.level}
                          role="img"
                          aria-label={description}
                          title={description}
                          style={{ background: `var(--heat-${day.level})` }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="activity-footer">
        <span>{rangeFormatter.formatRange(start, end)}</span>
        <span
          className="activity-legend"
          aria-label="Color intensity increases from no writing to 40 minutes written"
        >
          Less{' '}
          {[0, 1, 2, 3, 4].map((level) => (
            <i
              className="heat-key"
              key={level}
              aria-hidden="true"
              style={{ background: `var(--heat-${level})` }}
            />
          ))}{' '}
          More
        </span>
      </div>
    </section>
  )
}
