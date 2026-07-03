import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { useExpenses } from '@/contexts/ExpensesContext';
import { AddCategoryModal } from '@/components/AddCategoryModal';
import type { AppTheme } from '@/constants/theme';
import type { CategoryIcon } from '@/types/category';
import type { Expense } from '@/types/expense';

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { format } = useCurrency();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const { getCategoryById, updateCategory } = useCategories();
  const { expenses } = useExpenses();

  const category = getCategoryById(id || '');

  // Get expenses for this category
  const categoryExpenses = useMemo(() => {
    if (!category) return [];
    return expenses.filter(
      e => e.category === category.name || e.categoryId === category.id
    );
  }, [expenses, category]);

  // Calculate stats
  const stats = useMemo(() => {
    if (categoryExpenses.length === 0) {
      return {
        total: 0,
        thisMonth: 0,
        lastMonth: 0,
        transactionCount: categoryExpenses.length,
        avgTransaction: 0,
        topMerchants: [] as { name: string; count: number; total: number }[],
      };
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthExpenses = categoryExpenses.filter(e => e.date >= thisMonthStart);
    const lastMonthExpenses = categoryExpenses.filter(
      e => e.date >= lastMonthStart && e.date <= lastMonthEnd
    );

    const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
    const thisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const lastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Top merchants
    const merchantMap = new Map<string, { count: number; total: number }>();
    for (const expense of categoryExpenses) {
      const merchantName = expense.merchant || expense.title;
      const existing = merchantMap.get(merchantName) || { count: 0, total: 0 };
      merchantMap.set(merchantName, {
        count: existing.count + 1,
        total: existing.total + expense.amount,
      });
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total,
      thisMonth,
      lastMonth,
      transactionCount: categoryExpenses.length,
      avgTransaction: Math.round(total / categoryExpenses.length),
      topMerchants,
    };
  }, [categoryExpenses]);

  // Monthly trend data
  const trendData = useMemo(() => {
    const months: { month: string; amount: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthExpenses = categoryExpenses.filter(
        e => e.date >= monthStart && e.date <= monthEnd
      );
      const amount = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        amount,
      });
    }

    return months;
  }, [categoryExpenses]);

  const handleEdit = useCallback(async (
    name: string,
    icon: CategoryIcon,
    color: string,
    monthlyBudget?: number
  ) => {
    if (!category) return;
    await updateCategory(category.id, { name, icon, color, monthlyBudget });
    setIsEditModalVisible(false);
  }, [category, updateCategory]);

  if (!category) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Category not found</Text>
        </View>
      </View>
    );
  }

  const trendPercentage = stats.lastMonth > 0
    ? Math.round(((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100)
    : 0;

  const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1);

  const renderTransaction = ({ item }: { item: Expense }) => (
    <View style={styles.transactionRow}>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.transactionDate}>
          {item.date.toLocaleDateString()} at {item.time}
        </Text>
      </View>
      <Text style={styles.transactionAmount}>{format(item.amount, { signed: true })}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ),
          headerRight: () => !category.isDefault ? (
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(true)}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : null,
        }}
      />
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + 44 }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={40}
              color={category.color}
            />
          </View>
          <Text style={styles.title}>{category.name}</Text>
          {category.monthlyBudget && (
            <Text style={styles.budgetText}>
              Budget: {format(category.monthlyBudget)}/month
            </Text>
          )}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryAmount}>{format(stats.thisMonth)}</Text>
            <Text style={styles.summaryLabel}>this month</Text>
          </View>
          {stats.lastMonth > 0 && (
            <View style={styles.summaryTrend}>
              <Ionicons
                name={trendPercentage > 0 ? 'trending-up' : 'trending-down'}
                size={18}
                color={trendPercentage > 0 ? theme.danger : theme.primary}
              />
              <Text
                style={[
                  styles.summaryTrendText,
                  { color: trendPercentage > 0 ? theme.danger : theme.primary },
                ]}
              >
                {Math.abs(trendPercentage)}% vs last month
              </Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.transactionCount}</Text>
            <Text style={styles.statLabel}>transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{format(stats.avgTransaction)}</Text>
            <Text style={styles.statLabel}>avg transaction</Text>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6-Month Trend</Text>
          <View style={styles.trendCard}>
            <View style={styles.trendChart}>
              {trendData.map((item, index) => (
                <View key={index} style={styles.trendBar}>
                  <View
                    style={[
                      styles.trendBarFill,
                      {
                        height: `${(item.amount / maxTrendAmount) * 100}%`,
                        backgroundColor: category.color,
                      },
                    ]}
                  />
                  <Text style={styles.trendLabel}>{item.month}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Merchants */}
        {stats.topMerchants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Merchants</Text>
            <View style={styles.merchantsCard}>
              {stats.topMerchants.map((merchant, index) => (
                <View key={index} style={styles.merchantRow}>
                  <View style={styles.merchantRank}>
                    <Text style={styles.merchantRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.merchantContent}>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {merchant.name}
                    </Text>
                    <Text style={styles.merchantCount}>
                      {merchant.count} transaction{merchant.count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.merchantTotal}>{format(merchant.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.transactionsCard}>
            {categoryExpenses.slice(0, 10).map((expense) => (
              <View key={expense.id}>
                {renderTransaction({ item: expense })}
              </View>
            ))}
            {categoryExpenses.length === 0 && (
              <Text style={styles.noTransactions}>No transactions yet</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleEdit}
        initialName={category.name}
        initialIcon={category.icon}
        initialColor={category.color}
        initialBudget={category.monthlyBudget ? category.monthlyBudget / 100 : undefined}
        isEditing
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      padding: 4,
    },
    editButton: {
      padding: 4,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    budgetText: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    summaryCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    summaryMain: {
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryAmount: {
      fontSize: 36,
      fontWeight: '700',
      color: theme.text,
    },
    summaryLabel: {
      fontSize: 15,
      color: theme.textSecondary,
    },
    summaryTrend: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryTrendText: {
      fontSize: 14,
      fontWeight: '500',
      marginLeft: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    statLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    trendCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    trendChart: {
      flexDirection: 'row',
      height: 100,
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    trendBar: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    trendBarFill: {
      width: '100%',
      borderRadius: 4,
      minHeight: 4,
    },
    trendLabel: {
      fontSize: 10,
      color: theme.textSecondary,
      marginTop: 8,
    },
    merchantsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    merchantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    merchantRank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    merchantRankText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    merchantContent: {
      flex: 1,
    },
    merchantName: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    merchantCount: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    merchantTotal: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    transactionsCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
    },
    transactionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    transactionContent: {
      flex: 1,
    },
    transactionTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
    transactionDate: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    transactionAmount: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    noTransactions: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });
}
