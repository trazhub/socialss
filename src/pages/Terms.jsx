import { Link } from "react-router-dom";

function TermsSection({ title, children }) {
  return (
    <section className="policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function Terms() {
  return (
    <div className="policy-page">
      <div className="policy-shell">
        <div className="policy-topbar">
          <Link to="/" className="brand-pill">
            <span className="brand-mark">TL</span>
            <span>TrazLinks</span>
          </Link>
          <div className="policy-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/auth">Create account</Link>
          </div>
        </div>

        <div className="policy-card">
          <p className="policy-kicker">Terms of Use</p>
          <h1>Rules for using the service and publishing a public page.</h1>
          <p className="policy-lead">
            By using TrazLinks, users agree that this is a public publishing platform for profile links and personal page content.
          </p>

          <TermsSection title="Acceptable Use">
            <ul className="policy-list">
              <li>Do not use the service for illegal activity, phishing, malware, fraud, credential theft, spam, harassment, or impersonation.</li>
              <li>Do not upload or link content that infringes copyright, privacy, or publicity rights.</li>
              <li>Do not attempt to overload, scrape aggressively, bypass rate limits, exploit bugs, or interfere with service availability.</li>
            </ul>
          </TermsSection>

          <TermsSection title="Public Content Responsibility">
            <ul className="policy-list">
              <li>Users are responsible for the avatar images, names, links, and external destinations they publish.</li>
              <li>The operator may remove content or suspend access if content is abusive, unlawful, dangerous, or creates operational risk.</li>
            </ul>
          </TermsSection>

          <TermsSection title="Availability And Security">
            <ul className="policy-list">
              <li>The service may apply rate limits, file restrictions, and other abuse controls.</li>
              <li>Access may be limited, suspended, or terminated to protect users, infrastructure, or legal compliance.</li>
              <li>The operator may update security controls, storage methods, and infrastructure without prior notice.</li>
            </ul>
          </TermsSection>

          <TermsSection title="No Sensitive Data Use Case">
            <ul className="policy-list">
              <li>This service is for public profile publishing, not for storing confidential records.</li>
              <li>Users should not upload medical records, government documents, private family photos, bank information, or anything they expect to remain secret.</li>
            </ul>
          </TermsSection>

          <TermsSection title="No Warranty">
            <p className="policy-body">
              The service is provided on an as-available basis. There is no guarantee of uninterrupted operation, permanent storage, or error-free performance.
            </p>
          </TermsSection>
        </div>
      </div>
    </div>
  );
}
