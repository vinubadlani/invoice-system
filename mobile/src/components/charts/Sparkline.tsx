import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { chartSequential } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';
import { MonthlyPoint } from '../../utils/analytics';

interface SparklineProps {
  points: MonthlyPoint[];
  height?: number;
}

/** Minimal trend line with no axes/rules — a glance-level "is it going up" signal,
 * not a chart for reading exact values (that's what the full trend chart is for). */
export function Sparkline({ points, height = 48 }: SparklineProps) {
  const theme = useTheme();
  const seriesColor = theme.isDark ? chartSequential[400] : chartSequential[450];
  const data = points.map((p) => ({ value: p.value }));
  const maxValue = Math.max(...points.map((p) => p.value), 1);

  return (
    <View>
      <LineChart
        data={data}
        height={height}
        color={seriesColor}
        thickness={2}
        curved
        hideDataPoints
        hideRules
        hideYAxisText
        yAxisThickness={0}
        xAxisThickness={0}
        maxValue={maxValue * 1.2}
        initialSpacing={0}
        endSpacing={0}
        disableScroll
        areaChart
        startFillColor={seriesColor}
        endFillColor={seriesColor}
        startOpacity={0.15}
        endOpacity={0}
      />
    </View>
  );
}
