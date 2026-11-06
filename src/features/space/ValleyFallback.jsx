// The canvas-free quality tier keeps a decorative night valley and the same DOM navigation.
export default function ValleyFallback() {
  return (
    <svg
      className="valley-fallback"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="valley-fallback-night" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#071320" />
          <stop offset=".35" stopColor="#293c4c" />
          <stop offset=".67" stopColor="#161c26" />
          <stop offset="1" stopColor="#11131e" />
        </linearGradient>
      </defs>
      <path fill="url(#valley-fallback-night)" d="M0 0h1440v900H0z" />
      <circle cx="1110" cy="130" r="14" fill="#cee3e9" opacity=".66" />
      <path
        fill="#172631"
        d="M0 330l102-91 58 38 115-103 106 88 67-29 116 88 118-51 90 50 96-82 71 34 116-119 117 98 68-37 200 104v572H0z"
      />
      <path
        fill="#101c26"
        d="M0 330l123-62 105 29 111-55 125 97 153 29 78-25 116 16 128-46 144-65 83 58 129-18 145 42v570H0z"
      />
      <path
        fill="#253440"
        d="M484 375v-31h12v31h15v-45h18v45h17v-26h13v26zm379 4v-29h15v29h11v-46h16v46h14v-23h12v23z"
      />
      <g transform="translate(840 524)" opacity=".55">
        <ellipse rx="269" ry="111" fill="none" stroke="#6dbbc0" strokeWidth="2" />
        <ellipse rx="29" ry="12" fill="#345a67" stroke="#9ce9df" />
        <ellipse cy="-111" rx="28" ry="11" fill="#86675e" />
        <ellipse cx="269" rx="28" ry="11" fill="#397676" />
        <ellipse cy="111" rx="28" ry="11" fill="#695a94" />
        <ellipse cx="-269" rx="28" ry="11" fill="#82647e" />
      </g>
    </svg>
  );
}
