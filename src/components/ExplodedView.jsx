import { getHardwareRoute } from '../data/hardwareRoutes';
import { Board, Pet, Microphone } from './Visuals';

function ModuleDrawing({ type, label }) {
  if (type === 'board') return <Board />;
  if (type === 'screen') return <Pet />;
  if (type === 'microphone') return <Microphone />;
  return (
    <svg viewBox="0 0 220 150" role="img" aria-label={`${label}示意图`}>
      {type === 'servoBank' ? (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`translate(${12 + (i % 4) * 51},${12 + Math.floor(i / 4) * 63})`}>
              <rect width="40" height="44" rx="6" fill="#59798d" stroke="#a1b6bf" />
              <circle cx="20" cy="14" r="8" fill="#d8d7c3" />
              <path d="M5 14h30" stroke="#f2e6c8" strokeWidth="4" />
              <text x="20" y="37" textAnchor="middle" fontSize="8" fill="#d4e5df">
                SG90
              </text>
            </g>
          ))}
        </>
      ) : type === 'dogFrame' ? (
        <>
          <path d="M30 55h160v50H30z" fill="#b2bfad" stroke="#e0d9c4" strokeWidth="3" />
          {[42, 82, 138, 178].map((x) => (
            <g key={x}>
              <circle cx={x} cy="70" r="7" fill="#52665b" />
              <path d={`M${x} 105v20`} stroke="#d5d4ba" strokeWidth="10" />
            </g>
          ))}
        </>
      ) : type === 'tracks' ? (
        <>
          <rect
            x="7"
            y="25"
            width="49"
            height="103"
            rx="20"
            fill="#3c534b"
            stroke="#9daf9e"
            strokeWidth="3"
          />
          <rect
            x="164"
            y="25"
            width="49"
            height="103"
            rx="20"
            fill="#3c534b"
            stroke="#9daf9e"
            strokeWidth="3"
          />
          <rect x="48" y="40" width="124" height="70" rx="10" fill="#b6c3b1" />
          {[42, 62, 82, 102].map((y) => (
            <path key={y} d={`M12 ${y}h38m120 0h38`} stroke="#9daf9e" strokeWidth="4" />
          ))}
          <circle cx="80" cy="78" r="14" fill="#b7a175" />
          <circle cx="140" cy="78" r="14" fill="#b7a175" />
        </>
      ) : type === 'shell' ? (
        <>
          <circle cx="110" cy="75" r="68" fill="#b7d5c31a" stroke="#c8ded1" strokeWidth="2" />
          <ellipse
            cx="110"
            cy="75"
            rx="32"
            ry="68"
            fill="none"
            stroke="#aacdb888"
            strokeWidth="2"
          />
          <ellipse
            cx="110"
            cy="75"
            rx="68"
            ry="23"
            fill="none"
            stroke="#aacdb888"
            strokeWidth="2"
          />
        </>
      ) : type === 'actuator' ? (
        <>
          <rect x="40" y="45" width="140" height="58" rx="12" fill="#9cae9e" />
          <circle cx="63" cy="108" r="22" fill="#c4ae83" stroke="#e6d7b4" strokeWidth="3" />
          <circle cx="157" cy="108" r="22" fill="#c4ae83" stroke="#e6d7b4" strokeWidth="3" />
          <path d="M85 70h50" stroke="#485c51" strokeWidth="8" />
        </>
      ) : (
        <>
          <rect
            x="30"
            y="22"
            width="160"
            height="105"
            rx="12"
            fill={type === 'imu' ? '#4f7969' : '#4f6576'}
            stroke="#acc8b9"
            strokeWidth="2"
          />
          <rect x="82" y="49" width="56" height="44" rx="5" fill="#202f34" stroke="#d0d4c0" />
          {[48, 68, 88, 108, 128, 148, 168].map((x) => (
            <rect key={x} x={x} y="118" width="7" height="22" rx="2" fill="#d4be8a" />
          ))}
          <text x="110" y="76" textAnchor="middle" fill="#dbe8dd" fontSize="12">
            {type === 'imu' ? 'IMU' : 'DRIVER'}
          </text>
        </>
      )}
    </svg>
  );
}

export default function ExplodedView({ routeId, exploded }) {
  const route = getHardwareRoute(routeId);
  return (
    <>
      <div className={`exploded-scene ${exploded ? 'is-exploded' : ''}`} data-route={route.id}>
        <div className="scene-grid" />
        <div className="assembly">
          {route.explodedView.parts.map((p) => (
            <div
              key={p.id}
              className={`assembly-${p.id}`}
              data-part={p.id}
              style={{
                width: p.width,
                left: p.x,
                top: p.y,
                transform: `translateZ(${exploded ? p.expandedZ : p.z}px) translateX(${exploded ? p.dx : 0}px) translateY(${exploded ? p.dy : 0}px)`,
              }}
            >
              <ModuleDrawing type={p.type} label={p.label} />
            </div>
          ))}
        </div>
        {route.id === 'classic' && (
          <>
            <div className="part-label part-a">
              01 <span>显示屏 / 表情窗口</span>
            </div>
            <div className="part-label part-b">
              02 <span>ESP32-S3 / 大脑</span>
            </div>
            <div className="part-label part-c">
              03 <span>I2S 麦克风 / 耳朵</span>
            </div>
          </>
        )}
      </div>
      {route.id !== 'classic' && (
        <ul className="route-parts-legend" aria-label="爆炸图零件清单">
          {route.explodedView.parts.map((p, i) => (
            <li key={p.id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {p.label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
