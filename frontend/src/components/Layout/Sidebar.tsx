import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  SparklesIcon,
  GlobeAltIcon,
  HeartIcon,
  BanknotesIcon,
  ShoppingCartIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentAnalyticsIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  EyeIcon,
  CogIcon,
  LightBulbIcon,
  BeakerIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  TreePineIcon,
  UsersIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  onClose: () => void;
}

// Navigation structure for all 25 AI Agents
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    current: true,
  },
  {
    name: 'Customer & Revenue Track',
    icon: BanknotesIcon,
    children: [
      {
        name: 'Customer Service Agent',
        href: '/agents/customer-service',
        icon: HeartIcon,
        description: 'AI-powered customer support'
      },
      {
        name: 'Dynamic Pricing Agent',
        href: '/agents/dynamic-pricing',
        icon: ChartBarIcon,
        description: 'Smart pricing optimization'
      },
      {
        name: 'Booking Assistant Agent',
        href: '/agents/booking-assistant',
        icon: ShoppingCartIcon,
        description: 'Intelligent booking management'
      },
      {
        name: 'Personalization Agent',
        href: '/agents/personalization',
        icon: UserGroupIcon,
        description: 'Custom experience creator'
      },
      {
        name: 'Feedback Analysis Agent',
        href: '/agents/feedback-analysis',
        icon: ChatBubbleBottomCenterTextIcon,
        description: 'Review and feedback analyzer'
      },
      {
        name: 'Revenue Optimization Agent',
        href: '/agents/revenue-optimization',
        icon: DocumentAnalyticsIcon,
        description: 'Revenue strategy optimizer'
      },
      {
        name: 'Market Research Agent',
        href: '/agents/market-research',
        icon: MagnifyingGlassIcon,
        description: 'Market intelligence system'
      },
      {
        name: 'Cross-selling Agent',
        href: '/agents/cross-selling',
        icon: SparklesIcon,
        description: 'Upselling and cross-selling AI'
      }
    ]
  },
  {
    name: 'Security & Market Track',
    icon: ShieldCheckIcon,
    children: [
      {
        name: 'Risk Assessment Agent',
        href: '/agents/risk-assessment',
        icon: ExclamationTriangleIcon,
        description: 'Comprehensive risk analysis'
      },
      {
        name: 'Security Monitoring Agent',
        href: '/agents/security-monitoring',
        icon: LockClosedIcon,
        description: 'Security threat detection'
      },
      {
        name: 'Competitive Intelligence Agent',
        href: '/agents/competitive-intelligence',
        icon: EyeIcon,
        description: 'Market competition analyzer'
      },
      {
        name: 'Compliance Agent',
        href: '/agents/compliance',
        icon: ClipboardDocumentCheckIcon,
        description: 'Regulatory compliance monitor'
      },
      {
        name: 'Fraud Detection Agent',
        href: '/agents/fraud-detection',
        icon: ShieldCheckIcon,
        description: 'Advanced fraud prevention'
      },
      {
        name: 'Quality Control Agent',
        href: '/agents/quality-control',
        icon: CogIcon,
        description: 'Service quality assurance'
      },
      {
        name: 'Crisis Management Agent',
        href: '/agents/crisis-management',
        icon: ExclamationTriangleIcon,
        description: 'Emergency response system'
      },
      {
        name: 'Insurance Optimization Agent',
        href: '/agents/insurance-optimization',
        icon: ShieldCheckIcon,
        description: 'Insurance strategy optimizer'
      }
    ]
  },
  {
    name: 'Specialized Intelligence & Ethics',
    icon: CpuChipIcon,
    children: [
      {
        name: 'Predictive Analytics Agent',
        href: '/agents/predictive-analytics',
        icon: LightBulbIcon,
        description: 'Future trend predictor'
      },
      {
        name: 'Innovation Agent',
        href: '/agents/innovation',
        icon: BeakerIcon,
        description: 'Innovation opportunity detector'
      },
      {
        name: 'Training & Development Agent',
        href: '/agents/training-development',
        icon: AcademicCapIcon,
        description: 'Staff development optimizer'
      },
      {
        name: 'Partnership Agent',
        href: '/agents/partnership',
        icon: HandRaisedIcon,
        description: 'Strategic partnership manager'
      },
      {
        name: 'Sustainability Agent',
        href: '/agents/sustainability',
        icon: GlobeAltIcon,
        description: 'Environmental impact optimizer'
      },
      {
        name: 'Accessibility Specialist Agent',
        href: '/agents/accessibility-specialist',
        icon: UsersIcon,
        description: 'Universal accessibility compliance'
      },
      {
        name: 'Carbon Optimizer Agent',
        href: '/agents/carbon-optimizer',
        icon: TreePineIcon,
        description: 'Carbon footprint optimizer'
      },
      {
        name: 'Local Impact Analyzer Agent',
        href: '/agents/local-impact-analyzer',
        icon: UsersIcon,
        description: 'Community impact assessor'
      },
      {
        name: 'Ethical Tourism Advisor Agent',
        href: '/agents/ethical-tourism-advisor',
        icon: HeartIcon,
        description: 'Ethical compliance monitor'
      }
    ]
  }
];

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const navigate = useNavigate();

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Spirit Tours</h2>
            <p className="text-xs text-gray-500">AI Platform v2.0</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-md hover:bg-gray-100"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          if (item.children) {
            const isExpanded = expandedSections.includes(item.name);
            return (
              <div key={item.name} className="space-y-1">
                {/* Parent section */}
                <button
                  onClick={() => toggleSection(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <span>{item.name}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {/* Children */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 space-y-1 border-l-2 border-gray-100 pl-4">
                        {item.children.map((child) => (
                          <button
                            key={child.name}
                            onClick={() => handleNavigation(child.href)}
                            className="w-full flex items-start space-x-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                          >
                            <child.icon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-indigo-500" />
                            <div className="text-left">
                              <div className="font-medium">{child.name}</div>
                              <div className="text-xs text-gray-500 group-hover:text-indigo-600">
                                {child.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // Single navigation item
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="h-5 w-5 text-gray-400" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">System Status</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            25 AI Agents Online
          </p>
          <p className="text-xs text-green-600 font-medium">
            100% Backend Complete
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;