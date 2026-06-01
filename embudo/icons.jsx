// Icon set (lucide-style strokes). Each returns inline SVG.
const _ip = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };

function Icon({ name, ...rest }) {
  const P = (children) => <svg viewBox="0 0 24 24" {..._ip} {...rest}>{children}</svg>;
  switch (name) {
    case "ad": // megaphone
      return P(<>
        <path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1Z" />
        <path d="M15 7a4 4 0 0 1 0 10" />
      </>);
    case "instagram":
      return P(<>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
      </>);
    case "youtube":
      return P(<>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
        <path d="M10.5 9.3v5.4l4.5-2.7Z" fill="currentColor" stroke="none" />
      </>);
    case "test": // clipboard check
      return P(<>
        <rect x="5" y="4" width="14" height="17" rx="2.5" />
        <path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4" />
        <path d="M9 13.2l2 2 4-4.2" />
      </>);
    case "form": // funnel / filter
      return P(<>
        <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z" />
      </>);
    case "landing-video":
      return P(<>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M10.2 8.2v4.6l4-2.3Z" fill="currentColor" stroke="none" />
        <path d="M8 20h8" />
      </>);
    case "landing-doc":
      return P(<>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8.5 8h7M8.5 11h7M8.5 13.6h4" />
        <path d="M8 20h8" />
      </>);
    case "email":
      return P(<>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M4 7l8 5.5L20 7" />
      </>);
    case "session": // calendar with play / video
      return P(<>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        <path d="M10.3 13v3.2l2.8-1.6Z" fill="currentColor" stroke="none" />
      </>);
    case "session-paid": // calendar + coin
      return P(<>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
        <path d="M12 11.4v5.2M13.7 12.6c-.4-.5-1-.7-1.7-.7-1 0-1.7.5-1.7 1.2 0 1.7 3.4.9 3.4 2.6 0 .8-.8 1.3-1.7 1.3-.8 0-1.4-.3-1.8-.8" />
      </>);
    case "meeting": // handshake
      return P(<>
        <path d="M7 13l2.4 2.3a1.4 1.4 0 0 0 2 0l.3-.3.6.6a1.3 1.3 0 0 0 1.9 0 1.3 1.3 0 0 0 0-.2l1.6-1.7" />
        <path d="M3.5 8.5 6 6.5l3.2 1 3-1 5.3 3" />
        <path d="m12 13.5-1.8-1.7c-.5-.5-.4-1 .1-1.4l1.2-1" />
        <path d="M21 13.5 18.5 11M3 13.5 5.5 11" />
      </>);
    case "brand":
      return P(<>
        <path d="M3 20h18M6 20V9l6-5 6 5v11M10 20v-5h4v5" />
      </>);
    case "arrow":
      return P(<path d="M5 12h14M13 6l6 6-6 6" />);
    case "reset":
      return P(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /></>);
    case "lanes":
      return P(<><path d="M3 6h18M3 12h18M3 18h18" /></>);
    case "tag":
      return P(<><path d="M4 8v4l8 8 8-8-8-8H8a4 4 0 0 0-4 4Z" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" /></>);
    case "trash":
      return P(<><path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M10 11v6M14 11v6" /></>);
    case "link":
      return P(<><path d="M9.5 14.5l5-5M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2" /></>);
    case "drop":
      return P(<><path d="M12 3.5c3.2 3.6 5.5 6.4 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.9 2.3-5.7 5.5-9.3Z" /></>);
    case "drag":
      return P(<><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></>);
    default:
      return P(<circle cx="12" cy="12" r="8" />);
  }
}

window.Icon = Icon;
