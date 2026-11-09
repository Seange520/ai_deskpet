import { useState } from 'react';
import { SimFrame, useEvidence } from './MeterSim.jsx';
export const data = {
  id: 'mqtt-publish',
  title: 'MQTT · 发布一帧报文',
  instructions:
    '选择主题、负载与 QoS 后发布。Broker 只把报文路由给匹配的订阅者；topic 写错，订阅者永远收不到。',
  elements: ['topic', 'payload', 'qos'],
  checks: [
    { id: 'topic', type: 'choice', task: 'topic', expected: 'forge/street/lamp1/state' },
    { id: 'payload', type: 'choice', task: 'payload', expected: '1' },
    { id: 'qos', type: 'numeric', task: 'qos', expected: 1, tolerance: 0 },
  ],
  evidenceTypes: ['choice', 'numeric'],
};
export default function MqttPublishSim({ onComplete } = {}) {
  const [topic, setTopic] = useState('forge/street/lamp1/state');
  const [payload, setPayload] = useState('0');
  const [qos, setQos] = useState(0);
  const [log, setLog] = useState('等待发布。');
  const { evidence, record } = useEvidence(data, onComplete);
  function publish() {
    const result = record({ topic, payload, qos });
    setLog(
      `已发布 → ${topic} · payload=${payload} · qos=${qos}` +
        (result.passed ? ' · 订阅者已收到，证据通过' : ' · 有一条字段与订阅者期望不一致'),
    );
  }
  return (
    <SimFrame data={data} evidence={evidence}>
      <label>
        发布主题
        <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="发布主题">
          <option value="forge/street/lamp1/state">forge/street/lamp1/state</option>
          <option value="forge/street/lamp2/state">forge/street/lamp2/state</option>
          <option value="forge/street/lamp1/cmd">forge/street/lamp1/cmd</option>
        </select>
      </label>
      <label>
        负载 payload
        <select value={payload} onChange={(e) => setPayload(e.target.value)} aria-label="负载">
          <option value="0">0</option>
          <option value="1">1</option>
        </select>
      </label>
      <fieldset>
        <legend>QoS</legend>
        {[0, 1, 2].map((v) => (
          <label key={v}>
            <input
              type="radio"
              name="mqtt-qos"
              checked={qos === v}
              onChange={() => setQos(v)}
            />
            {v}
          </label>
        ))}
      </fieldset>
      <button onClick={publish}>发布报文</button>
      <output className="sim-reading" role="status">
        {log}
      </output>
    </SimFrame>
  );
}
