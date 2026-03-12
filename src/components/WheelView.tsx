import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Text as SvgText, G } from 'react-native-svg';
import { FocusWheelSpoke } from '../types';

// Rainbow pastels going clockwise from 1 o'clock
export const SECTOR_COLORS = [
  '#FFB3C6', // 1  rose
  '#FFCBA4', // 2  peach
  '#FFE88A', // 3  gold
  '#B8F0B8', // 4  mint
  '#A0D8EF', // 5  sky
  '#B0B0F5', // 6  periwinkle
  '#D4A0F5', // 7  lavender
  '#F0A0D4', // 8  mauve
  '#F5A8B8', // 9  pink
  '#F5C8A0', // 10 apricot
  '#F0E890', // 11 cream
  '#A8E8C8', // 12 sage
];

const EMPTY_OPACITY = 0.2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Spoke i is CENTERED at its clock position: label "1" at 1:00, "12" at 12:00 (top)
// Each section spans ±15° around its clock position.
// startAngle = -75 + i*30  →  midAngle = -60 + i*30  →  endAngle = -45 + i*30
function sectorPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  i: number,
  gap = 1.5,
): string {
  const start = -75 + i * 30 + gap;
  const end = -75 + i * 30 + 30 - gap;
  const o1 = polarToCartesian(cx, cy, outerR, start);
  const o2 = polarToCartesian(cx, cy, outerR, end);
  const n1 = polarToCartesian(cx, cy, innerR, end);
  const n2 = polarToCartesian(cx, cy, innerR, start);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${o2.x} ${o2.y}`,
    `L ${n1.x} ${n1.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${n2.x} ${n2.y}`,
    'Z',
  ].join(' ');
}

type Props = {
  spokes: FocusWheelSpoke[];
  centerStatement: string;
  activeIndex?: number | null;
  onSpokePress?: (index: number) => void;
  size?: number;
};

export default function WheelView({
  spokes,
  centerStatement,
  activeIndex,
  onSpokePress,
  size = 280,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 5;
  const innerR = Math.round(outerR * 0.37);
  const innerDiameter = (innerR - 3) * 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {spokes.map((spoke, i) => {
          const filled = spoke.text.trim().length > 0;
          const active = activeIndex === i;
          const midAngle = -75 + i * 30 + 15;
          const labelPos = polarToCartesian(cx, cy, outerR * 0.73, midAngle);
          const path = sectorPath(cx, cy, outerR, innerR, i);

          return (
            <G key={i}>
              {/* Sector fill */}
              <Path
                d={path}
                fill={SECTOR_COLORS[i]}
                opacity={filled ? 1 : EMPTY_OPACITY}
                stroke={active ? '#fff' : 'transparent'}
                strokeWidth={active ? 3 : 0}
              />
              {/* Transparent hit-target on top for reliable touch */}
              <Path
                d={path}
                fill="transparent"
                onPress={() => onSpokePress?.(i)}
              />
              {/* Section number */}
              <SvgText
                x={labelPos.x}
                y={labelPos.y + 4}
                textAnchor="middle"
                fontSize={14}
                fontWeight="bold"
                fill={filled ? '#4A3060' : '#C4B0D8'}
              >
                {i + 1}
              </SvgText>
            </G>
          );
        })}

        {/* Center circle */}
        <Circle cx={cx} cy={cy} r={innerR - 2} fill="#FFFCFE" />
      </Svg>

      {/* Center text overlay — absolute over SVG */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.centerOverlay,
          { width: size, height: size },
        ]}
        pointerEvents="none"
      >
        <View style={{ width: innerDiameter - 10, alignItems: 'center' }}>
          {centerStatement.trim() ? (
            <Text numberOfLines={4} style={styles.centerText}>
              {centerStatement}
            </Text>
          ) : (
            <Text style={styles.centerPlaceholder}>✦</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: 11,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 13,
  },
  centerPlaceholder: {
    fontSize: 22,
    color: '#D4B8E8',
  },
});
