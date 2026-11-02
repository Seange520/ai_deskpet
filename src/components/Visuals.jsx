import { motion, useReducedMotion } from 'framer-motion';

// 所有硬件图形由 SVG 路径绘制，不依赖图片或第三方素材服务。
export function Board({ className = '' }) {
  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label="ESP32-S3 开发板示意图">
      <defs>
        <linearGradient id="pcb" x2="1" y2="1">
          <stop stopColor="#24564d" />
          <stop offset="1" stopColor="#122b2b" />
        </linearGradient>
        <linearGradient id="metal" x2="1" y2="1">
          <stop stopColor="#d2d5da" />
          <stop offset=".5" stopColor="#788891" />
          <stop offset="1" stopColor="#bcc7ca" />
        </linearGradient>
      </defs>
      <rect
        x="30"
        y="10"
        width="180"
        height="300"
        rx="17"
        fill="url(#pcb)"
        stroke="#438c78"
        strokeWidth="2"
      />
      {[45, 195].flatMap((x) =>
        [27, 291].map((y) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="6"
            fill="#101519"
            stroke="#899c7e"
            strokeWidth="3"
          />
        )),
      )}
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i}>
          <rect x="19" y={49 + i * 18} width="23" height="8" rx="2" fill="#d5bb78" />
          <rect x="198" y={49 + i * 18} width="23" height="8" rx="2" fill="#d5bb78" />
          <path
            d={`M45 ${53 + i * 18} H${65 + (i % 3) * 8} V${90 + i * 7} H95 M195 ${53 + i * 18} H${175 - (i % 3) * 8} V${90 + i * 7} H145`}
            fill="none"
            stroke="#458370"
            opacity=".5"
          />
        </g>
      ))}
      <rect x="68" y="54" width="104" height="139" rx="5" fill="url(#metal)" stroke="#ebf0ef" />
      <path d="M80 73h16v12h15V73h16v12h15V73h17" fill="none" stroke="#58686d" strokeWidth="3" />
      <text
        x="120"
        y="123"
        fill="#29383b"
        textAnchor="middle"
        fontSize="14"
        fontFamily="monospace"
        fontWeight="bold"
      >
        ESP32-S3
      </text>
      <text x="120" y="144" textAnchor="middle" fill="#415153" fontSize="9">
        WIRELESS • AI READY
      </text>
      <rect x="93" y="214" width="54" height="29" rx="3" fill="#0d1419" stroke="#667c79" />
      <circle cx="159" cy="226" r="5" fill="#00ffd1" />
      <rect x="94" y="276" width="52" height="38" rx="6" fill="url(#metal)" stroke="#bbc5c7" />
      <rect x="102" y="295" width="36" height="11" rx="5" fill="#142124" />
      <text x="120" y="263" textAnchor="middle" fill="#9dc8b7" fontFamily="monospace" fontSize="9">
        SPARKMATE / DEVKIT
      </text>
    </svg>
  );
}

export function Pet({ color = '#00FFD1', speed = 2400, expression = 'happy', className = '' }) {
  const reduced = useReducedMotion();
  return (
    <div className={`pet-device ${className}`} style={{ '--pet-color': color }}>
      <div className="pet-top">
        <span />
        <i />
      </div>
      <div className="pet-display">
        <div className="screen-scan" />
        <svg
          viewBox="0 0 240 160"
          role="img"
          aria-label={`桌宠表情：${expression === 'happy' ? '开心' : expression === 'curious' ? '好奇' : '困困'}`}
        >
          <motion.g
            style={{ transformOrigin: '120px 75px' }}
            animate={reduced ? {} : { scaleY: [1, 1, 0.08, 1, 1] }}
            transition={{
              duration: speed / 1000,
              repeat: Infinity,
              times: [0, 0.78, 0.83, 0.88, 1],
            }}
          >
            {expression === 'sleepy' ? (
              <g stroke={color} strokeWidth="10" strokeLinecap="round">
                <path d="M57 80h35M148 80h35" />
              </g>
            ) : (
              <g fill={color}>
                <rect
                  x="58"
                  y={expression === 'curious' ? 54 : 57}
                  width="32"
                  height={expression === 'curious' ? 47 : 37}
                  rx="15"
                />
                <rect x="150" y="57" width="32" height="37" rx="15" />
              </g>
            )}
          </motion.g>
          <path
            d={expression === 'sleepy' ? 'M112 119h16' : 'M108 112q12 17 24 0'}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <g fill={color} opacity=".18">
            <ellipse cx="48" cy="106" rx="13" ry="6" />
            <ellipse cx="192" cy="106" rx="13" ry="6" />
          </g>
        </svg>
        <span className="screen-label">
          {expression === 'sleepy' ? 'RECHARGING MY DREAMS' : 'HELLO, HUMAN.'}
        </span>
      </div>
      <div className="pet-bottom">
        <span>sparkmate</span>
        <div className="speaker">
          •••••
          <br />
          •••••
        </div>
        <b />
      </div>
      <div className="pet-foot left" />
      <div className="pet-foot right" />
    </div>
  );
}

export function Microphone() {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label="数字麦克风模块示意图">
      <rect x="16" y="15" width="128" height="88" rx="12" fill="#203d46" stroke="#5b98a1" />
      <circle cx="67" cy="57" r="25" fill="#b3bfc5" />
      <circle cx="67" cy="57" r="9" fill="#17232b" />
      <rect x="108" y="37" width="17" height="39" rx="3" fill="#11151d" />
      {[35, 53, 71, 89].map((x) => (
        <rect key={x} x={x} y="98" width="8" height="18" rx="2" fill="#d4b880" />
      ))}
      <text x="98" y="91" fontSize="8" fill="#a6d2d7">
        I2S MIC
      </text>
    </svg>
  );
}
