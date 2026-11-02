import { ArrowUpRight } from 'lucide-react';
import { hardwareRoutes } from '../data/hardwareRoutes';
import Button from './Button';

// SVG 仅来自本地受信配置，不接受用户输入或远程 HTML。
export function RouteArtwork({ route }) {
  return (
    <div
      className="route-artwork"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: route.hardwareImage }}
    />
  );
}
export default function RouteGallery({ routeId, onChoose }) {
  return (
    <section className="route-gallery" aria-labelledby="route-gallery-title">
      <div className="section-title">
        <h2 id="route-gallery-title">选择你的创造路线</h2>
        <span>同一份好奇，四种可能。</span>
      </div>
      <div className="route-grid">
        {hardwareRoutes.map((route) => (
          <section
            className={`panel route-card ${routeId === route.id ? 'is-selected' : ''}`}
            key={route.id}
            aria-label={`${route.name}路线卡片`}
          >
            <div className="route-card-meta">
              <span>{route.difficulty}</span>
              <span>{routeId === route.id ? '当前路线' : '可自由体验'}</span>
            </div>
            <RouteArtwork route={route} />
            <h3>{route.name}</h3>
            <p>{route.description}</p>
            <Button
              className="btn full"
              aria-pressed={routeId === route.id}
              onClick={() => onChoose(route.id, 'hardware')}
            >
              探索{route.name}
              <ArrowUpRight size={15} />
            </Button>
            <Button className="text-button" onClick={() => onChoose(route.id, 'materials')}>
              准备物料 · {route.name}
            </Button>
          </section>
        ))}
      </div>
    </section>
  );
}
