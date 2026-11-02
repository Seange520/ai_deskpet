import { useState } from 'react';
import { Cpu, Monitor, Mic, Cable, Check, ShoppingBag } from 'lucide-react';
import Button from './Button';

// 产品演示价格，不宣称为实时市场报价。真实售卖前需要确定 BOM、库存和价格。
export const catalog = [
  {
    name: 'ESP32-S3 开发板',
    description: '桌宠的小脑袋。运行程序，连接 Wi-Fi，处理你的指令。',
    price: 49,
    icon: Cpu,
    tag: '负责思考',
  },
  {
    name: '兼容显示屏',
    description: '桌宠的表情窗口。把代码里的开心，变成看得见的笑脸。',
    price: 39,
    icon: Monitor,
    tag: '负责卖萌',
  },
  {
    name: 'I2S 数字麦克风',
    description: '桌宠的小耳朵。采集声音，后续课程再连接音频信号线。',
    price: 15,
    icon: Mic,
    tag: '负责倾听',
  },
  {
    name: '杜邦线与 USB 数据线',
    description: '连接彼此的小桥梁。USB 线需支持数据传输。',
    price: 16,
    icon: Cable,
    tag: '负责连接',
  },
];
export const kitPrice = catalog.reduce((sum, item) => sum + item.price, 0);

export default function Materials({ checked, onCheck, onComplete, shop = false, kitAdded, onAdd }) {
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
      <div className="materials-grid">
        {catalog.map((item, i) => (
          <div className={`material-card ${checked.includes(i) ? 'is-known' : ''}`} key={item.name}>
            <div className={`material-visual material-${i}`} aria-hidden="true">
              <item.icon size={42} strokeWidth={1.3} />
              <span>{item.tag}</span>
            </div>
            <div className="material-copy">
              <div className="material-title">
                <h3>{item.name}</h3>
                <span>
                  ¥{item.price}
                  <small>示例价</small>
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
        ))}
      </div>
      <div className="kit-summary">
        <div>
          <b>新手套装 · 4 件物料</b>
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
        <Button className="btn primary full" disabled={checked.length !== 4} onClick={onComplete}>
          <Check size={17} />
          我已认识全部物料 · +100 XP
        </Button>
      )}
    </>
  );
}
