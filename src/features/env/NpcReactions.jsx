import { useState } from 'react';
import { useEnv } from './envStore';
const names = { vendor: '夜宵摊老板', hefi: '赫菲', inspector: '巡线工' };
export const NPC_COPY = {
  vendor: [
    '[COPY-PENDING] 你蹲那儿看半天，我这儿夜宵都凉了。',
    '[COPY-PENDING] 今晚这条街倒是安静。',
    '[COPY-PENDING] 我把汤再热一遍。',
  ],
  hefi: [
    '[COPY-PENDING] 那盏灯，第七年了。',
    '[COPY-PENDING] 这双手，沾了一点街上的灰。',
    '[COPY-PENDING] 炉火还在。',
  ],
  inspector: [
    '[COPY-PENDING] 我在这条街值过夜班。',
    '[COPY-PENDING] 鞋底又带回一层灰。',
    '[COPY-PENDING] 钟声刚刚响过。',
  ],
};
export default function NpcReactions() {
  const s = useEnv(),
    [line, setLine] = useState('');
  return (
    <section data-env-npcs aria-label="街坊对话">
      {Object.entries(names).map(([id, name]) => (
        <button
          key={id}
          data-env-npc={id}
          onClick={() => {
            if (!s.lastMeasurement) {
              setLine('[COPY-PENDING] ' + name + '点了点头。');
              return;
            }
            if (s.react(id)) {
              const i =
                s.lastMeasurement.category === 'phenomenon'
                  ? 0
                  : s.lastMeasurement.category === 'inspect'
                    ? 2
                    : 1;
              setLine(name + '：' + NPC_COPY[id][i]);
            } else setLine('[COPY-PENDING] ' + name + '继续忙自己的事。');
          }}
        >
          {name}
        </button>
      ))}
      <p aria-live="polite">{line}</p>
    </section>
  );
}
