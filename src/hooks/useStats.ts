import { useMemo } from 'react';
import { useBlocks } from './useBlocks';

interface DayStats {
  date: string;
  count: number;
  validCount: number;
}

interface Stats {
  currentStreak: number;
  longestStreak: number;
  todayCount: number;
  todayValidCount: number;
  weekCount: number;
  weekValidCount: number;
  monthCount: number;
  monthValidCount: number;
  totalBlocks: number;
  totalValidBlocks: number;
  completionRate: number;
  dailyAverage: number;
  weeklyTrend: DayStats[];
  bestDay: { date: string; count: number } | null;
}

const getDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return getDateString(date);
};

const getStartOfWeek = (): Date => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.setDate(diff));
};

const getStartOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export const useStats = (): Stats => {
  const { blocks } = useBlocks();

  return useMemo(() => {
    const today = getDateString(new Date());
    const weekStart = getDateString(getStartOfWeek());
    const monthStart = getDateString(getStartOfMonth());

    // Group blocks by date
    const blocksByDate = new Map<string, { total: number; valid: number }>();
    blocks.forEach(block => {
      const existing = blocksByDate.get(block.date) || { total: 0, valid: 0 };
      existing.total++;
      if (block.isValid && block.completedAt) {
        existing.valid++;
      }
      blocksByDate.set(block.date, existing);
    });

    // Today stats
    const todayStats = blocksByDate.get(today) || { total: 0, valid: 0 };
    const todayCount = todayStats.total;
    const todayValidCount = todayStats.valid;

    // Week stats
    let weekCount = 0;
    let weekValidCount = 0;
    blocksByDate.forEach((stats, date) => {
      if (date >= weekStart) {
        weekCount += stats.total;
        weekValidCount += stats.valid;
      }
    });

    // Month stats
    let monthCount = 0;
    let monthValidCount = 0;
    blocksByDate.forEach((stats, date) => {
      if (date >= monthStart) {
        monthCount += stats.total;
        monthValidCount += stats.valid;
      }
    });

    // Total stats
    const totalBlocks = blocks.length;
    const totalValidBlocks = blocks.filter(b => b.isValid && b.completedAt).length;
    const completionRate = totalBlocks > 0 ? totalValidBlocks / totalBlocks : 0;

    // Calculate streaks (consecutive days with at least 1 valid block)
    const sortedDates = Array.from(blocksByDate.entries())
      .filter(([_, stats]) => stats.valid > 0)
      .map(([date]) => date)
      .sort()
      .reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate = today;

    for (const date of sortedDates) {
      if (date === expectedDate) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        // Move to previous day
        const d = new Date(expectedDate);
        d.setDate(d.getDate() - 1);
        expectedDate = getDateString(d);
      } else if (date < expectedDate) {
        // Streak broken, but check if this starts a new streak
        if (currentStreak === 0) {
          currentStreak = tempStreak;
        }
        // Reset for potential new streak
        tempStreak = 1;
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        expectedDate = getDateString(d);
      }
    }
    if (currentStreak === 0) {
      currentStreak = tempStreak;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Weekly trend (last 7 days)
    const weeklyTrend: DayStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = getDaysAgo(i);
      const stats = blocksByDate.get(date) || { total: 0, valid: 0 };
      weeklyTrend.push({
        date,
        count: stats.total,
        validCount: stats.valid,
      });
    }

    // Daily average (based on days with blocks)
    const daysWithBlocks = blocksByDate.size;
    const dailyAverage = daysWithBlocks > 0 ? totalValidBlocks / daysWithBlocks : 0;

    // Best day
    let bestDay: { date: string; count: number } | null = null;
    blocksByDate.forEach((stats, date) => {
      if (!bestDay || stats.valid > bestDay.count) {
        bestDay = { date, count: stats.valid };
      }
    });

    return {
      currentStreak,
      longestStreak,
      todayCount,
      todayValidCount,
      weekCount,
      weekValidCount,
      monthCount,
      monthValidCount,
      totalBlocks,
      totalValidBlocks,
      completionRate,
      dailyAverage,
      weeklyTrend,
      bestDay,
    };
  }, [blocks]);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
};
