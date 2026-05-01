import React from 'react';
import { View, Text } from 'react-native';
import { FinanceStyles } from '../core/styles';

/**
 * 📊 FINANCE CARD
 * A high-contrast, editorial style component for financial data.
 * Adheres to the "Aesthetic Provocateur" rules: 0px radii, hard shadows, 
 * and violent typographic contrast.
 */
const FinanceCard = ({ data }) => {
  if (!data || data.type !== 'finance_quote') return null;

  const { symbol, name, price, changePercent, currency, high, low, volume } = data;
  const isPositive = (changePercent || 0) >= 0;

  return (
    <View style={FinanceStyles.card}>
      <Text style={FinanceStyles.ticker}>{symbol} · MARKET DATA</Text>
      <Text style={FinanceStyles.name} numberOfLines={1}>{name}</Text>
      
      <View style={FinanceStyles.priceContainer}>
        <Text style={FinanceStyles.price}>
          {price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={[
          FinanceStyles.change, 
          { backgroundColor: isPositive ? "#DFFF00" : "#FF3131" }
        ]}>
          <Text style={{ color: "#000", fontWeight: '900', fontSize: 12 }}>
            {isPositive ? '▲' : '▼'} {Math.abs(changePercent || 0).toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={FinanceStyles.metaContainer}>
        <View style={FinanceStyles.metaItem}>
          <Text style={FinanceStyles.metaLabel}>Day Range</Text>
          <Text style={FinanceStyles.metaValue}>{low?.toFixed(2)} — {high?.toFixed(2)}</Text>
        </View>
        <View style={FinanceStyles.metaItem}>
          <Text style={FinanceStyles.metaLabel}>Currency</Text>
          <Text style={FinanceStyles.metaValue}>{currency}</Text>
        </View>
        <View style={FinanceStyles.metaItem}>
          <Text style={FinanceStyles.metaLabel}>Volume</Text>
          <Text style={FinanceStyles.metaValue}>{(volume / 1000000).toFixed(2)}M</Text>
        </View>
      </View>
    </View>
  );
};

export default FinanceCard;
