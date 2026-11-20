import { Tag, Tooltip } from 'antd';
import { ESTADOS } from '../utils';

export default function EstadoTag({ estado }) {
  const meta = ESTADOS[estado] || { label: estado, color: 'default', hint: '' };
  return (
    <Tooltip title={meta.hint}>
      <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>{meta.label}</Tag>
    </Tooltip>
  );
}
