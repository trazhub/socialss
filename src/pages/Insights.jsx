import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";

function StatCard({ label, value, tone = "default", sublabel }) {
  return (
    <div className={`insight-stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sublabel ? <small>{sublabel}</small> : null}
    </div>
  );
}

export default function Insights({ onLoggedOut }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const { msg, show, toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.profile.insights()
      .then((res) => setData(res.insights))
      .catch(() => toast("Failed to load insights."))
      .finally(() => setLoading(false));
  }, [toast]);

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      onLoggedOut?.();
      navigate("/");
    }
  }

  const totals = data?.totals || { views: 0, link_clicks: 0, social_clicks: 0 };
  const today = data?.today || { views: 0, link_clicks: 0, social_clicks: 0 };
  const last30 = data?.last30 || [];
  const totalActions = totals.views + totals.link_clicks + totals.social_clicks;
  const todayActions = today.views + today.link_clicks + today.social_clicks;
  const avgDaily = last30.length ? Math.round(last30.reduce((sum, day) => sum + day.views + day.link_clicks + day.social_clicks, 0) / last30.length) : 0;
  const bestDay = last30.reduce((best, day) => {
    const actions = day.views + day.link_clicks + day.social_clicks;
    if (!best || actions > best.actions) return { day: day.day, actions };
    return best;
  }, null);
  const maxDayValue = Math.max(1, ...last30.map((day) => day.views + day.link_clicks + day.social_clicks));

  return (
    <div className="acct-layout insights-dashboard">
      <nav className="builder-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" className="brand-pill">
            <span className="brand-mark">TL</span>
            <span>TrazLinks</span>
          </Link>
          <span style={{ color: "var(--muted)", fontSize: ".82rem", fontWeight: 600 }}>
            Insights
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/builder" className="btn btn-sm btn-yellow">Builder</Link>
          <Link to="/account" className="btn btn-sm">Account</Link>
          <button onClick={logout} className="icon-btn dark" title="Sign out">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </nav>

      <div className="acct-body">
        <div className="acct-inner insights-inner">
          <section className="insights-hero">
            <div>
              <p className="builder-kicker">Analytics dashboard</p>
              <h1>Traffic and click performance</h1>
              <p className="insight-copy">
                See how many people view your page, tap your links, and interact with your social icons.
              </p>
            </div>
            <div className="insights-hero-badge">
              <span>30 day actions</span>
              <strong>{last30.reduce((sum, day) => sum + day.views + day.link_clicks + day.social_clicks, 0)}</strong>
            </div>
          </section>

          <div className="insight-stat-grid">
            <StatCard label="Total actions" value={totalActions} tone="blue" sublabel="All-time combined activity" />
            <StatCard label="Today" value={todayActions} tone="green" sublabel="Views and outbound clicks today" />
            <StatCard label="Daily average" value={avgDaily} tone="yellow" sublabel="Based on the last 30 days" />
            <StatCard label="Best day" value={bestDay?.actions || 0} tone="pink" sublabel={bestDay ? bestDay.day : "No data yet"} />
          </div>

          <div className="insights-grid">
            <div className="acct-section">
              <div className="acct-section-head">Activity trend</div>
              <div className="acct-section-body">
                {loading ? (
                  <p className="insight-copy">Loading insights...</p>
                ) : last30.length === 0 ? (
                  <p className="insight-copy">No analytics yet. Once people visit and click your page, activity will show up here.</p>
                ) : (
                  <>
                    <div className="insight-legend">
                      <span><i className="insight-legend-dot views" /> Views</span>
                      <span><i className="insight-legend-dot links" /> Links</span>
                      <span><i className="insight-legend-dot socials" /> Socials</span>
                    </div>
                    <div className="insight-chart">
                      {last30.map((day) => {
                        const total = day.views + day.link_clicks + day.social_clicks;
                        const height = `${Math.max(10, (total / maxDayValue) * 100)}%`;
                        return (
                          <div key={day.day} className="insight-bar-col" title={`${day.day}: ${total} actions`}>
                            <div className="insight-bar-stack" style={{ height }}>
                              <span className="insight-bar insight-views" style={{ height: `${(day.views / Math.max(total, 1)) * 100}%` }} />
                              <span className="insight-bar insight-links" style={{ height: `${(day.link_clicks / Math.max(total, 1)) * 100}%` }} />
                              <span className="insight-bar insight-socials" style={{ height: `${(day.social_clicks / Math.max(total, 1)) * 100}%` }} />
                            </div>
                            <small>{day.day.slice(5)}</small>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="acct-section">
              <div className="acct-section-head">Breakdown</div>
              <div className="acct-section-body">
                <div className="insight-mini-grid">
                  <div className="insight-mini-row"><span>Total profile views</span><strong>{totals.views}</strong></div>
                  <div className="insight-mini-row"><span>Total link clicks</span><strong>{totals.link_clicks}</strong></div>
                  <div className="insight-mini-row"><span>Total social clicks</span><strong>{totals.social_clicks}</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="insights-grid">
            <div className="acct-section">
              <div className="acct-section-head">Today</div>
              <div className="acct-section-body">
                <div className="insight-mini-grid">
                  <div className="insight-mini-row"><span>Profile views</span><strong>{today.views}</strong></div>
                  <div className="insight-mini-row"><span>Custom link clicks</span><strong>{today.link_clicks}</strong></div>
                  <div className="insight-mini-row"><span>Social icon clicks</span><strong>{today.social_clicks}</strong></div>
                </div>
              </div>
            </div>

            <div className="acct-section">
              <div className="acct-section-head">Read this</div>
              <div className="acct-section-body">
                <p className="insight-copy">
                  Views count visits to the public page. Link clicks and social clicks only count when visitors use the tracked outbound buttons from your page.
                </p>
                <Link to="/builder" className="btn btn-yellow" style={{ alignSelf: "flex-start" }}>
                  Tune your page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast msg={msg} show={show} />
    </div>
  );
}
