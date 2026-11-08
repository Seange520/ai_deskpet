import { useState } from 'react';
import { useEnv } from './envStore';
const names = { vendor: '夜宵摊老板', hefi: '赫菲', inspector: '巡线工' };
export const NPC_COPY = {
  vendor: [
    '灯一暗，我这锅汤就得回炉。你测，我等着。',
    '今晚这条街安静得不像话，连汤勺响都听得见。',
    '你要是能把这灯修好，明晚多给你留一碗。',
  ],
  hefi: [
    '那盏灯，第七年了。手上要有读数，再来跟我说。',
    '这双手沾了点街上的灰，灯也一样。',
    '炉火还在。断着电的线，别碰。',
  ],
  inspector: [
    '我在这条街值过夜班。灯暗的时候，脚比仪器先知道。',
    '鞋底又带回一层灰，这灰不对劲。',
    '钟声刚刚响过，灯却没跟上。',
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
              setLine(name + '：先测，我不多嘴。');
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
            } else setLine(name + '：这会儿忙着，回头再说。');
          }}
        >
          {name}
        </button>
      ))}
      <p aria-live="polite">{line}</p>
    </section>
  );
}