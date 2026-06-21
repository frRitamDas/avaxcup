import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAppData, useData } from '../data/DataContext'
import Flag from '../components/Flag'
import Icon from '../components/Icon'
import InfoDot from '../components/InfoDot'
import './polymarket.css'

export default function Polymarket() {
  const { t, pick, locale } = useI18n()
  const { teams } = useAppData()
  const { marketOdds, loadMarketOdds } = useData()
  useEffect(() => {
    loadMarketOdds()
  })

  const rows = useMemo(() => marketOdds?.champion ?? [], [marketOdds])
  const maxNorm = useMemo(() => rows.reduce((m, r) => Math.max(m, r.norm), 0) || 1, [rows])

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`
  const volume = useMemo(() => {
    if (!marketOdds?.volume) return ''
    try {
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 1,
      }).format(marketOdds.volume)
    } catch {
      return `$${marketOdds.volume.toLocaleString()}`
    }
  }, [marketOdds, locale])
  const updated = useMemo(() => {
    const iso = marketOdds?.marketUpdatedAt ?? marketOdds?.updatedAt
    if (!iso) return ''
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(iso),
      )
    } catch {
      return ''
    }
  }, [marketOdds, locale])

  return (
    <div className="mkt-page">
      <div className="page-head">
        <h1>{t('mktTitle')}</h1>
        <p>{t('mktSub')}</p>
      </div>

      {marketOdds && rows.length > 0 ? (
        <>
          <div className="card card-pad mkt-meta">
            <div className="mkt-meta-stats">
              {volume && (
                <span className="mkt-volume">
                  <Icon name="market" size={16} />
                  {t('mktVolume', { x: volume })}
                </span>
              )}
              {updated && <span className="muted small">{t('mktUpdated', { date: updated })}</span>}
            </div>
            <a className="btn mkt-link" href={marketOdds.url} target="_blank" rel="noopener noreferrer">
              {t('mktViewOn')}
              <Icon name="external" size={15} />
            </a>
          </div>

          <section className="card mkt-table-card">
            <table className="mkt-table tnum">
              <thead>
                <tr>
                  <th className="mkt-rank-h" scope="col">
                    #
                  </th>
                  <th className="mkt-team-h" scope="col">
                    {t('mktColTeam')}
                  </th>
                  <th className="mkt-chance-h" scope="col">
                    <span className="mkt-th-label">
                      {t('mktColChance')}
                      <InfoDot text={t('mktColChanceTip')} />
                    </span>
                  </th>
                  <th className="mkt-price-h" scope="col">
                    <span className="mkt-th-label">
                      {t('mktColImplied')}
                      <InfoDot text={t('mktColImpliedTip')} align="end" />
                    </span>
                  </th>
                  <th className="mkt-chg-h" scope="col">
                    <span className="mkt-th-label">
                      {t('mktColChange')}
                      <InfoDot text={t('mktColChangeTip')} align="end" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const team = teams[r.code]
                  const name = team ? pick(team.name, r.code) : r.label
                  const chg = r.change1d
                  return (
                    <tr key={r.code}>
                      <td className="mkt-rank">{i + 1}</td>
                      <th scope="row" className="mkt-team">
                        <Link to={`/team/${r.code}`}>
                          <Flag team={team} iso2={team?.iso2} size={20} />
                          <span className="mkt-team-name">{name}</span>
                        </Link>
                      </th>
                      <td className="mkt-chance">
                        <div className="mkt-bar-wrap">
                          <div
                            className="mkt-bar"
                            style={{ width: `${(r.norm / maxNorm) * 100}%` }}
                            aria-hidden="true"
                          />
                          <span className="mkt-chance-val">{pct(r.norm)}</span>
                        </div>
                      </td>
                      <td className="mkt-price">{pct(r.price)}</td>
                      <td className={`mkt-chg${chg > 0.0005 ? ' up' : chg < -0.0005 ? ' down' : ''}`}>
                        {chg > 0.0005 ? '+' : chg < -0.0005 ? '−' : ''}
                        {Math.abs(chg * 100).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>

          <p className="muted small mkt-disclaimer">{t('mktDisclaimer')}</p>
        </>
      ) : (
        <div className="card card-pad muted">{t('mktEmpty')}</div>
      )}
    </div>
  )
}
