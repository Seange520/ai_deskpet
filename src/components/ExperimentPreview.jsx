export default function ExperimentPreview({ routeId, angle, direction, tilt }) {
  const ax = -9.81 * Math.sin((tilt * Math.PI) / 180),
    az = 9.81 * Math.cos((tilt * Math.PI) / 180);
  return (
    <div className={`experiment-preview experiment-${routeId}`}>
      {routeId === 'quadruped' ? (
        <>
          <svg viewBox="0 0 300 220" role="img" aria-label={`舵机关节角度 ${angle} 度`}>
            <rect x="90" y="40" width="120" height="65" rx="22" fill="#bdccbf" />
            <rect x="114" y="53" width="72" height="34" rx="12" fill="#2e4b42" />
            <path d="M130 65v9m38-9v9" stroke="#cce6cc" strokeWidth="6" strokeLinecap="round" />
            <path
              d="M185 104l15 47-15 35"
              stroke="#91a995"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
            />
            <g
              style={{
                transformOrigin: '110px 105px',
                transform: `rotate(${angle - 90}deg)`,
                transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
              }}
            >
              <path
                d="M110 105v48l-23 30"
                stroke="#d5bd8c"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="110" cy="105" r="14" fill="#527b6b" />
              <circle cx="110" cy="153" r="9" fill="#e5d7b7" />
            </g>
          </svg>
          <div className="experiment-readout">
            <span>SG90 · 关节 01 / 08</span>
            <b>{angle}°</b>
            <small>单关节预览，不运行步态</small>
          </div>
        </>
      ) : routeId === 'tracked' ? (
        <>
          <svg
            viewBox="0 0 300 220"
            role="img"
            aria-label={`L298N 电机预览：${direction === 'forward' ? '正转' : direction === 'reverse' ? '反转' : '停止'}`}
          >
            <rect
              x="50"
              y="75"
              width="200"
              height="80"
              rx="30"
              fill="#456256"
              stroke="#a1bda9"
              strokeWidth="3"
            />
            <rect x="70" y="40" width="160" height="65" rx="15" fill="#b6c7ba" />
            <rect x="110" y="50" width="80" height="42" rx="8" fill="#536d79" />
            <text x="150" y="76" textAnchor="middle" fill="#dae4d5" fontSize="12">
              L298N
            </text>
            {[90, 150, 210].map((x) => (
              <g
                key={x}
                className={`motor-wheel ${direction}`}
                style={{ transformOrigin: `${x}px 120px` }}
              >
                <circle cx={x} cy="120" r="24" fill="#b9a67b" />
                <path d={`M${x - 17} 120h34m-17-17v34`} stroke="#5d6c5c" strokeWidth="3" />
              </g>
            ))}
          </svg>
          <div className="experiment-readout">
            <span>单个 H 桥 · 方向逻辑</span>
            <b>
              {direction === 'forward' ? '正转 →' : direction === 'reverse' ? '← 反转' : '停止'}
            </b>
            <small>模拟轮转，不连接真实电机</small>
          </div>
        </>
      ) : (
        <>
          <svg viewBox="0 0 300 220" role="img" aria-label={`MPU6050 模拟俯仰 ${tilt} 度`}>
            <circle cx="150" cy="100" r="75" fill="#a7d8be0c" stroke="#a7cbb7" strokeWidth="2" />
            <path d="M60 100h180" stroke="#e5c48b" strokeDasharray="6 5" />
            <g
              style={{
                transformOrigin: '150px 100px',
                transform: `rotate(${-tilt}deg)`,
                transition: 'transform .4s cubic-bezier(.16,1,.3,1)',
              }}
            >
              <ellipse cx="150" cy="100" rx="75" ry="25" stroke="#a7cbb7" fill="none" />
              <rect x="120" y="77" width="60" height="46" rx="7" fill="#537a68" />
              <rect x="137" y="89" width="26" height="22" rx="3" fill="#d1d7bf" />
            </g>
          </svg>
          <div className="experiment-readout">
            <span>MPU6050 · 重力方向静态估计</span>
            <b>{tilt}°</b>
            <small>
              Ax {ax.toFixed(2)} / Az {az.toFixed(2)} m/s² · Gy 0.00 rad/s
            </small>
          </div>
        </>
      )}
    </div>
  );
}
