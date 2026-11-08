export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="display" style={{ fontSize: "2rem" }}>T-Minus</p>
          <p className="note" style={{ maxWidth: "34ch" }}>A countdown to your train, built for Boston.</p>
        </div>
        <div className="note">
          <p className="label">Data</p>
          <p>Arrivals and alerts: <a href="https://www.mbta.com/developers/v3-api">MBTA V3 API</a>. Weather: <a href="https://www.weather.gov/documentation/services-web-api">National Weather Service</a>. Not affiliated with the MBTA.</p>
        </div>
        <div className="note">
          <p className="label">Credits</p>
          <p>Scenes and controls: <a href="https://threeui.com">ThreeUI</a> Community by Meng To, MIT license. Fonts: Instrument Serif, Fragment Mono, Onest (SIL OFL).</p>
        </div>
      </div>
    </footer>
  );
}
