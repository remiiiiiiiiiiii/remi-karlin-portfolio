export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-left">
        Remi Karlin
        <div style={{ fontWeight: 300, fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
          © 2025
        </div>
      </div>
      <div className="footer-center" style={{ flexDirection: "column", gap: 8 }}>
        <a
          className="footer-link"
          href="mailto:remikarlin@gmail.com"
          style={{
            fontWeight: 300,
            fontSize: 11,
            color: "rgba(255,255,255,0.7)",
            textDecoration: "underline",
            textDecorationColor: "#620c0a",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          remikarlin@gmail.com
        </a>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <a className="footer-link" href="https://instagram.com/karlinremi" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a className="footer-link" href="https://linkedin.com/in/remi-karlin" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>
      </div>
      <div className="footer-right">
        Lumix S5II · Lumix 20–60mm f/3.5–5.6
        <br />
        Edited in DaVinci Resolve
      </div>
    </footer>
  );
}
