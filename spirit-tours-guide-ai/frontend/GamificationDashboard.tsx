/**
 * Gamification Dashboard Component
 * 
 * Features:
 * - Player profile with level and points
 * - Badge showcase with unlock animations
 * - Leaderboard (global, monthly, weekly)
 * - Progress bars for achievements
 * - Streak tracker with fire animation
 * - Rewards redemption
 * - Social sharing of achievements
 * - Challenge list and progress
 * 
 * Props:
 * - userId: Current user identifier
 * - userType: 'passenger' | 'guide'
 * - onRewardRedeem: Callback for reward redemption
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Trophy,
  Star,
  Award,
  TrendingUp,
  Users,
  Target,
  Zap,
  Gift,
  Share2,
  Crown,
  Medal,
  Flame,
  ChevronUp,
  Lock,
  Unlock,
  CheckCircle,
} from 'lucide-react';

interface Badge {
  badge_id: string;
  badge_name: string;
  badge_tier: string;
  badge_icon: string;
  earned_at: string;
}

interface PlayerProfile {
  userId: string;
  totalPoints: number;
  level: {
    current: number;
    name: string;
    perks: string[];
    pointsToNext: number;
  };
  streaks: {
    current: number;
    longest: number;
    lastActivity: string;
  };
  achievements: {
    toursCompleted: number;
    socialShares: number;
    reviewsWritten: number;
    referralsMade: number;
  };
  badges: Badge[];
  rank: number;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  points: number;
  level: number;
  badges: Badge[];
}

interface GamificationDashboardProps {
  userId: string;
  userType?: 'passenger' | 'guide';
  onRewardRedeem?: (reward: any) => void;
}

const GamificationDashboard: React.FC<GamificationDashboardProps> = ({
  userId,
  userType = 'passenger',
  onRewardRedeem,
}) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'monthly' | 'weekly'>('global');
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'badges' | 'leaderboard' | 'challenges'>('overview');
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState<Badge | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchLeaderboard();
  }, [userId, leaderboardType]);

  /**
   * Fetch player profile
   */
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/gamification/profile/${userId}`);
      setProfile(response.data.profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch leaderboard
   */
  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(`/api/gamification/leaderboard/${leaderboardType}`);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  /**
   * Share achievement on social media
   */
  const shareAchievement = async (badge: Badge) => {
    const shareUrl = `https://spirittours.com/achievement/${badge.badge_id}`;
    const shareText = `I just unlocked the "${badge.badge_name}" badge on Spirit Tours! ${badge.badge_icon}`;

    // Open share dialog
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Spirit Tours Achievement',
          text: shareText,
          url: shareUrl,
        });

        // Record share
        await axios.post('/api/gamification/share', {
          userId,
          badgeId: badge.badge_id,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert('Link copied to clipboard! Share it on your social media.');
    }
  };

  /**
   * Get tier color
   */
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'text-purple-600 bg-purple-100';
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'bronze': return 'text-orange-600 bg-orange-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  /**
   * Calculate level progress percentage
   */
  const getLevelProgress = () => {
    if (!profile) return 0;
    
    const currentLevelMin = profile.level.current === 1 ? 0 : 
      [0, 500, 1000, 2500, 5000, 10000][profile.level.current - 1];
    const nextLevelMin = [500, 1000, 2500, 5000, 10000, Infinity][profile.level.current - 1];
    
    if (nextLevelMin === Infinity) return 100;
    
    const pointsInLevel = profile.totalPoints - currentLevelMin;
    const totalPointsNeeded = nextLevelMin - currentLevelMin;
    
    return (pointsInLevel / totalPointsNeeded) * 100;
  };

  /**
   * Render overview tab
   */
  const renderOverview = () => {
    if (!profile) return null;

    return (
      <div className="space-y-6">
        {/* Level Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm opacity-90">Current Level</div>
              <div className="text-3xl font-bold">{profile.level.name}</div>
              <div className="text-sm opacity-75">Level {profile.level.current}</div>
            </div>
            <div className="text-6xl">
              {profile.level.current >= 6 ? <Crown size={64} /> : <Trophy size={64} />}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{profile.totalPoints.toLocaleString()} points</span>
              <span>{profile.level.pointsToNext > 0 ? `${profile.level.pointsToNext} to next level` : 'Max level!'}</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
              <div
                className="bg-white rounded-full h-3 transition-all duration-500"
                style={{ width: `${getLevelProgress()}%` }}
              ></div>
            </div>
          </div>

          {/* Perks */}
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">Your Perks:</div>
            <div className="flex flex-wrap gap-2">
              {profile.level.perks.map((perk, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs"
                >
                  ✨ {perk}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Rank */}
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <Medal className="mx-auto mb-2 text-yellow-600" size={32} />
            <div className="text-2xl font-bold text-gray-800">
              #{profile.rank || '—'}
            </div>
            <div className="text-sm text-gray-600">Global Rank</div>
          </div>

          {/* Streak */}
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <Flame className="mx-auto mb-2 text-orange-600" size={32} />
            <div className="text-2xl font-bold text-gray-800">
              {profile.streaks.current} 🔥
            </div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </div>

          {/* Badges */}
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <Award className="mx-auto mb-2 text-purple-600" size={32} />
            <div className="text-2xl font-bold text-gray-800">
              {profile.badges.length}
            </div>
            <div className="text-sm text-gray-600">Badges Earned</div>
          </div>

          {/* Tours */}
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <Target className="mx-auto mb-2 text-green-600" size={32} />
            <div className="text-2xl font-bold text-gray-800">
              {profile.achievements.toursCompleted}
            </div>
            <div className="text-sm text-gray-600">Tours Completed</div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="mr-2" />
            Your Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-1">🗺️</div>
              <div className="text-lg font-semibold">{profile.achievements.toursCompleted}</div>
              <div className="text-xs text-gray-600">Tours Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">📱</div>
              <div className="text-lg font-semibold">{profile.achievements.socialShares}</div>
              <div className="text-xs text-gray-600">Social Shares</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">✍️</div>
              <div className="text-lg font-semibold">{profile.achievements.reviewsWritten}</div>
              <div className="text-xs text-gray-600">Reviews Written</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">👥</div>
              <div className="text-lg font-semibold">{profile.achievements.referralsMade}</div>
              <div className="text-xs text-gray-600">Friends Referred</div>
            </div>
          </div>
        </div>

        {/* Longest Streak Card */}
        {profile.streaks.longest > 7 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
            <div className="flex items-center">
              <Flame size={32} className="text-orange-600 mr-3" />
              <div>
                <div className="font-semibold text-orange-800">
                  Longest Streak: {profile.streaks.longest} days! 🔥
                </div>
                <div className="text-sm text-orange-700">
                  Keep your current streak alive to break your record!
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render badges tab
   */
  const renderBadges = () => {
    if (!profile) return null;

    const groupedBadges = profile.badges.reduce((acc, badge) => {
      if (!acc[badge.badge_tier]) {
        acc[badge.badge_tier] = [];
      }
      acc[badge.badge_tier].push(badge);
      return acc;
    }, {} as Record<string, Badge[]>);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Award className="mr-2" />
            Your Badge Collection ({profile.badges.length})
          </h3>

          {['platinum', 'gold', 'silver', 'bronze'].map((tier) => {
            const badges = groupedBadges[tier] || [];
            if (badges.length === 0) return null;

            return (
              <div key={tier} className="mb-6">
                <div className="flex items-center mb-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getTierColor(tier)}`}>
                    {tier.toUpperCase()}
                  </div>
                  <div className="ml-2 text-gray-600">({badges.length} badges)</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {badges.map((badge) => (
                    <div
                      key={badge.badge_id}
                      className="bg-gray-50 rounded-lg p-4 text-center hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setNewBadgeUnlocked(badge)}
                    >
                      <div className="text-4xl mb-2">{badge.badge_icon}</div>
                      <div className="text-sm font-semibold text-gray-800 mb-1">
                        {badge.badge_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(badge.earned_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareAchievement(badge);
                        }}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center"
                      >
                        <Share2 size={12} className="mr-1" />
                        Share
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {profile.badges.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Award size={64} className="mx-auto mb-4 opacity-50" />
              <p>No badges earned yet. Complete tours and activities to unlock badges!</p>
            </div>
          )}
        </div>

        {/* Badge unlock modal */}
        {newBadgeUnlocked && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setNewBadgeUnlocked(null)}
          >
            <div
              className="bg-white rounded-lg p-8 max-w-md text-center animate-bounce"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">{newBadgeUnlocked.badge_icon}</div>
              <div className={`inline-block px-4 py-1 rounded-full text-sm font-semibold mb-3 ${getTierColor(newBadgeUnlocked.badge_tier)}`}>
                {newBadgeUnlocked.badge_tier.toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {newBadgeUnlocked.badge_name}
              </h3>
              <p className="text-gray-600 mb-4">
                Earned on {new Date(newBadgeUnlocked.earned_at).toLocaleDateString()}
              </p>
              <button
                onClick={() => shareAchievement(newBadgeUnlocked)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center"
              >
                <Share2 className="mr-2" />
                Share Achievement
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render leaderboard tab
   */
  const renderLeaderboard = () => {
    return (
      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'global', label: 'Global', icon: Users },
            { key: 'monthly', label: 'This Month', icon: TrendingUp },
            { key: 'weekly', label: 'This Week', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setLeaderboardType(tab.key as any)}
                className={`flex-1 py-4 px-6 font-semibold transition-colors flex items-center justify-center ${
                  leaderboardType === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon size={20} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Leaderboard list */}
        <div className="p-6">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy size={64} className="mx-auto mb-4 opacity-50" />
              <p>No entries in this leaderboard yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.userId === userId;
                const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center p-4 rounded-lg transition-colors ${
                      isCurrentUser
                        ? 'bg-blue-50 border-2 border-blue-600'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {medalEmoji ? (
                        <span className="text-3xl">{medalEmoji}</span>
                      ) : (
                        <span className="text-lg font-bold text-gray-600">#{entry.rank}</span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 ml-4">
                      <div className="font-semibold text-gray-800">
                        {isCurrentUser ? 'You' : `Player ${entry.userId.slice(0, 8)}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        Level {entry.level} • {entry.badges.length} badges
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-800">
                        {entry.points.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">points</div>
                    </div>

                    {/* Badges preview */}
                    <div className="ml-4 flex">
                      {entry.badges.slice(0, 3).map((badge, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-lg -ml-2 first:ml-0"
                          title={badge.badge_name}
                        >
                          {badge.badge_icon}
                        </div>
                      ))}
                      {entry.badges.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-xs font-semibold -ml-2">
                          +{entry.badges.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render challenges tab
   */
  const renderChallenges = () => {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Target className="mr-2" />
          Active Challenges
        </h3>
        <div className="text-center py-12 text-gray-500">
          <Target size={64} className="mx-auto mb-4 opacity-50" />
          <p>No active challenges at the moment. Check back soon!</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Trophy className="mr-3 text-yellow-600" />
          Achievements & Rewards
        </h1>
        <p className="text-gray-600 mt-1">
          Track your progress, earn badges, and climb the leaderboard!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <div className="flex space-x-4">
          {[
            { key: 'overview', label: 'Overview', icon: Trophy },
            { key: 'badges', label: 'Badges', icon: Award },
            { key: 'leaderboard', label: 'Leaderboard', icon: Users },
            { key: 'challenges', label: 'Challenges', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`pb-4 px-2 font-semibold transition-colors flex items-center ${
                  selectedTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon size={20} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'badges' && renderBadges()}
      {selectedTab === 'leaderboard' && renderLeaderboard()}
      {selectedTab === 'challenges' && renderChallenges()}
    </div>
  );
};

export default GamificationDashboard;
