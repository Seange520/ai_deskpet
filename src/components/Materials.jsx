import { useState } from 'react';
import {
  Cpu,
  Monitor,
  Mic,
  Cable,
  Check,
  ShoppingBag,
  Cog,
  Battery,
  Car,
  CircuitBoard,
  Gauge,
  Circle,
  Settings,
} from 'lucide-react';
import { getHardwareRoute, getRoutePrice } from '../data/hardwareRoutes';
import RouteSelect from './RouteSelect';
import Button from './Button';

const icons = {
  cpu: Cpu,
  screen: Monitor,
  microphone: Mic,
  cable: Cable,
  servo: Cog,
  power: Battery,
  chassis: Car,
  driver: CircuitBoard,
  imu: Gauge,
  shell: Circle,
  motors: Settings,
};

export default function Materials({
  routeId = 'classic',
  onRouteChange,
  checked,
  onCheck,
  onComplete,
  shop = false,
  kitAdded,
  onAdd,
}) {
  const route = getHardwareRoute(routeId),
    catalog = route.components,
    kitPrice = getRoutePrice(route);
  const [showKit, setShowKit] = useState(false);
  return (
    <>
      <ShoppingBag className="text-neon" size={30} />
      <div className="eyebrow">{shop ? '把小伙伴带到真实世界' : '第一站 · 认识你的新朋友'}</div>
      <h2 id="modal-title">{shop ? '新手实体套件' : '认识你的创客工具箱'}</h2>
      <p>
        {shop
          ? '先收好这份愿望清单。学会之后，再决定要不要动手。'
          : '不用急着买。点一点卡片，认识每个部件，就能继续学习。'}
      </p>
      <RouteSelect routeId={routeId} onChange={onRouteChange} label="物料路线" />
      <p className="route-context">
        当前路线：{route.name} · {route.difficulty}
      </p>
      <div className="materials-grid">
        {catalog.map((item, i) => {
          const Icon = icons[item.visual] || Cpu;
          return (
            <div
              className={`material-card ${checked.includes(i) ? 'is-known' : ''}`}
              key={item.name}
            >
              <div className={`material-visual material-${i}`} aria-hidden="true">
                <Icon size={42} strokeWidth={1.3} />
                <span>{item.tag}</span>
              </div>
              <div className="material-copy">
                <div className="material-title">
                  <h3>
                    {item.name}
                    {item.quantity > 1 && (
                      <small className="material-quantity"> × {item.quantity}</small>
                    )}
                  </h3>
                  <span>
                    ¥{item.price}
                    <small>示例单价{item.quantity > 1 ? ` · × ${item.quantity}` : ''}</small>
                  </span>
                </div>
                <p>{item.description}</p>
                {!shop && (
                  <label className="material-check">
                    <input
                      type="checkbox"
                      checked={checked.includes(i)}
                      onChange={() => onCheck(i)}
                    />
                    <span>{checked.includes(i) ? '认识啦' : '我已认识这个部件'}</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="kit-summary">
        <div>
          <b>
            {route.name} · {catalog.length} 类物料
          </b>
          <span>示例合计 ¥{kitPrice} · 无需购买也能学完</span>
        </div>
        <Button className="btn" onClick={() => setShowKit(!showKit)} aria-expanded={showKit}>
          一键加入新手套装
        </Button>
      </div>
      {showKit && (
        <div className="kit-popover">
          <b>把第一份创作计划收好？</b>
          <p>示例套装包含以上物料。实际型号、外壳和音频输出方案待确定；当前不收款、不下单。</p>
          <Button
            className="btn primary"
            onClick={() => {
              onAdd();
              setShowKit(false);
            }}
          >
            {kitAdded ? '已在我的套装中' : '确认加入我的套装'}
          </Button>
        </div>
      )}
      <p className="commerce-note">
        产品演示 · 所有价格仅用于界面展示，不构成报价。真实接线请核对具体模块的电压与数据手册。
      </p>
      {!shop && (
        <Button
          className="btn primary full"
          disabled={checked.length !== catalog.length}
          onClick={onComplete}
        >
          <Check size={17} />
          我已认识全部物料 · +100 XP
        </Button>
      )}
    </>
  );
}
