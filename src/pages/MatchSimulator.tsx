import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useAppData, useData } from '../data/DataContext'
import { pairProbs, simulateMatch } from '../sim/engine'
import type { SimScore } from '../sim/engine'
import Flag from '../components/Flag'
import Icon from '../components/Icon'
import './matchsimulator.css'

interface SimEntry {
  id: number
  homeCode: string
  awayCode: string
  score: SimScore
  probs: { h: number; d: number; a: number }
}

export default function MatchSimulator() {
  const { t, pick } = useI18n()
  const { teams } = useAppData()
  const { simModel, loadSimModel } = useData()
  useEffect(() => {
    loadSimModel()
  })

  // every team with a known Elo rating, sorted by name for the pickers
  const teamCodes = useMemo(() => {
    if (!simModel) return []
    return Object.keys(simModel.teams)
      .filter((c) => teams[c])
      .sort((a, b) => pick(teams[a]?.name, a).localeCompare(pick(teams[b]?.name, b)))
  }, [simModel, teams, pick])

  const [homeCode, setHomeCode] = useState('')
  const [awayCode, setAwayCode] = useState('')
  // pick two different teams once the rating list is ready
  useEffect(() => {
    if (teamCodes.length > 1 && !homeCode && !awayCode) {
      setHomeCode(teamCodes[0])
      setAwayCode(teamCodes[1])
    }
  }, [teamCodes, homeCode, awayCode])

  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<SimEntry | null>(null)
  const [history, setHistory] = useState<SimEntry[]>([])
  const idRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const livePreview = useMemo(() => {
    if (!simModel || !homeCode || !awayCode || homeCode === awayCode) return null
    return pairProbs(simModel, homeCode, awayCode, undefined)
  }, [simModel, homeCode, awayCode])

  const canSimulate = !!simModel && !!homeCode && !!awayCode && homeCode !== awayCode && !analyzing

  const simulate = () => {
    if (!canSimulate || !simModel) return
    setAnalyzing(true)
    setResult(null)
    // brief "thinking" delay so the analysis step reads as deliberate, not instant
    timerRef.current = setTimeout(() => {
      const probs = pairProbs(simModel, homeCode, awayCode, undefined)
      const score = simulateMatch(simModel, homeCode, awayCode, undefined, false, Math.random)
      const entry: SimEntry = {
        id: idRef.current++,
        homeCode,
        awayCode,
        score,
        probs: { h: probs.h, d: probs.d, a: probs.a },
      }
      setResult(entry)
      setHistory((h) => [entry, ...h].slice(0, 8))
      setAnalyzing(false)
    }, 1100)
  }

  const swapTeams = () => {
    setHomeCode(awayCode)
    setAwayCode(homeCode)
    setResult(null)
  }

  const teamLabel = (code: string) => pick(teams[code]?.name, code)

  return (
    <div>
      <div className="page-head">
        <h1>{t('aimsTitle')}</h1>
        <p>{t('aimsSub')}</p>
      </div>

      <section className="card card-pad ams-panel">
        <div className="ams-pickers">
          <div className="ams-picker">
            <label htmlFor="ams-home">{t('aimsTeamA')}</label>
            <select
              id="ams-home"
              className="input"
              value={homeCode}
              onChange={(e) => {
                setHomeCode(e.target.value)
                setResult(null)
              }}
            >
              {teamCodes.map((c) => (
                <option key={c} value={c} disabled={c === awayCode}>
                  {teamLabel(c)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn ams-swap"
            onClick={swapTeams}
            disabled={!homeCode || !awayCode}
            aria-label={t('aimsSwap')}
            title={t('aimsSwap')}
          >
            <span aria-hidden="true">⇄</span>
          </button>

          <div className="ams-picker">
            <label htmlFor="ams-away">{t('aimsTeamB')}</label>
            <select
              id="ams-away"
              className="input"
              value={awayCode}
              onChange={(e) => {
                setAwayCode(e.target.value)
                setResult(null)
              }}
            >
              {teamCodes.map((c) => (
                <option key={c} value={c} disabled={c === homeCode}>
                  {teamLabel(c)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {livePreview && !result && !analyzing && (
          <div className="ams-preview">
            <ProbBar
              home={teamLabel(homeCode)}
              away={teamLabel(awayCode)}
              probs={livePreview}
              compact
            />
          </div>
        )}

        <button type="button" className="btn btn-primary ams-go" onClick={simulate} disabled={!canSimulate}>
          <Icon name="bolt" size={16} />
          {t('aimsSimulate')}
        </button>

        {analyzing && (
          <div className="ams-analyzing" role="status" aria-live="polite">
            <BallSpinner />
            {t('aimsAnalyzing')}
          </div>
        )}

        {result && !analyzing && <ResultCard entry={result} teamLabel={teamLabel} />}
      </section>

      {history.length > 0 && (
        <section className="ams-history-section">
          <div className="section-title">
            <h2>{t('aimsHistory')}</h2>
            <button type="button" className="more ams-clear" onClick={() => setHistory([])}>
              {t('aimsClearHistory')}
            </button>
          </div>
          <div className="ams-history">
            {history.map((h) => (
              <div key={h.id} className="card card-pad ams-history-row">
                <Flag team={teams[h.homeCode]} size={18} />
                <span className="ams-history-team">{teamLabel(h.homeCode)}</span>
                <span className="tnum ams-history-score">
                  {h.score.h}–{h.score.a}
                </span>
                <span className="ams-history-team away">{teamLabel(h.awayCode)}</span>
                <Flag team={teams[h.awayCode]} size={18} />
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="muted small ams-note">{t('aimsNote')}</p>
    </div>
  )
}

function ResultCard({
  entry,
  teamLabel,
}: {
  entry: SimEntry
  teamLabel: (code: string) => string
}) {
  const { teams } = useAppData()
  const { t } = useI18n()
  const { homeCode, awayCode, score, probs } = entry
  const winner = score.h > score.a ? homeCode : score.a > score.h ? awayCode : null

  return (
    <div className="ams-result">
      <GoalFlash replayKey={entry.id} />
      <div className="ams-scoreboard">
        <div className={`ams-team${winner === homeCode ? ' win' : ''}`}>
          <Flag team={teams[homeCode]} size={36} />
          <span>{teamLabel(homeCode)}</span>
        </div>
        <div className="ams-score tnum">
          {score.h} – {score.a}
        </div>
        <div className={`ams-team away${winner === awayCode ? ' win' : ''}`}>
          <span>{teamLabel(awayCode)}</span>
          <Flag team={teams[awayCode]} size={36} />
        </div>
      </div>
      <p className="ams-result-label">
        {winner ? t('aimsWinner', { team: teamLabel(winner) }) : t('aimsDraw')}
      </p>
      <ProbBar home={teamLabel(homeCode)} away={teamLabel(awayCode)} probs={probs} />
    </div>
  )
}

function ProbBar({
  home,
  away,
  probs,
  compact = false,
}: {
  home: string
  away: string
  probs: { h: number; d: number; a: number }
  compact?: boolean
}) {
  const { t } = useI18n()
  const pct = (x: number) => `${Math.round(x * 100)}%`
  return (
    <div className={`ams-probbar${compact ? ' compact' : ''}`}>
      {!compact && (
        <div className="ams-probbar-labels">
          <span>{home}</span>
          <span>{t('aimsDrawLabel')}</span>
          <span>{away}</span>
        </div>
      )}
      <div className="ams-probbar-track" aria-hidden="true">
        <span className="ams-seg h" style={{ width: pct(probs.h) }} />
        <span className="ams-seg d" style={{ width: pct(probs.d) }} />
        <span className="ams-seg a" style={{ width: pct(probs.a) }} />
      </div>
      <div className="ams-probbar-nums tnum">
        <span>{pct(probs.h)}</span>
        <span>{pct(probs.d)}</span>
        <span>{pct(probs.a)}</span>
      </div>
    </div>
  )
}

/** spinning ball shown while the Elo model "thinks" */
function BallSpinner() {
  return (
    <span className="ams-ball" aria-hidden="true">
      ⚽
    </span>
  )
}

/** brief goal celebration: ball flying into the net, shown once per result */
function GoalFlash({ replayKey }: { replayKey: number }) {
  const [phase, setPhase] = useState<'start' | 'shoot' | 'text'>('start')

  // biome-ignore lint/correctness/useExhaustiveDependencies: replayKey is the intentional replay trigger
  useEffect(() => {
    setPhase('start')
    // two rAFs ensure the browser paints the "start" position first,
    // so the transition to "shoot" is guaranteed to animate
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase('shoot'))
    })
    const textTimer = setTimeout(() => setPhase('text'), 1150)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(textTimer)
    }
  }, [replayKey])

  return (
    <div className="ams-goalflash" aria-hidden="true">
      <span className={`ams-net${phase !== 'start' ? ' shake' : ''}`} />
      <span className={`ams-goalball ${phase === 'start' ? 'at-start' : 'at-net'}`}>⚽</span>
      <span className={`ams-goaltext${phase === 'text' ? ' show' : ''}`}>¡GOOOL!</span>
    </div>
  )
}