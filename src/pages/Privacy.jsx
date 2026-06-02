import { Link } from "react-router-dom";

const CONTACT_EMAIL = "privacy@link.trazz.art";

function PolicySection({ title, children }) {
  return (
    <section className="policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="policy-page">
      <div className="policy-shell">
        <div className="policy-topbar">
          <Link to="/" className="brand-pill">
            <span className="brand-mark">TL</span>
            <span>TrazLinks</span>
          </Link>
          <div className="policy-links">
            <Link to="/terms">Terms</Link>
            <Link to="/auth">Create account</Link>
          </div>
        </div>

        <div className="policy-card">
          <p className="policy-kicker">Privacy Policy</p>
          <h1>What this app stores, what becomes public, and what users can delete.</h1>
          <p className="policy-lead">
            TrazLinks is a profile-link service. Some data stays private for account operation, and some data becomes public because the user publishes it on their page.
          </p>

          <PolicySection title="Data We Collect">
            <ul className="policy-list">
              <li>Email address, username, and password hash for account access.</li>
              <li>Profile content such as display name, bio, social links, custom links, Discord ID, and avatar image.</li>
              <li>Basic operational metadata such as timestamps, security logs, and rate-limit data needed to prevent abuse.</li>
            </ul>
          </PolicySection>

          <PolicySection title="What Becomes Public">
            <ul className="policy-list">
              <li>Usernames and public profile pages at `/u/username`.</li>
              <li>Anything a user chooses to publish on their page, including avatar, bio, social links, custom links, and Discord status card if enabled.</li>
              <li>Public profile data is visible to anyone with the profile URL.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Avatar Uploads And Image Privacy">
            <ul className="policy-list">
              <li>Uploaded profile photos are stored by the service and displayed publicly on that user’s profile page.</li>
              <li>Users should only upload images they own or have permission to use.</li>
              <li>If a user replaces an avatar, the old avatar is deleted from active storage when possible.</li>
              <li>If a user deletes their account, the service attempts to delete the stored avatar and profile data as part of account deletion.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Infrastructure And Third Parties">
            <ul className="policy-list">
              <li>Traffic may pass through Cloudflare services for tunnel, DNS, and security filtering.</li>
              <li>Avatar files may be stored on the app server or an external object storage provider if configured.</li>
              <li>Public pages may load external resources such as Google Fonts and Discord/Lanyard presence images.</li>
            </ul>
          </PolicySection>

          <PolicySection title="What Users Should Not Upload">
            <ul className="policy-list">
              <li>Sensitive personal documents, private family photos, government IDs, financial information, or anything they do not want publicly exposed.</li>
              <li>Illegal content, non-consensual imagery, malware, or copyrighted content they do not have the right to publish.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Retention And Deletion">
            <ul className="policy-list">
              <li>Account and profile data are kept while the account exists.</li>
              <li>Users can change or remove profile content from the builder.</li>
              <li>Operational logs and backups may persist for a limited time for recovery, audit, or abuse response.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Reports And Contact">
            <p className="policy-body">
              To request removal, report impersonation, copyright issues, illegal content, or privacy concerns, contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </PolicySection>
        </div>
      </div>
    </div>
  );
}
