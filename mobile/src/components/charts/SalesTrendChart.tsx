import React from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { MonthlyPoint } from '../../utils/analytics';
import { formatCurrencyCompact } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';
import { chartSequential } from '../../theme/colors';

interface SalesTrendChartProps {
  points: MonthlyPoint[];
}

/** Single series -> no legend needed (title names it). One axis, no dual-scale. */
export function SalesTrendChart({ points }: SalesTrendChartProps) {
  const theme = useTheme();
  const seriesColor = theme.isDark ? chartSequential[400] : chartSequential[450];

  const data = points.map((p) => ({
    value: p.value,
    label: p.label,
    dataPointText: '',
  }));

  const maxValue = Math.max(...points.map((p) => p.value), 1);

  return (
    <View>
      <LineChart
        data={data}
        height={160}
        color={seriesColor}
        thickness={2}
        startFillColor={seriesColor}
        endFillColor={seriesColor}
        startOpacity={0.18}
        endOpacity={0.01}
        areaChart
        curved
        hideDataPoints={false}
        dataPointsColor={seriesColor}
        dataPointsRadius={3}
        yAxisTextStyle={{ color: theme.colors.mutedForeground, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: theme.colors.mutedForeground, fontSize: 10 }}
        rulesColor={theme.colors.border}
        rulesType="solid"
        yAxisColor={theme.colors.border}
        xAxisColor={theme.colors.border}
        noOfSections={3}
        maxValue={maxValue * 1.15}
        formatYLabel={(v: string) => formatCurrencyCompact(Number(v))}
        initialSpacing={12}
        endSpacing={12}
        adjustToWidth
      />
    </View>
  );
}
